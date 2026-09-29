import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const receiverDir = dirname(fileURLToPath(import.meta.url));
const currentSecret = "synthetic-current-secret";
const previousSecret = "synthetic-previous-secret";

function eventBody(id, type) {
  return Buffer.from(JSON.stringify({
    id,
    type,
    createdAt: "2026-09-29T00:00:00.000Z",
    organizationId: "synthetic-org",
    billingRecordVersionId: `synthetic-${id}`,
    payload: {
      organizationId: "synthetic-org",
      billingRecordId: "synthetic-record",
      customerId: "synthetic-customer",
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-09-01T00:00:00.000Z",
      versionId: `synthetic-${id}`,
      version: type === "invoice.finalized" ? 1 : 2,
      currency: "INR",
      amount: type === "invoice.finalized" ? "10.000" : "11.000",
    },
  }));
}

function signature(body, timestamp, secret) {
  return `v1=${createHmac("sha256", secret).update(timestamp).update(".").update(body).digest("hex")}`;
}

async function startReceiver(previousExpiry) {
  const child = spawn(process.execPath, ["index.js"], {
    cwd: receiverDir,
    env: {
      WEBHOOK_SECRET: currentSecret,
      WEBHOOK_PREVIOUS_SECRET: previousSecret,
      WEBHOOK_PREVIOUS_SECRET_EXPIRES_AT: previousExpiry,
      PORT: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Receiver did not start on a loopback port: ${output}`));
    }, 3000);
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/Webhook receiver running on http:\/\/127\.0\.0\.1:(\d+)\/billing-webhook/);
      if (match) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.once("error", (error) => { clearTimeout(timeout); reject(error); });
    child.once("exit", (code) => { clearTimeout(timeout); reject(new Error(`Receiver exited ${code}: ${output}`)); });
  });
  return { child, baseUrl: `http://127.0.0.1:${port}` };
}

async function stopReceiver(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exit = once(child, "exit");
  child.kill();
  await exit;
}

async function sendBilling(baseUrl, body, secret, options = {}) {
  const timestamp = options.timestamp ?? String(Math.floor(Date.now() / 1000));
  const response = await fetch(`${baseUrl}/billing-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-UsageFlow-Timestamp": timestamp,
      "X-UsageFlow-Signature": options.signature ?? signature(body, timestamp, secret),
    },
    body,
  });
  return { status: response.status, text: await response.text() };
}

test("synthetic billing receiver accepts signed facts, deduplicates, and rejects tampering", async () => {
  const { child, baseUrl } = await startReceiver(new Date(Date.now() + 60_000).toISOString());
  try {
    const finalized = eventBody("finalized-event", "invoice.finalized");
    const revised = eventBody("revised-event", "invoice.revised");
    assert.deepEqual(await sendBilling(baseUrl, finalized, currentSecret), { status: 200, text: "Billing event received" });
    assert.deepEqual(await sendBilling(baseUrl, finalized, currentSecret, {
      timestamp: String(Math.floor(Date.now() / 1000) + 1),
    }), { status: 200, text: "Already processed" });
    assert.deepEqual(await sendBilling(baseUrl, revised, currentSecret), { status: 200, text: "Billing event received" });
    const tamperTimestamp = String(Math.floor(Date.now() / 1000));
    assert.equal((await sendBilling(baseUrl, Buffer.concat([revised, Buffer.from(" ")]), currentSecret, {
      timestamp: tamperTimestamp,
      signature: signature(revised, tamperTimestamp, currentSecret),
    })).status, 401);
    assert.equal((await sendBilling(baseUrl, eventBody("wrong-key", "invoice.finalized"), "wrong-secret")).status, 401);
    const now = Math.floor(Date.now() / 1000);
    assert.equal((await sendBilling(baseUrl, eventBody("clock-behind", "invoice.finalized"), currentSecret,
      { timestamp: String(now - 240) })).status, 200);
    assert.equal((await sendBilling(baseUrl, eventBody("clock-ahead", "invoice.finalized"), currentSecret,
      { timestamp: String(now + 240) })).status, 200);
    assert.equal((await sendBilling(baseUrl, eventBody("too-old", "invoice.finalized"), currentSecret,
      { timestamp: String(now - 360) })).status, 401);
    assert.equal((await sendBilling(baseUrl, eventBody("too-new", "invoice.finalized"), currentSecret,
      { timestamp: String(now + 360) })).status, 401);
    assert.equal((await sendBilling(baseUrl, eventBody("old-key", "invoice.finalized"), previousSecret)).status, 200);

    const legacy = Buffer.from(JSON.stringify({ type: "invoice.created", data: { synthetic: true } }));
    const legacyResponse = await fetch(`${baseUrl}/webhook`, { method: "POST", body: legacy,
      headers: { "Content-Type": "application/json", "X-UsageFlow-Signature":
        createHmac("sha256", currentSecret).update(legacy).digest("hex") } });
    assert.equal(legacyResponse.status, 200);
  } finally {
    await stopReceiver(child);
  }
});

test("expired previous secret cannot verify a billing delivery", async () => {
  const { child, baseUrl } = await startReceiver(new Date(Date.now() - 60_000).toISOString());
  try {
    assert.equal((await sendBilling(baseUrl, eventBody("expired-key", "invoice.revised"), previousSecret)).status, 401);
    assert.equal((await sendBilling(baseUrl, eventBody("current-key", "invoice.revised"), currentSecret)).status, 200);
  } finally {
    await stopReceiver(child);
  }
});
