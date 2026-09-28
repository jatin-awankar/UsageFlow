import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import { Client } from "pg";
import prisma from "../lib/prisma";
import { createEndpointForOwner } from "../lib/webhooks/create-endpoint";
import { rotateEndpointSecretForOwner } from "../lib/webhooks/rotate-secret";
import { sendBillingWebhook } from "../worker/processors/sendBillingWebhook";
import { deliverBillingWebhook } from "../worker/processors/deliverBillingWebhook";
import { listBillingWebhookEvents, listWebhookDeliveryLogs, listWebhookEndpoints } from "../lib/webhooks/views";
import { verifyRotatingBillingRequest } from "../webhook-receiver/billing-verifier.js";

const db = new Client({ connectionString: process.env.DATABASE_URL });
const body = Buffer.from(JSON.stringify({ id: "rotation-event", type: "invoice.finalized", createdAt: "2026-09-28T00:00:00Z",
  organizationId: "rotation-org", billingRecordVersionId: "rotation-version", payload: {} }));
let receiverCurrent = "";
let receiverPrevious: string | null = null;
let receiverExpiry: string | null = null;
let receiverNow = new Date();
const observed: Array<{ timestamp: string; signature: string; body: Buffer }> = [];
const receiver = createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const received = { body: Buffer.concat(chunks), timestamp: String(req.headers["x-usageflow-timestamp"]),
    signature: String(req.headers["x-usageflow-signature"]) };
  observed.push(received);
  const verified = verifyRotatingBillingRequest(received.body, received.timestamp, received.signature,
    receiverCurrent, receiverPrevious, receiverExpiry, receiverNow);
  res.writeHead(verified ? 200 : 401).end(verified ? "ok" : "invalid");
});
const at = new Date("2026-09-28T12:00:00.000Z");
try {
  await db.connect();
  await new Promise<void>(resolve => receiver.listen(0, "127.0.0.1", resolve));
  const address = receiver.address();
  assert(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/billing`;
  await db.query(`INSERT INTO "Organization" (id,name) VALUES ('rotation-org','Rotation'),('other-org','Other')`);
  await db.query(`INSERT INTO "User" (id,email) VALUES ('rotation-owner','owner@rotation.test')`);
  await db.query(`INSERT INTO "Membership" (id,"userId","orgId",role) VALUES ('rotation-member','rotation-owner','rotation-org','OWNER')`);
  const created = await createEndpointForOwner("rotation-org", "rotation-owner", url, ["invoice.finalized"]);
  assert.equal(Object.keys(created).sort().join(","), "id,secret");
  await db.query(`INSERT INTO "WebhookEndpoint" (id,url,secret,active,"orgId",events) VALUES
    ('foreign-endpoint',$1,'foreign-secret',true,'other-org',ARRAY['invoice.finalized'])`, [url]);
  await assert.rejects(rotateEndpointSecretForOwner("rotation-org", "foreign-endpoint", "rotation-owner", at), /ENDPOINT_NOT_FOUND/);
  const endpoints = await listWebhookEndpoints("rotation-org");
  assert.equal(endpoints.length, 1);
  assert.deepEqual(Object.keys(endpoints[0]).sort(), ["active", "createdAt", "events", "id", "url"]);
  assert(!JSON.stringify(endpoints).includes(created.secret));
  const first = await rotateEndpointSecretForOwner("rotation-org", created.id, "rotation-owner", at);
  const state = (await db.query(`SELECT secret,"previousSecret","previousSecretExpiresAt" FROM "WebhookEndpoint" WHERE id=$1`, [created.id])).rows[0];
  assert.equal(state.secret, first.secret);
  assert.equal(state.previousSecret, created.secret);
  assert.equal(state.previousSecretExpiresAt.toISOString(), first.previousSecretExpiresAt);
  receiverCurrent = first.secret;
  receiverPrevious = created.secret;
  receiverExpiry = first.previousSecretExpiresAt;
  receiverNow = at;
  const nowSeconds = Math.floor(at.getTime() / 1000);
  await sendBillingWebhook(url, state.secret, body, nowSeconds);
  assert.equal(observed.length, 1);
  const sent = observed[0];
  assert(verifyRotatingBillingRequest(sent.body, sent.timestamp, sent.signature, first.secret,
    created.secret, first.previousSecretExpiresAt, at));
  assert.equal(verifyRotatingBillingRequest(sent.body, sent.timestamp, sent.signature, created.secret,
    null, null, at), null, "new attempts use current secret");
  const oldSignature = `v1=${createHmac("sha256", created.secret).update(sent.timestamp).update(".").update(body).digest("hex")}`;
  assert(verifyRotatingBillingRequest(body, sent.timestamp, oldSignature, first.secret, created.secret,
    first.previousSecretExpiresAt, at));
  // Generate a fresh timestamp for the request freshness window at the expiry boundary.
  const before = new Date(new Date(first.previousSecretExpiresAt).getTime() - 1);
  const beforeTimestamp = String(Math.floor(before.getTime() / 1000));
  const beforeSig = `v1=${createHmac("sha256", created.secret).update(beforeTimestamp).update(".").update(body).digest("hex")}`;
  assert(verifyRotatingBillingRequest(body, beforeTimestamp, beforeSig, first.secret, created.secret,
    first.previousSecretExpiresAt, before));
  assert.equal(verifyRotatingBillingRequest(body, beforeTimestamp, beforeSig, first.secret, created.secret,
    first.previousSecretExpiresAt, new Date(first.previousSecretExpiresAt)), null);
  assert.equal(verifyRotatingBillingRequest(body, beforeTimestamp, beforeSig, first.secret, created.secret,
    first.previousSecretExpiresAt, new Date(new Date(first.previousSecretExpiresAt).getTime() + 1)), null);
  receiverNow = before;
  assert.equal((await sendBillingWebhook(url, created.secret, body, Number(beforeTimestamp))).status, 200);
  receiverNow = new Date(first.previousSecretExpiresAt);
  await assert.rejects(sendBillingWebhook(url, created.secret, body, Number(beforeTimestamp)),
    (error: unknown) => typeof error === "object" && error !== null && "response" in error &&
      (error as { response?: { status: number } }).response?.status === 401);
  const second = await rotateEndpointSecretForOwner("rotation-org", created.id, "rotation-owner", at);
  const next = (await db.query(`SELECT "previousSecret" FROM "WebhookEndpoint" WHERE id=$1`, [created.id])).rows[0];
  assert.equal(next.previousSecret, first.secret, "only immediate previous key survives");
  assert.notEqual(second.secret, first.secret);
  assert.equal(verifyRotatingBillingRequest(body, beforeTimestamp, beforeSig, second.secret,
    first.secret, second.previousSecretExpiresAt, before), null, "superseded secret is rejected");
  // Exercise the production billing worker: it must fetch the current key after rotation.
  receiverCurrent = second.secret;
  receiverPrevious = first.secret;
  receiverExpiry = second.previousSecretExpiresAt;
  receiverNow = new Date();
  await db.query(`INSERT INTO "Customer" (id,"orgId","externalId") VALUES ('rotation-customer','rotation-org','customer-1')`);
  await db.query("BEGIN");
  await db.query(`INSERT INTO "BillingRecord" (id,"orgId","billedCustomerId","periodStart","periodEnd","closeAt")
    VALUES ('rotation-record','rotation-org','rotation-customer','2026-08-01','2026-09-01','2026-09-04')`);
  await db.query(`INSERT INTO "BillingRecordSnapshot" (id,"billingRecordId","calculatedAt",state,"sourceEvents")
    VALUES ('rotation-snapshot','rotation-record',now(),'OPEN','[]')`);
  await db.query(`UPDATE "BillingRecord" SET "currentSnapshotId"='rotation-snapshot' WHERE id='rotation-record'`);
  await db.query("COMMIT");
  await db.query(`INSERT INTO "BillingRecordVersion" (id,"billingRecordId","snapshotId",version,"approvedById","finalizedAt",
    "periodStart","periodEnd","closeAt","sourceEvents","ratedSources","eventOutcomes",lines,reconciliation,
    "lateArrivals",comparison,currency,amount) VALUES ('rotation-version','rotation-record','rotation-snapshot',1,
    'rotation-owner',now(),'2026-08-01','2026-09-01','2026-09-04','[]','[]','[]','[]','{}','[]','{}','USD',0)`);
  await db.query(`INSERT INTO "WebhookEvent" (id,type,payload,status,"orgId","billingRecordVersionId","targetEndpointIds")
    VALUES ('rotation-event','invoice.finalized','{}','PENDING','rotation-org','rotation-version',ARRAY[$1]::text[])`, [created.id]);
  await db.query(`INSERT INTO "BillingWebhookWork" ("webhookEventId","endpointId") VALUES ('rotation-event',$1)`, [created.id]);
  const beforeWorker = observed.length;
  await deliverBillingWebhook("rotation-event", created.id);
  assert.equal(observed.length, beforeWorker + 1);
  const workerRequest = observed.at(-1)!;
  assert(verifyRotatingBillingRequest(workerRequest.body, workerRequest.timestamp, workerRequest.signature,
    second.secret, null, null, receiverNow));
  assert.equal(verifyRotatingBillingRequest(workerRequest.body, workerRequest.timestamp, workerRequest.signature,
    first.secret, null, null, receiverNow), null);
  const deliveryLogs = await listWebhookDeliveryLogs("rotation-org");
  assert.equal(deliveryLogs.length, 1);
  assert.equal(deliveryLogs[0].status, "SUCCESS");
  assert(!JSON.stringify(deliveryLogs).includes(created.secret));
  assert(!JSON.stringify(deliveryLogs).includes(first.secret));
  assert(!JSON.stringify(deliveryLogs).includes(second.secret));
  const eventOutcomes = await listBillingWebhookEvents("rotation-org");
  assert.equal(eventOutcomes.length, 1);
  assert.equal(eventOutcomes[0].billingWebhookWork[0].attemptCount, 1);
  for (const secret of [created.secret, first.secret, second.secret]) {
    assert(!JSON.stringify(eventOutcomes).includes(secret));
  }
  await db.query(`DELETE FROM "Membership" WHERE id='rotation-member'`);
  await assert.rejects(rotateEndpointSecretForOwner("rotation-org", created.id, "rotation-owner", at), /OWNER_REQUIRED/);
  await assert.rejects(createEndpointForOwner("rotation-org", "rotation-owner", url, ["invoice.finalized"]), /OWNER_REQUIRED/);
  const logs = JSON.stringify((await db.query(`SELECT action,metadata FROM "AuditLog" WHERE "entityId"=$1`, [created.id])).rows);
  assert(!logs.includes(first.secret) && !logs.includes(second.secret) && !logs.includes(created.secret));
  console.log("Webhook secret rotation integration passed");
} finally {
  await db.end().catch(() => {});
  await prisma.$disconnect();
  receiver.close();
}
