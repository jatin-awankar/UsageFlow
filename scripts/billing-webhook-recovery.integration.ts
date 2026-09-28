import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import { verifyBillingRequest } from "../webhook-receiver/billing-verifier.js";
import { spawn, type ChildProcess } from "node:child_process";
import { Queue } from "bullmq";
import { Client } from "pg";
import prisma from "../lib/prisma";
import { refreshBillingStatus } from "../lib/webhooks/billing-status";
import { replayBillingWebhookForActor } from "../lib/webhooks/replay-billing";

const db = new Client({ connectionString: process.env.DATABASE_URL });
const lockDb = new Client({ connectionString: process.env.DATABASE_URL });
const queue = new Queue("usageflow", { connection: { url: process.env.REDIS_URL! } });
const workers: ChildProcess[] = [];
const received: Array<{ body: Buffer; id: string; timestamp: string; signature: string }> = [];
let receiverStatus = 200;
let receiverMode: "respond" | "timeout" | "close" = "respond";
const receiver = createServer(async (request, response) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks);
  const timestamp = request.headers["x-usageflow-timestamp"];
  const signature = request.headers["x-usageflow-signature"];
  const event = verifyBillingRequest(body, timestamp, signature, "synthetic-secret");
  if (!event) { response.writeHead(401).end("invalid"); return; }
  received.push({ body, id: event.id, timestamp: String(timestamp), signature: String(signature) });
  if (receiverMode === "close") { response.destroy(); return; }
  if (receiverMode === "timeout") { setTimeout(() => response.end(), 6_000); return; }
  response.writeHead(request.url === "/second" ? 200 : receiverStatus).end("ok");
});

async function waitFor(check: () => Promise<boolean> | boolean, label: string, timeout = 15_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
}
function startWorker(extraEnv: Record<string, string> = {}) {
  const child = spawn(process.execPath, ["--import", "tsx", "worker/index.ts"],
    { env: { ...process.env, NODE_ENV: "test", ...extraEnv }, stdio: ["ignore", "pipe", "pipe"] });
  child.stderr?.on("data", (chunk) => process.stderr.write(chunk));
  child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  workers.push(child);
  return child;
}
async function kill(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  child.kill("SIGKILL");
  await exited;
}
async function seed(url: string) {
  await db.query(`INSERT INTO "Organization" (id,name) VALUES ('recover-org','Recover')`);
  await db.query(`INSERT INTO "User" (id,email) VALUES ('recover-user','recover@example.test')`);
  await db.query(`INSERT INTO "Customer" (id,"orgId","externalId") VALUES ('recover-customer','recover-org','customer-1')`);
  await db.query("BEGIN");
  await db.query(`INSERT INTO "BillingRecord" (id,"orgId","billedCustomerId","periodStart","periodEnd","closeAt")
    VALUES ('recover-record','recover-org','recover-customer','2026-08-01','2026-09-01','2026-09-04')`);
  await db.query(`INSERT INTO "BillingRecordSnapshot" (id,"billingRecordId","calculatedAt",state,"sourceEvents")
    VALUES ('recover-snapshot','recover-record',now(),'OPEN','[]')`);
  await db.query(`UPDATE "BillingRecord" SET "currentSnapshotId"='recover-snapshot' WHERE id='recover-record'`);
  await db.query("COMMIT");
  await db.query(`INSERT INTO "BillingRecordVersion" (id,"billingRecordId","snapshotId",version,"approvedById","finalizedAt",
    "periodStart","periodEnd","closeAt","sourceEvents","ratedSources","eventOutcomes",lines,reconciliation,
    "lateArrivals",comparison,currency,amount) VALUES ('recover-version','recover-record','recover-snapshot',1,
    'recover-user',now(),'2026-08-01','2026-09-01','2026-09-04','[]','[]','[]','[]','{}','[]','{}','USD',0)`);
  await db.query(`INSERT INTO "WebhookEndpoint" (id,url,secret,active,"orgId",events)
    VALUES ('recover-endpoint',$1,'synthetic-secret',true,'recover-org',ARRAY['invoice.finalized'])`, [url]);
  await db.query(`INSERT INTO "WebhookEvent" (id,type,payload,status,"orgId","billingRecordVersionId")
    VALUES ('recover-event','invoice.finalized','{"amount":"0","version":1}','PENDING','recover-org','recover-version')`);
}

try {
  await db.connect();
  await new Promise<void>((resolve) => receiver.listen(0, "127.0.0.1", resolve));
  const address = receiver.address();
  assert(address && typeof address !== "string");
  await seed(`http://127.0.0.1:${address.port}/receive`);
  await queue.obliterate({ force: true });
  const beforeSelection = startWorker({ BILLING_TEST_EXIT_BEFORE_SELECTION: "true" });
  await waitFor(() => beforeSelection.exitCode !== null || beforeSelection.signalCode !== null, "pre-selection crash");
  assert.equal((await db.query(`SELECT "targetSelectionRecordedAt" FROM "WebhookEvent" WHERE id='recover-event'`)).rows[0].targetSelectionRecordedAt, null);
  const first = startWorker({ BILLING_TEST_EXIT_AFTER_HTTP_ACCEPTANCE: "true" });
  const second = startWorker({ BILLING_TEST_EXIT_AFTER_HTTP_ACCEPTANCE: "true" });
  await waitFor(() => received.length === 1, "first receiver acceptance");
  await waitFor(() => first.exitCode !== null || second.exitCode !== null, "post-acceptance crash");
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert.equal(received.length, 1, "concurrent workers made one claim");
  const selected = await db.query(`SELECT "targetEndpointIds", "targetSelectionRecordedAt" FROM "WebhookEvent" WHERE id='recover-event'`);
  assert.deepEqual(selected.rows[0].targetEndpointIds, ["recover-endpoint"]);
  assert(selected.rows[0].targetSelectionRecordedAt);
  await kill(first);
  await kill(second);
  await db.query(`UPDATE "BillingWebhookWork" SET "leaseUntil"=now()-interval '1 second' WHERE "webhookEventId"='recover-event'`);
  await queue.obliterate({ force: true });
  const restarted = startWorker();
  await waitFor(async () => (await db.query(`SELECT "failedAttempts" FROM "BillingWebhookWork" WHERE "webhookEventId"='recover-event'`)).rows[0].failedAttempts === 1,
    "uncertain attempt reconciliation");
  const firstDue = (await db.query(`SELECT "dueAt" FROM "BillingWebhookWork" WHERE "webhookEventId"='recover-event'`)).rows[0].dueAt as Date;
  assert(firstDue.getTime() > Date.now(), "uncertain attempt uses durable retry due time");
  await db.query(`UPDATE "BillingWebhookWork" SET "dueAt"=now()-interval '1 second' WHERE "webhookEventId"='recover-event'`);
  await waitFor(async () => (await db.query(`SELECT status FROM "WebhookEvent" WHERE id='recover-event'`)).rows[0].status === "DELIVERED", "recovered delivery").catch(async (error) => {
    console.error((await db.query(`SELECT * FROM "BillingWebhookWork"`)).rows);
    console.error((await db.query(`SELECT attempt,status FROM "WebhookDelivery"`)).rows);
    throw error;
  });
  assert.equal(received.length, 2);
  assert.deepEqual(received[0].body, received[1].body, "recovery must retain original event and billing facts");
  const firstRequest = received[0];
  const eventRow = (await db.query(`SELECT id,type,to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",payload,"orgId","billingRecordVersionId" FROM "WebhookEvent" WHERE id='recover-event'`)).rows[0];
  const expectedBody = Buffer.from(JSON.stringify({ id: eventRow.id, type: eventRow.type,
    createdAt: eventRow.createdAt, organizationId: eventRow.orgId,
    billingRecordVersionId: eventRow.billingRecordVersionId, payload: eventRow.payload }));
  assert.deepEqual(firstRequest.body, expectedBody, "request bytes must encode stored event facts");
  const signed = (timestamp: string, body = firstRequest.body) => `v1=${createHmac("sha256", "synthetic-secret").update(timestamp).update(".").update(body).digest("hex")}`;
  assert.equal(firstRequest.signature, signed(firstRequest.timestamp));
  const loopback = async (body: Buffer, timestamp: string, signature: string) =>
    fetch(`http://127.0.0.1:${address.port}/receive`, { method: "POST", body: Uint8Array.from(body),
      headers: { "Content-Type": "application/json", "X-UsageFlow-Timestamp": timestamp,
        "X-UsageFlow-Signature": signature } }).then((result) => result.status);
  assert.equal(await loopback(firstRequest.body, firstRequest.timestamp, firstRequest.signature), 200);
  received.pop();
  assert.equal(await loopback(Buffer.concat([firstRequest.body, Buffer.from(" ")]), firstRequest.timestamp, firstRequest.signature), 401);
  assert.equal(await loopback(firstRequest.body, String(Number(firstRequest.timestamp) - 1), firstRequest.signature), 401);
  assert.equal(await loopback(firstRequest.body, firstRequest.timestamp, `v1=${"0".repeat(64)}`), 401);
  const now = Number(firstRequest.timestamp);
  assert.equal(verifyBillingRequest(firstRequest.body, firstRequest.timestamp, firstRequest.signature, "synthetic-secret", now)?.id, "recover-event");
  assert.equal(verifyBillingRequest(Buffer.concat([firstRequest.body, Buffer.from(" ")]), firstRequest.timestamp, firstRequest.signature, "synthetic-secret", now), null);
  assert.equal(verifyBillingRequest(firstRequest.body, String(now - 1), firstRequest.signature, "synthetic-secret", now), null);
  assert.equal(verifyBillingRequest(firstRequest.body, firstRequest.timestamp, `v1=${"0".repeat(64)}`, "synthetic-secret", now), null);
  assert.equal(verifyBillingRequest(firstRequest.body, String(now - 300), signed(String(now - 300)), "synthetic-secret", now)?.id, "recover-event");
  assert.equal(verifyBillingRequest(firstRequest.body, String(now - 301), signed(String(now - 301)), "synthetic-secret", now), null);
  assert.equal(verifyBillingRequest(firstRequest.body, String(now + 1), signed(String(now + 1)), "synthetic-secret", now), null);
  const attempts = await db.query(`SELECT attempt,status FROM "WebhookDelivery" WHERE "webhookEventId"='recover-event' ORDER BY attempt`);
  assert.deepEqual(attempts.rows, [{ attempt: 1, status: "FAILED" }, { attempt: 2, status: "SUCCESS" }]);
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM "BillingRecordVersion" WHERE id='recover-version'`)).rows[0].n, 1);
  // An uncertain fifth send consumes the final slot, even when no response was stored.
  await db.query(`UPDATE "BillingWebhookWork" SET "attemptCount"=5,"completedAt"=NULL,terminal=false,
    "claimToken"='lost-fifth',"leaseUntil"=now()-interval '1 second' WHERE "webhookEventId"='recover-event'`);
  await db.query(`INSERT INTO "WebhookDelivery" (id,"webhookEventId","endpointId",attempt,status)
    VALUES ('uncertain-fifth','recover-event','recover-endpoint',5,'PENDING')`);
  await db.query(`UPDATE "WebhookEvent" SET status='PENDING' WHERE id='recover-event'`);
  await waitFor(async () => (await db.query(`SELECT status FROM "WebhookEvent" WHERE id='recover-event'`)).rows[0].status === "FAILED",
    "fifth uncertain terminal outcome");
  assert.equal(received.length, 2, "uncertain fifth attempt must not send again");
  assert.equal((await db.query(`SELECT status FROM "WebhookDelivery" WHERE id='uncertain-fifth'`)).rows[0].status, "FAILED");
  // Definite HTTP failures use the five-response budget and then stop.
  receiverStatus = 500;
  await db.query(`DELETE FROM "WebhookDelivery" WHERE "webhookEventId"='recover-event'`);
  await db.query(`UPDATE "BillingWebhookWork" SET "completedAt"=NULL,terminal=false,"failedAttempts"=0,
    "attemptCount"=0,"dueAt"=now() WHERE "webhookEventId"='recover-event'`);
  await db.query(`UPDATE "WebhookEvent" SET status='PENDING' WHERE id='recover-event'`);
  for (let failures = 1; failures <= 5; failures++) {
    await waitFor(async () => (await db.query(`SELECT "failedAttempts" FROM "BillingWebhookWork" WHERE "webhookEventId"='recover-event'`)).rows[0].failedAttempts === failures,
      `failure ${failures}`);
    const attempt = (await db.query(`SELECT status,"responseCode","responseBody","durationMs","startedAt" FROM "WebhookDelivery"
      WHERE "webhookEventId"='recover-event' AND attempt=$1`, [failures])).rows[0];
    assert.equal(attempt.status, "FAILED");
    assert.equal(attempt.responseCode, 500);
    assert.equal(attempt.responseBody, "HTTP 500");
    assert(attempt.durationMs >= 0 && attempt.startedAt);
    if (failures < 5) {
      const due = (await db.query(`SELECT "dueAt" FROM "BillingWebhookWork" WHERE "webhookEventId"='recover-event'`)).rows[0].dueAt as Date;
      const delay = [1, 2, 4, 8][failures - 1] * 60_000;
      assert(Math.abs(due.getTime() - Date.now() - delay) < 10_000, `retry ${failures} due offset`);
    }
    if (failures < 5) await db.query(`UPDATE "BillingWebhookWork" SET "dueAt"=now()-interval '1 second' WHERE "webhookEventId"='recover-event'`);
  }
  assert.equal((await db.query(`SELECT status FROM "WebhookEvent" WHERE id='recover-event'`)).rows[0].status, "FAILED");
  assert.equal(received.length, 7);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  assert.equal(received.length, 7, "terminal failure must not send again");
  for (const scenario of [{ mode: "respond" as const, code: 400, outcome: "HTTP 400" },
    { mode: "timeout" as const, code: null, outcome: "Request timed out" },
    { mode: "close" as const, code: null, outcome: "Connection failed" }]) {
    await db.query(`DELETE FROM "WebhookDelivery" WHERE "webhookEventId"='recover-event'`);
    await db.query(`UPDATE "BillingWebhookWork" SET "completedAt"=NULL,terminal=false,"failedAttempts"=0,
      "attemptCount"=0,"dueAt"=now() WHERE "webhookEventId"='recover-event'`);
    await db.query(`UPDATE "WebhookEvent" SET status='PENDING' WHERE id='recover-event'`);
    receiverMode = scenario.mode;
    receiverStatus = scenario.code ?? 200;
    await waitFor(async () => (await db.query(`SELECT "failedAttempts" FROM "BillingWebhookWork" WHERE "webhookEventId"='recover-event'`)).rows[0].failedAttempts === 1,
      `${scenario.mode} failure`, 20_000);
    const row = (await db.query(`SELECT status,"responseCode","responseBody","durationMs" FROM "WebhookDelivery"
      WHERE "webhookEventId"='recover-event' AND attempt=1`)).rows[0];
    assert.equal(row.status, "FAILED");
    assert.equal(row.responseCode, scenario.code);
    assert.equal(row.responseBody, scenario.outcome);
    if (scenario.mode === "timeout") assert(row.durationMs >= 4_900 && row.durationMs < 6_000);
  }
  // The claim can wait on endpoint deactivation. Attempt start is HTTP start,
  // not the earlier durable claim time.
  await lockDb.connect();
  await lockDb.query("BEGIN");
  await lockDb.query(`SELECT id FROM "WebhookEndpoint" WHERE id='recover-endpoint' FOR NO KEY UPDATE`);
  await db.query(`DELETE FROM "WebhookDelivery" WHERE "webhookEventId"='recover-event'`);
  await db.query(`UPDATE "BillingWebhookWork" SET "completedAt"=NULL,terminal=false,"failedAttempts"=0,
    "attemptCount"=0,"dueAt"=now() WHERE "webhookEventId"='recover-event'`);
  await db.query(`UPDATE "WebhookEvent" SET status='PENDING' WHERE id='recover-event'`);
  receiverMode = "respond";
  receiverStatus = 200;
  const beforeLockedSend = received.length;
  await waitFor(async () => (await db.query(`SELECT "attemptCount" FROM "BillingWebhookWork" WHERE "webhookEventId"='recover-event'`)).rows[0].attemptCount === 1,
    "claimed send waiting on endpoint lock");
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.equal(received.length, beforeLockedSend, "endpoint lock prevents the network send");
  const unlockedAt = Date.now();
  await lockDb.query("COMMIT");
  await waitFor(async () => (await db.query(`SELECT status FROM "WebhookEvent" WHERE id='recover-event'`)).rows[0].status === "DELIVERED",
    "send after endpoint lock");
  const startedAt = (await db.query(`SELECT "startedAt" FROM "WebhookDelivery" WHERE "webhookEventId"='recover-event' AND attempt=1`)).rows[0].startedAt as Date;
  assert(startedAt.getTime() >= unlockedAt - 100, "attempt start follows endpoint lock release");
  await db.query(`INSERT INTO "WebhookEndpoint" (id,url,secret,active,"orgId",events)
    VALUES ('recover-second','http://127.0.0.1/unused','synthetic-secret',true,'recover-org',ARRAY['invoice.finalized'])`);
  await db.query(`INSERT INTO "WebhookEvent" (id,type,payload,status,"orgId","targetEndpointIds","targetSelectionRecordedAt")
    VALUES ('status-only','invoice.finalized','{}','PENDING','recover-org',ARRAY['recover-endpoint','recover-second'],now())`);
  await db.query(`INSERT INTO "BillingWebhookWork" ("webhookEventId","endpointId","attemptCount","completedAt",terminal)
    VALUES ('status-only','recover-endpoint',1,now(),false),('status-only','recover-second',5,NULL,true)`);
  const refresh = () => prisma.$transaction((tx) => refreshBillingStatus(tx, "status-only"));
  const eventStatus = async () => (await db.query(`SELECT status FROM "WebhookEvent" WHERE id='status-only'`)).rows[0].status;
  await refresh();
  assert.equal(await eventStatus(), "MIXED");
  await db.query(`UPDATE "BillingWebhookWork" SET terminal=false,"attemptCount"=1 WHERE "endpointId"='recover-second'`);
  await refresh();
  assert.equal(await eventStatus(), "PENDING");
  await db.query(`UPDATE "BillingWebhookWork" SET "completedAt"=now() WHERE "endpointId"='recover-second'`);
  await refresh();
  assert.equal(await eventStatus(), "DELIVERED");
  await db.query(`DELETE FROM "BillingWebhookWork" WHERE "webhookEventId"='status-only'`);
  await refresh();
  assert.equal(await eventStatus(), "PENDING", "selected targets with missing work remain pending for recovery");
  await db.query(`UPDATE "WebhookEvent" SET "targetEndpointIds"=ARRAY[]::text[] WHERE id='status-only'`);
  await refresh();
  assert.equal(await eventStatus(), "NO_TARGET", "an empty selected target set has no target");
  // Owner replay targets only the failed endpoint and leaves a successful
  // selected endpoint and the underlying BillingRecord unchanged.
  await db.query(`INSERT INTO "Membership" (id,"userId","orgId",role) VALUES ('replay-owner','recover-user','recover-org','OWNER')`);
  await db.query("BEGIN");
  await db.query(`INSERT INTO "BillingRecord" (id,"orgId","billedCustomerId","periodStart","periodEnd","closeAt")
    VALUES ('replay-record','recover-org','recover-customer','2026-07-01','2026-08-01','2026-08-04')`);
  await db.query(`INSERT INTO "BillingRecordSnapshot" (id,"billingRecordId","calculatedAt",state,"sourceEvents")
    VALUES ('replay-snapshot','replay-record',now(),'OPEN','[]')`);
  await db.query(`UPDATE "BillingRecord" SET "currentSnapshotId"='replay-snapshot' WHERE id='replay-record'`);
  await db.query("COMMIT");
  await db.query(`INSERT INTO "BillingRecordVersion" (id,"billingRecordId","snapshotId",version,"approvedById","finalizedAt",
    "periodStart","periodEnd","closeAt","sourceEvents","ratedSources","eventOutcomes",lines,reconciliation,
    "lateArrivals",comparison,currency,amount) VALUES ('replay-version','replay-record','replay-snapshot',1,
    'recover-user',now(),'2026-07-01','2026-08-01','2026-08-04','[]','[]','[]','[]','{}','[]','{}','USD',0)`);
  await db.query(`UPDATE "WebhookEndpoint" SET url=$1 WHERE id='recover-second'`, [`http://127.0.0.1:${address.port}/second`]);
  receiverStatus = 500;
  await db.query(`INSERT INTO "WebhookEvent" (id,type,payload,status,"orgId","billingRecordVersionId",
    "targetEndpointIds","targetSelectionRecordedAt") VALUES ('replay-event','invoice.finalized',
    '{"amount":"0","version":1}','PENDING','recover-org','replay-version',ARRAY['recover-endpoint','recover-second'],now())`);
  await db.query(`INSERT INTO "BillingWebhookWork" ("webhookEventId","endpointId")
    VALUES ('replay-event','recover-endpoint'),('replay-event','recover-second')`);
  for (let failures = 1; failures <= 5; failures++) {
    await waitFor(async () => (await db.query(`SELECT "failedAttempts" FROM "BillingWebhookWork"
      WHERE "webhookEventId"='replay-event' AND "endpointId"='recover-endpoint'`)).rows[0].failedAttempts === failures,
      `replay fixture failure ${failures}`);
    if (failures < 5) await db.query(`UPDATE "BillingWebhookWork" SET "dueAt"=now()-interval '1 second'
      WHERE "webhookEventId"='replay-event' AND "endpointId"='recover-endpoint'`);
  }
  await waitFor(async () => (await db.query(`SELECT status FROM "WebhookEvent" WHERE id='replay-event'`)).rows[0].status === "MIXED",
    "failed and successful replay targets");
  receiverStatus = 200;
  const replayInput = { orgId: "recover-org", eventId: "replay-event", endpointId: "recover-endpoint",
    idempotencyKey: "repair-1", reason: "Receiver repaired" };
  const beforeReplay = received.length;
  await assert.rejects(replayBillingWebhookForActor({ ...replayInput, endpointId: "recover-second" }, "recover-user"), /INVALID_REPLAY_STATE/);
  await assert.rejects(replayBillingWebhookForActor({ ...replayInput, endpointId: "forged-endpoint" }, "recover-user"), /INVALID_REPLAY_TARGET/);
  await assert.rejects(replayBillingWebhookForActor({ ...replayInput, eventId: "forged-event" }, "recover-user"), /INVALID_REPLAY_TARGET/);
  await db.query(`INSERT INTO "Organization" (id,name) VALUES ('foreign-org','Other Organization')`);
  await db.query(`INSERT INTO "Customer" (id,"orgId","externalId") VALUES ('foreign-customer','foreign-org','foreign-1')`);
  await db.query("BEGIN");
  await db.query(`INSERT INTO "BillingRecord" (id,"orgId","billedCustomerId","periodStart","periodEnd","closeAt")
    VALUES ('foreign-record','foreign-org','foreign-customer','2026-07-01','2026-08-01','2026-08-04')`);
  await db.query(`INSERT INTO "BillingRecordSnapshot" (id,"billingRecordId","calculatedAt",state,"sourceEvents")
    VALUES ('foreign-snapshot','foreign-record',now(),'OPEN','[]')`);
  await db.query(`UPDATE "BillingRecord" SET "currentSnapshotId"='foreign-snapshot' WHERE id='foreign-record'`);
  await db.query("COMMIT");
  await db.query(`INSERT INTO "BillingRecordVersion" (id,"billingRecordId","snapshotId",version,"approvedById","finalizedAt",
    "periodStart","periodEnd","closeAt","sourceEvents","ratedSources","eventOutcomes",lines,reconciliation,
    "lateArrivals",comparison,currency,amount) VALUES ('foreign-version','foreign-record','foreign-snapshot',1,
    'recover-user',now(),'2026-07-01','2026-08-01','2026-08-04','[]','[]','[]','[]','{}','[]','{}','USD',0)`);
  await db.query(`INSERT INTO "WebhookEndpoint" (id,url,secret,active,"orgId",events)
    VALUES ('foreign-endpoint',$1,'foreign-secret',true,'foreign-org',ARRAY['invoice.finalized'])`, [`http://127.0.0.1:${address.port}/foreign`]);
  await db.query(`INSERT INTO "WebhookEvent" (id,type,payload,status,"orgId","billingRecordVersionId",
    "targetEndpointIds","targetSelectionRecordedAt") VALUES ('foreign-event','invoice.finalized',
    '{"amount":"0","version":1}','FAILED','foreign-org','foreign-version',ARRAY['foreign-endpoint'],now())`);
  await db.query(`INSERT INTO "BillingWebhookWork" ("webhookEventId","endpointId","attemptCount","failedAttempts",terminal)
    VALUES ('foreign-event','foreign-endpoint',5,5,true)`);
  await assert.rejects(replayBillingWebhookForActor({ ...replayInput, eventId: "foreign-event",
    endpointId: "foreign-endpoint", idempotencyKey: "foreign-probe" }, "recover-user"), /INVALID_REPLAY_TARGET/);
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM "BillingWebhookReplay" WHERE "webhookEventId"='foreign-event'`)).rows[0].n, 0);
  await kill(restarted);
  await queue.obliterate({ force: true });
  const replay = await replayBillingWebhookForActor(replayInput, "recover-user");
  assert.equal(replay.cycle, 2);
  assert.deepEqual(await replayBillingWebhookForActor(replayInput, "recover-user"), replay);
  assert.equal((await db.query(`SELECT status FROM "WebhookEvent" WHERE id='replay-event'`)).rows[0].status, "PENDING");
  const replayWorker = startWorker();
  await waitFor(async () => (await db.query(`SELECT status FROM "WebhookEvent" WHERE id='replay-event'`)).rows[0].status === "DELIVERED", "replayed delivery");
  assert.equal(received.length, beforeReplay + 1);
  assert.equal(received.at(-1)?.id, "replay-event");
  assert.equal(JSON.parse(received.at(-1)!.body.toString()).payload.version, 1);
  assert.equal((await db.query(`SELECT "attemptCount",cycle,"completedAt" FROM "BillingWebhookWork"
    WHERE "webhookEventId"='replay-event' AND "endpointId"='recover-second'`)).rows[0].cycle, 1);
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM "WebhookDelivery"
    WHERE "webhookEventId"='replay-event' AND "endpointId"='recover-second' AND status='SUCCESS'`)).rows[0].n, 1);
  const history = (await db.query(`SELECT cycle,attempt FROM "WebhookDelivery" WHERE "webhookEventId"='replay-event'
    AND "endpointId"='recover-endpoint' ORDER BY cycle,attempt`)).rows;
  assert(history.some((row) => row.cycle === 1));
  assert(history.some((row) => row.cycle === 2 && row.attempt === 1));
  const audit = (await db.query(`SELECT "actorId",reason,"webhookEventId","endpointId","replayedAt"
    FROM "BillingWebhookReplay" WHERE "idempotencyKey"='repair-1'`)).rows[0];
  assert.equal(audit.actorId, "recover-user");
  assert.equal(audit.reason, "Receiver repaired");
  assert.equal(audit.webhookEventId, "replay-event");
  assert.equal(audit.endpointId, "recover-endpoint");
  assert(audit.replayedAt);
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM "BillingRecordVersion" WHERE "billingRecordId"='replay-record'`)).rows[0].n, 1);
  assert.equal((await db.query(`SELECT "currentSnapshotId" FROM "BillingRecord" WHERE id='replay-record'`)).rows[0].currentSnapshotId, "replay-snapshot");
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM "BillingRecordVersion" WHERE id='recover-version'`)).rows[0].n, 1);
  await assert.rejects(replayBillingWebhookForActor({ ...replayInput, idempotencyKey: "repair-2" }, "recover-user"), /INVALID_REPLAY_STATE/);
  await db.query(`DELETE FROM "Membership" WHERE id='replay-owner'`);
  await assert.rejects(replayBillingWebhookForActor(replayInput, "recover-user"), /OWNER_REQUIRED/);
  await kill(replayWorker);
  console.log("Billing webhook recovery acceptance passed");
} finally {
  for (const child of workers) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  receiver.closeAllConnections();
  await new Promise<void>((resolve) => receiver.close(() => resolve()));
  await queue.close();
  await prisma.$disconnect();
  await lockDb.end();
  await db.end();
}
