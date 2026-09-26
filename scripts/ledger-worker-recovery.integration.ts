import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { Queue } from "bullmq";
import { Client } from "pg";

const db = new Client({ connectionString: process.env.DATABASE_URL });
const queue = new Queue("usageflow", { connection: { url: process.env.REDIS_URL! } });
const workers: ChildProcess[] = [];

async function waitFor(predicate: () => Promise<boolean>, label: string, timeout = 15_000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function startWorker(extraEnv: Record<string, string> = {}) {
  const worker = spawn("./node_modules/.bin/tsx", ["worker/index.ts"], {
    env: { ...process.env, ...extraEnv }, stdio: ["ignore", "pipe", "pipe"],
  });
  worker.stderr?.on("data", (chunk) => process.stderr.write(chunk));
  workers.push(worker);
  return worker;
}

async function stopWorker(worker: ChildProcess) {
  if (worker.exitCode !== null || worker.signalCode !== null) return;
  worker.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolve) => worker.once("exit", () => resolve())),
    new Promise<void>((resolve) => setTimeout(() => { worker.kill("SIGKILL"); resolve(); }, 2_000)),
  ]);
}

async function accept(key: string) {
  const response = await fetch(`${process.env.CUSTOMER_TEST_BASE_URL}/api/track`, {
    method: "POST",
    headers: { "x-usageflow-api-key": "secret-org-c", "idempotency-key": key, "content-type": "application/json" },
    body: JSON.stringify({ customerId: "customer-c", metric: "calls", amount: 3, timestamp: "2026-10-04T00:00:00.000Z" }),
  });
  assert.equal(response.status, 200);
  const body = await response.json() as { eventId: string };
  return body.eventId;
}

async function state(id: string) {
  const { rows } = await db.query(`SELECT e."processingState", e."billingTreatment", i."failureReason", i.attempts FROM "UsageEvent" e JOIN "LedgerProcessingIntent" i ON i."eventId" = e.id WHERE e.id = $1`, [id]);
  return rows[0];
}

async function assertProjection(ids: string[]) {
  const { rows } = await db.query(`SELECT e.id, e.amount, p.amount AS projected_amount, p."billedCustomerId" FROM "UsageEvent" e LEFT JOIN "LedgerEventProjection" p ON p."eventId" = e.id WHERE e.id = ANY($1)`, [ids]);
  assert.equal(rows.length, ids.length);
  for (const row of rows) {
    assert.equal(row.amount, row.projected_amount);
    assert.equal(row.billedCustomerId, "customer-row-c");
  }
  const totals = await db.query(`SELECT count(*)::int AS n, sum(amount)::int AS quantity FROM "LedgerEventProjection" WHERE "eventId" = ANY($1)`, [ids]);
  assert.deepEqual(totals.rows[0], { n: ids.length, quantity: ids.length * 3 });
}

try {
  await db.connect();
  // Redis can lose a dispatched job while the committed PostgreSQL intent survives.
  const lost = await accept("worker-queue-loss");
  console.log("Accepted queue-loss event");
  assert.equal((await state(lost)).processingState, "PENDING");
  await queue.obliterate({ force: true });
  let worker = startWorker();
  await waitFor(async () => (await state(lost)).processingState === "PROCESSED", "queue loss recovery");
  console.log("Recovered queue-loss event");
  await stopWorker(worker);

  const restarted = await accept("worker-restart");
  console.log("Accepted restart event");
  worker = startWorker();
  await waitFor(async () => (await state(restarted)).processingState === "PROCESSED", "worker restart recovery");
  await stopWorker(worker);

  const interrupted = await accept("worker-interrupted");
  console.log("Accepted interrupted event");
  worker = startWorker({ LEDGER_TEST_EXIT_AFTER_CLAIM: "true" });
  await waitFor(async () => (await state(interrupted)).processingState === "PROCESSING", "interrupted claim");
  await waitFor(async () => worker.exitCode !== null || worker.signalCode !== null, "worker crash");
  await db.query(`UPDATE "LedgerProcessingIntent" SET "leaseUntil" = now() - interval '1 second' WHERE "eventId" = $1`, [interrupted]);
  worker = startWorker();
  await waitFor(async () => (await state(interrupted)).processingState === "PROCESSED", "expired lease recovery");
  await stopWorker(worker);

  const invalid = await accept("worker-invalid-event");
  await db.query(`UPDATE "UsageEvent" SET "billedCustomerId" = NULL WHERE id = $1`, [invalid]);
  worker = startWorker();
  await waitFor(async () => (await state(invalid)).processingState === "FAILED", "invalid event failure");
  assert.equal((await state(invalid)).failureReason, "LEDGER_EVENT_INVALID");
  await stopWorker(worker);
  await db.query(`UPDATE "UsageEvent" SET "billedCustomerId" = 'customer-row-c' WHERE id = $1`, [invalid]);
  await db.query(`UPDATE "LedgerProcessingIntent" SET "leaseUntil" = now() - interval '1 second' WHERE "eventId" = $1`, [invalid]);
  worker = startWorker();
  await waitFor(async () => (await state(invalid)).processingState === "PROCESSED", "invalid event retry");
  await stopWorker(worker);

  const storageFailed = await accept("worker-storage-failed");
  await db.query(`CREATE FUNCTION reject_ledger_projection() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected storage failure'; END $$`);
  await db.query(`CREATE TRIGGER reject_ledger_projection BEFORE INSERT ON "LedgerEventProjection" FOR EACH ROW EXECUTE FUNCTION reject_ledger_projection()`);
  worker = startWorker();
  await waitFor(async () => (await state(storageFailed)).processingState === "FAILED", "storage failure");
  assert.equal((await state(storageFailed)).failureReason, "LEDGER_STORAGE_FAILED");
  await stopWorker(worker);
  await db.query(`DROP TRIGGER reject_ledger_projection ON "LedgerEventProjection"`);
  await db.query(`DROP FUNCTION reject_ledger_projection()`);
  await db.query(`UPDATE "LedgerProcessingIntent" SET "leaseUntil" = now() - interval '1 second' WHERE "eventId" = $1`, [storageFailed]);
  worker = startWorker();
  await waitFor(async () => (await state(storageFailed)).processingState === "PROCESSED", "storage retry");
  await stopWorker(worker);

  const failed = await accept("worker-failed");
  console.log("Accepted failed event");
  worker = startWorker({ LEDGER_TEST_FAIL_PROJECTION: "true" });
  await waitFor(async () => (await state(failed)).processingState === "FAILED", "reviewable failure");
  assert.equal((await state(failed)).failureReason, "LEDGER_PROJECTION_FAILED");
  await stopWorker(worker);
  await db.query(`UPDATE "LedgerProcessingIntent" SET "leaseUntil" = now() - interval '1 second' WHERE "eventId" = $1`, [failed]);
  worker = startWorker();
  await waitFor(async () => (await state(failed)).processingState === "PROCESSED", "failed retry");
  await queue.add("PROCESS_LEDGER_EVENT", { eventId: failed }, { jobId: `duplicate-${failed}`, removeOnComplete: true });
  await waitFor(async () => (await queue.getJob(`duplicate-${failed}`)) === undefined, "duplicate delivery");
  await assertProjection([lost, restarted, interrupted, invalid, storageFailed, failed]);
  for (const id of [lost, restarted, interrupted, invalid, storageFailed, failed]) {
    assert.equal((await state(id)).billingTreatment, "LEDGER_ONLY");
    assert.equal((await state(id)).processingState, "PROCESSED");
  }
  assert((await state(interrupted)).attempts >= 2);
  assert((await state(failed)).attempts >= 2);
  console.log("Ledger worker recovery: queue loss, restart, interruption, duplicate, failed retry, and projection reconciliation passed");
} finally {
  for (const worker of workers) await stopWorker(worker);
  await queue.close();
  await db.end();
}
