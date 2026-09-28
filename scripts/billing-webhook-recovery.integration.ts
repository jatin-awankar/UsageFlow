import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { Queue } from "bullmq";
import { Client } from "pg";

const db = new Client({ connectionString: process.env.DATABASE_URL });
const queue = new Queue("usageflow", { connection: { url: process.env.REDIS_URL! } });
const workers: ChildProcess[] = [];
const received: Array<{ body: string; id: string }> = [];
let receiverStatus = 200;
const receiver = createServer(async (request, response) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks).toString();
  received.push({ body, id: JSON.parse(body).id });
  response.writeHead(receiverStatus).end("ok");
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
  await waitFor(async () => (await db.query(`SELECT status FROM "WebhookEvent" WHERE id='recover-event'`)).rows[0].status === "DELIVERED", "recovered delivery").catch(async (error) => {
    console.error((await db.query(`SELECT * FROM "BillingWebhookWork"`)).rows);
    console.error((await db.query(`SELECT attempt,status FROM "WebhookDelivery"`)).rows);
    throw error;
  });
  assert.equal(received.length, 2);
  assert.equal(received[0].body, received[1].body, "recovery must retain original event and billing facts");
  const attempts = await db.query(`SELECT attempt,status FROM "WebhookDelivery" WHERE "webhookEventId"='recover-event' ORDER BY attempt`);
  assert.deepEqual(attempts.rows, [{ attempt: 1, status: "FAILED" }, { attempt: 2, status: "SUCCESS" }]);
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM "BillingRecordVersion" WHERE id='recover-version'`)).rows[0].n, 1);
  // An uncertain fifth send remains retryable with the same event identity.
  await db.query(`UPDATE "BillingWebhookWork" SET "attemptCount"=5,"completedAt"=NULL,terminal=false,
    "claimToken"='lost-fifth',"leaseUntil"=now()-interval '1 second' WHERE "webhookEventId"='recover-event'`);
  await db.query(`INSERT INTO "WebhookDelivery" (id,"webhookEventId","endpointId",attempt,status)
    VALUES ('uncertain-fifth','recover-event','recover-endpoint',5,'PENDING')`);
  await db.query(`UPDATE "WebhookEvent" SET status='PENDING' WHERE id='recover-event'`);
  await waitFor(async () => (await db.query(`SELECT status FROM "WebhookEvent" WHERE id='recover-event'`)).rows[0].status === "DELIVERED"
    && received.length === 3, "fifth uncertain retry");
  assert.equal(received[2].body, received[0].body);
  assert.equal((await db.query(`SELECT status FROM "WebhookDelivery" WHERE id='uncertain-fifth'`)).rows[0].status, "FAILED");
  // Definite HTTP failures use the five-response budget and then stop.
  receiverStatus = 500;
  await db.query(`UPDATE "BillingWebhookWork" SET "completedAt"=NULL,terminal=false,"failedAttempts"=0,
    "dueAt"=now() WHERE "webhookEventId"='recover-event'`);
  await db.query(`UPDATE "WebhookEvent" SET status='PENDING' WHERE id='recover-event'`);
  for (let failures = 1; failures <= 5; failures++) {
    await waitFor(async () => (await db.query(`SELECT "failedAttempts" FROM "BillingWebhookWork" WHERE "webhookEventId"='recover-event'`)).rows[0].failedAttempts === failures,
      `failure ${failures}`);
    if (failures < 5) await db.query(`UPDATE "BillingWebhookWork" SET "dueAt"=now()-interval '1 second' WHERE "webhookEventId"='recover-event'`);
  }
  assert.equal((await db.query(`SELECT status FROM "WebhookEvent" WHERE id='recover-event'`)).rows[0].status, "FAILED");
  assert.equal(received.length, 8);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  assert.equal(received.length, 8, "terminal failure must not send again");
  await kill(restarted);
  console.log("Billing webhook recovery acceptance passed");
} finally {
  for (const child of workers) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  receiver.closeAllConnections();
  await new Promise<void>((resolve) => receiver.close(() => resolve()));
  await queue.close();
  await db.end();
}
