import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { Queue, Worker } from "bullmq";
import { Client } from "pg";
import { PENDING_DISPATCH_SETTLE_MS, recoverLedgerWork } from "../worker/recoverLedgerWork";
import prisma from "../lib/prisma";
import { getUsageFlowQueue } from "../lib/bullmq";

const db = new Client({ connectionString: process.env.DATABASE_URL });
const queue = new Queue("usageflow", { connection: { url: process.env.REDIS_URL! } });
const workers: ChildProcess[] = [];
const workerOutput = new Map<ChildProcess, string>();
let blockedWorker: Worker | undefined;
let releaseBlockedJob: (() => void) | undefined;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  workerOutput.set(worker, "");
  worker.stdout?.on("data", (chunk) => workerOutput.set(worker, (workerOutput.get(worker) || "") + chunk.toString()));
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
  const waiting = await accept("worker-original-waiting");
  assert(await queue.getJob(`ledger-${waiting}`), "original dispatch is waiting");
  await sleep(PENDING_DISPATCH_SETTLE_MS + 100);
  for (let scan = 0; scan < 3; scan++) await recoverLedgerWork();
  const waitingJobs = await queue.getJobs(["waiting", "delayed", "active"]);
  assert.deepEqual(waitingJobs.filter((job) => job.data.eventId === waiting).map((job) => job.id), [`ledger-${waiting}`]);
  let worker = startWorker();
  await waitFor(async () => (await state(waiting)).processingState === "PROCESSED", "original waiting job");
  await stopWorker(worker);

  const active = await accept("worker-original-active");
  const blocked = new Promise<void>((resolve) => { releaseBlockedJob = resolve; });
  blockedWorker = new Worker("usageflow", async () => { await blocked; }, { connection: { url: process.env.REDIS_URL! } });
  await waitFor(async () => (await queue.getJobState(`ledger-${active}`)) === "active", "active original job");
  await sleep(PENDING_DISPATCH_SETTLE_MS + 100);
  for (let scan = 0; scan < 3; scan++) await recoverLedgerWork();
  assert.equal((await queue.getJobs(["waiting", "delayed", "active"])).filter((job) => job.data.eventId === active).length, 1);
  assert.equal((await state(active)).processingState, "PENDING");
  releaseBlockedJob!();
  await blockedWorker.close();
  blockedWorker = undefined;
  await waitFor(async () => (await queue.getJob(`ledger-${active}`)) === undefined, "completed original removed");
  await recoverLedgerWork();
  assert(await queue.getJob(`recover-pending-${active}`), "absent original is recovered");
  worker = startWorker();
  await waitFor(async () => (await state(active)).processingState === "PROCESSED", "active original recovery");
  await stopWorker(worker);

  // Redis can lose a dispatched job while the committed PostgreSQL intent survives.
  const lost = await accept("event-abcdef12-345-0");
  console.log("Accepted queue-loss event");
  assert.equal((await state(lost)).processingState, "PENDING");
  await queue.obliterate({ force: true });
  const lostAt = Date.now();
  await waitFor(async () => { await recoverLedgerWork(); return !!(await queue.getJob(`recover-pending-${lost}`)); }, "prompt lost-job recovery");
  const enqueueAfterLossMs = Date.now() - lostAt;
  assert(enqueueAfterLossMs < 60_000, "lost job recovers within one minute of real elapsed time");
  worker = startWorker();
  await waitFor(async () => (await state(lost)).processingState === "PROCESSED", "queue loss recovery");
  const projectionAfterLossMs = Date.now() - lostAt;
  await waitFor(async () => (workerOutput.get(worker) || "").split("\n").some((line) => line.startsWith("PILOT_TRACE ") && line.includes(`"eventId":"${lost}"`) && line.includes('"jobKind":"ledger_recovery"')), "sampled recovery-job trace");
  console.log(JSON.stringify({ lostJobRecovery: { enqueueAfterLossMs, projectionAfterLossMs } }));
  await stopWorker(worker);

  const outage = await accept("worker-redis-outage");
  const outageOriginal = await queue.getJob(`ledger-${outage}`);
  assert(outageOriginal);
  await outageOriginal.remove();
  await sleep(PENDING_DISPATCH_SETTLE_MS + 100);
  const redisContainer = process.env.REDIS_TEST_CONTAINER!;
  execFileSync("docker", ["pause", redisContainer]);
  let redisPaused = true;
  try {
    const scanDuringOutage = recoverLedgerWork();
    await sleep(1_000);
    assert.equal((await state(outage)).processingState, "PENDING");
    execFileSync("docker", ["unpause", redisContainer]);
    redisPaused = false;
    await scanDuringOutage;
  } finally {
    if (redisPaused) execFileSync("docker", ["unpause", redisContainer]);
  }
  assert(await queue.getJob(`recover-pending-${outage}`), "lost job recovered after Redis resumes");
  worker = startWorker();
  await waitFor(async () => (await state(outage)).processingState === "PROCESSED", "Redis outage recovery");
  await stopWorker(worker);

  // A page of live originals must not hide a missing job behind it forever.
  const backlogIds: string[] = [];
  for (let index = 0; index < 200; index++) backlogIds.push(await accept(`worker-scan-page-${index}`));
  const lastLost = await accept("worker-scan-page-lost");
  const lastOriginal = await queue.getJob(`ledger-${lastLost}`);
  assert(lastOriginal);
  await lastOriginal.remove();
  await sleep(PENDING_DISPATCH_SETTLE_MS + 100);
  const pageRecoveryAt = Date.now();
  await waitFor(async () => { await recoverLedgerWork(); return !!(await queue.getJob(`recover-pending-${lastLost}`)); }, "lost job after live-original scan page");
  assert(Date.now() - pageRecoveryAt < 60_000);
  assert.equal((await queue.getJobs(["waiting"])).filter((job) => backlogIds.includes(job.data.eventId)).length, backlogIds.length);
  worker = startWorker();
  await waitFor(async () => (await state(lastLost)).processingState === "PROCESSED", "paged queue loss recovery", 45_000);
  await waitFor(async () => (await db.query(`SELECT count(*)::int AS n FROM "UsageEvent" WHERE id = ANY($1) AND "processingState" = 'PROCESSED'`, [backlogIds])).rows[0].n === backlogIds.length, "live-original backlog processing", 45_000);
  await stopWorker(worker);

  const ratingRecovery = await accept("event-abcdef12-345-1");
  worker = startWorker({ LEDGER_TEST_EXIT_BEFORE_RATING: "true" });
  await waitFor(async () => worker.exitCode !== null || worker.signalCode !== null, "post-projection worker exit");
  assert.equal((await state(ratingRecovery)).processingState, "PROCESSED");
  worker = startWorker();
  await waitFor(async () => (workerOutput.get(worker) || "").split("\n").some((line) => line.startsWith("PILOT_TRACE ") && line.includes(`"eventId":"${ratingRecovery}"`) && line.includes('"jobKind":"rating_recovery"')), "sampled rating-only recovery trace");
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
  worker = startWorker();
  await waitFor(async () => (await state(interrupted)).processingState === "PROCESSED", "real-time expired lease recovery", 45_000);
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
  await assertProjection([waiting, active, lost, outage, lastLost, ...backlogIds, ratingRecovery, restarted, interrupted, invalid, storageFailed, failed]);
  for (const id of [waiting, active, lost, outage, lastLost, ...backlogIds, ratingRecovery, restarted, interrupted, invalid, storageFailed, failed]) {
    assert.equal((await state(id)).billingTreatment, "LEDGER_ONLY");
    assert.equal((await state(id)).processingState, "PROCESSED");
  }
  assert((await state(interrupted)).attempts >= 2);
  assert((await state(failed)).attempts >= 2);
  console.log("Ledger worker recovery: queue loss, restart, interruption, duplicate, failed retry, and projection reconciliation passed");
} finally {
  releaseBlockedJob?.();
  await blockedWorker?.close();
  for (const worker of workers) await stopWorker(worker);
  await queue.close();
  await getUsageFlowQueue().close();
  await db.end();
  await prisma.$disconnect();
}
