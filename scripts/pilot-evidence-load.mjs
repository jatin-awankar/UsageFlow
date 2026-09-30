import { createHash } from "node:crypto";
import { open, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import pg from "pg";
import { Queue } from "bullmq";
import { readTraces } from "./pilot-evidence-measurements.mjs";

const [mode, runId, directory, baseUrl, apiKey] = process.argv.slice(2);
if (!["--volume", "--burst", "--export", "--arrival"].includes(mode) || !runId || !directory || !baseUrl || !apiKey) throw new Error("Invalid load arguments");
if (process.env.CUSTOMER_LINKED_INGESTION_ENABLED === "true") throw new Error("Sender inherited the ingestion gate");
const volume = mode !== "--burst";
const sustainedSeconds = mode === "--arrival" ? Number(process.env.PILOT_SUSTAINED_SECONDS || 60) : 0;
const burstSeconds = Number(process.env.PILOT_BURST_SECONDS || 10);
if (mode === "--arrival" && (!Number.isInteger(sustainedSeconds) || sustainedSeconds < 10 || sustainedSeconds > 600 || !Number.isInteger(burstSeconds) || burstSeconds < 1 || burstSeconds > 60)) throw new Error("Arrival durations are outside bounded limits");
const seedCount = mode === "--arrival" ? 100_000 : 0;
const count = mode === "--volume" && process.env.PILOT_DIAGNOSTIC_EVENT_COUNT ? Number(process.env.PILOT_DIAGNOSTIC_EVENT_COUNT) : mode === "--arrival" ? seedCount + 10 * (sustainedSeconds + burstSeconds) : volume ? 100_000 : burstSeconds * 10;
const requestedRate = volume ? null : 10;
const concurrency = volume ? 8 : 1;
const sampleEvery = Math.max(1, Math.ceil(count / 100));
let journalOverheadMs = 0;
const journalPath = join(directory, "sender-journal.jsonl");
const journal = await open(journalPath, "wx", 0o600);
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const redisAddress = new URL(process.env.REDIS_URL);
const queue = mode === "--arrival" || (mode === "--volume" && count !== 100_000) ? new Queue(process.env.QUEUE_NAME, { connection: { host: redisAddress.hostname, port: Number(redisAddress.port || 6379) } }) : null;
const queueSamples = [];
async function sampleQueue(phase) {
  if (!queue) return;
  try { queueSamples.push({ at: new Date().toISOString(), phase, ...(await queue.getJobCounts("waiting", "active", "delayed", "failed", "completed")) }); }
  catch (error) { queueSamples.push({ at: new Date().toISOString(), phase, error: String(error) }); }
}
const databaseSamples = [];
let databaseSamplingMs = 0;
let activeSample = Promise.resolve();
async function sampleDatabase() {
  const previous = activeSample;
  activeSample = previous.then(async () => {
  const started = performance.now();
  try {
    const { rows: [row] } = await db.query(`SELECT count(*) FILTER (WHERE wait_event_type = 'Lock')::int AS lock_waiters, count(*) FILTER (WHERE state = 'active')::int AS active_queries, max(EXTRACT(EPOCH FROM (clock_timestamp() - query_start)) * 1000) FILTER (WHERE state = 'active' AND pid <> pg_backend_pid()) AS oldest_active_query_ms FROM pg_stat_activity WHERE datname = current_database()`);
    const { rows: [database] } = await db.query(`SELECT xact_commit, xact_rollback, blks_read, blks_hit, tup_returned, tup_fetched, tup_inserted, tup_updated, tup_deleted, blk_read_time, blk_write_time FROM pg_stat_database WHERE datname = current_database()`);
    const { rows: [progress] } = await db.query(`SELECT (SELECT count(*)::int FROM "UsageEvent" WHERE "orgId" = $1) AS accepted, (SELECT count(*)::int FROM "LedgerEventProjection" WHERE "orgId" = $1) AS projected, (SELECT count(*)::int FROM "RatedEvent" WHERE "orgId" = $1) AS rated`, [`org-${runId}`]);
    const queryTime = mode === "--volume" && count !== 100_000 ? (await db.query(`SELECT queryid, calls, total_exec_time, mean_exec_time, max_exec_time, rows, left(query, 240) AS query FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20`)).rows : undefined;
    const stats = dockerEvidence(`usageflow-pilot-pg-${runId}`).stats;
    databaseSamples.push({ at: new Date().toISOString(), ...row, ...progress, counters: database, queryTime, containerCpuPercent: stats?.CPUPerc ?? null, containerMemory: stats?.MemUsage ?? null });
  } catch (error) { databaseSamples.push({ at: new Date().toISOString(), error: String(error) }); }
  finally { databaseSamplingMs += performance.now() - started; }
  });
  return activeSample;
}
await sampleDatabase();
const databaseTimer = setInterval(sampleDatabase, 5_000);
const occurrence = new Date(Date.now() - 60_000).toISOString();
const startedAt = new Date();
const startedMs = performance.now();
const outcomes = [];
const accepted = new Map();
const responseCodes = {};
const attemptNumbers = new Map();
function dockerEvidence(name) {
  try {
    const stats = JSON.parse(execFileSync("docker", ["stats", "--no-stream", "--format", "{{json .}}", name], { encoding: "utf8" }).trim());
    const limits = JSON.parse(execFileSync("docker", ["inspect", "--format", "{{json .HostConfig}}", name], { encoding: "utf8" }).trim());
    return { stats, limits: { nanoCpus: limits.NanoCpus, memoryBytes: limits.Memory, cpuQuota: limits.CpuQuota, cpuPeriod: limits.CpuPeriod } };
  } catch (error) { return { error: String(error) }; }
}
let next = 0;
let exportRun;
let phase = "seed";
const phases = [];
const queueTimer = queue ? setInterval(() => { void sampleQueue(phase); }, 1000) : null;
let journalChain = Promise.resolve();
function append(record) {
  journalChain = journalChain.then(async () => { const start = performance.now(); await journal.write(`${JSON.stringify(record)}\n`); await journal.sync(); journalOverheadMs += performance.now() - start; });
  return journalChain;
}
function payloadFor(index) {
  return { customerId: index < (volume ? Math.min(20_000, count) : count) ? `customer-${runId}` : `customer-secondary-${runId}`, metric: "CALLS", amount: index % 3 + 1, timestamp: occurrence };
}
async function send(index, variant = "original") {
  const original = payloadFor(index);
  const body = variant === "conflict" ? { ...original, amount: original.amount + 1 } : original;
  const payload = JSON.stringify(body);
  const key = `event-${runId}-${index}`;
  const attemptNumber = (attemptNumbers.get(index) || 0) + 1;
  attemptNumbers.set(index, attemptNumber);
  const attempt = `${index}:${attemptNumber}`;
  await append({ type: "send", runId, phase, organization: `org-${runId}`, externalCustomerId: body.customerId, metric: body.metric, quantity: body.amount, occurrenceTime: occurrence, idempotencyKey: key, payload, attempt, attemptNumber, variant, sendTime: new Date().toISOString() });
  let result;
  try {
    const response = await fetch(`${baseUrl}/api/track`, { method: "POST", headers: { "content-type": "application/json", "x-usageflow-api-key": apiKey, "idempotency-key": key, ...(index % sampleEvery === 0 ? { "x-pilot-evidence-trace": "1" } : {}) }, body: payload, signal: AbortSignal.timeout(30_000) });
    const text = await response.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    result = { type: "outcome", runId, phase, attempt, variant, completedAt: new Date().toISOString(), classification: response.ok && parsed?.eventId ? "accepted" : "rejected", status: response.status, eventId: parsed?.eventId ?? null, body: text.slice(0, 1000) };
    responseCodes[response.status] = (responseCodes[response.status] || 0) + 1;
    if ((variant === "original" || variant === "recovery") && result.classification === "accepted") accepted.set(index, result.eventId);
  } catch (error) {
    result = { type: "outcome", runId, phase, attempt, variant, completedAt: new Date().toISOString(), classification: "uncertain", transportError: String(error) };
  }
  await append(result);
  outcomes.push(result);
  return result;
}
const failures = [];
try {
  if (volume) {
    await Promise.all(Array.from({ length: concurrency }, async () => {
      while (next < (mode === "--arrival" ? seedCount : count)) {
        const index = next++;
        if (mode === "--export" && index >= Math.floor(count / 2) && !exportRun) {
          const { createExportEvidence } = await import("./pilot-evidence-export.mjs");
          exportRun = createExportEvidence({ db, runId, directory, baseUrl, ownerPassword: process.env.PILOT_OWNER_PASSWORD, occurrence }).then(value => ({ value }), error => ({ error: String(error) }));
        }
        await send(index);
      }
    }));
    if (mode === "--arrival") {
      phases.push({ name: "seed", count: seedCount, elapsedSeconds: (performance.now() - startedMs) / 1000 });
      for (let pass = 0; pass < 4 && accepted.size < seedCount; pass++) {
        for (let index = 0; index < seedCount; index++) if (!accepted.has(index)) await send(index, "recovery");
      }
      const seedDeadline = Date.now() + Number(process.env.PILOT_DRAIN_SECONDS || 1800) * 1000;
      let seedRows = 0;
      let seedReconciled = false;
      while (Date.now() < seedDeadline) {
        const { rows: [row] } = await db.query(`SELECT count(*)::int AS total, count(p."eventId")::int AS projected, count(r."eventId")::int AS rated, coalesce(sum(e.amount),0)::int AS raw_quantity, coalesce(sum(p.amount),0)::int AS projected_quantity, coalesce(sum(r.quantity),0)::int AS rated_quantity FROM "UsageEvent" e LEFT JOIN "LedgerEventProjection" p ON p."eventId"=e.id LEFT JOIN "RatedEvent" r ON r."eventId"=e.id WHERE e."orgId"=$1`, [`org-${runId}`]);
        seedRows = row.total;
        seedReconciled = row.total === seedCount && row.projected === seedCount && row.rated === seedCount && row.raw_quantity === 199999 && row.projected_quantity === 199999 && row.rated_quantity === 199999 && accepted.size === seedCount;
        if (seedReconciled) break;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      if (!seedReconciled) throw new Error(`Seed ledger did not reconcile before arrival phases: ${seedRows}/${seedCount} rows`);
      async function scheduledPhase(name, firstIndex, seconds) {
        phase = name;
        await sampleQueue(phase);
        const phaseStart = performance.now();
        const phaseStartedAt = new Date();
        const pending = [];
        for (let offset = 0; offset < seconds * 10; offset++) {
          const delay = phaseStart + offset * 100 - performance.now();
          if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
          pending.push(send(firstIndex + offset));
        }
        await Promise.all(pending);
        const elapsedSeconds = (performance.now() - phaseStart) / 1000;
        const originals = outcomes.filter(o => o.phase === name && o.variant === "original");
        const acceptedOriginals = originals.filter(o => o.classification === "accepted").length;
        phases.push({ name, count: seconds * 10, requestedEventsPerSecond: 10, startedAt: phaseStartedAt.toISOString(), endedAt: new Date().toISOString(), elapsedSeconds, achievedOriginalRequestsPerSecond: seconds * 10 / elapsedSeconds, achievedOriginalAcceptancesPerSecond: acceptedOriginals / elapsedSeconds, originalAccepted: acceptedOriginals, originalFailed: originals.length - acceptedOriginals });
        await sampleQueue(phase);
      }
      await scheduledPhase("sustained", seedCount, sustainedSeconds);
      await scheduledPhase("burst-after-reconciled-seed", seedCount + sustainedSeconds * 10, burstSeconds);
    }
  } else {
    const pending = [];
    for (let index = 0; index < count; index++) {
      const target = startedMs + index * 100;
      const delay = target - performance.now();
      if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
      pending.push(send(index));
    }
    await Promise.all(pending);
  }
  const initialSendElapsedSeconds = (performance.now() - startedMs) / 1000;
  let exportEvidence;
  if (mode === "--export") {
    if (!exportRun) failures.push("Export snapshot was never started during ingestion");
    else {
      const result = await exportRun;
      if (result.error) {
        failures.push(`Export creation or pagination failed: ${result.error}`);
        try { await writeFile(join(directory, "export-failure.json"), `${JSON.stringify({ runId, failure: result.error, occurredAt: new Date().toISOString() }, null, 2)}\n`, { flag: "wx", mode: 0o600 }); }
        catch (error) { if (error.code !== "EEXIST") throw error; }
      }
      else exportEvidence = result.value;
    }
  }
  for (let pass = 0; pass < 4 && accepted.size < count; pass++) {
    for (let index = 0; index < count; index++) {
      if (!accepted.has(index)) await send(index, "recovery");
    }
  }
  const ingestionEndedAt = new Date();
  const ingestionElapsedSeconds = (performance.now() - startedMs) / 1000;
  const retryIndexes = [0, Math.floor(count / 2), count - 1];
  const retries = [];
  const conflicts = [];
  for (const index of retryIndexes) {
    retries.push({ index, outcome: await send(index, "retry") });
    conflicts.push({ index, outcome: await send(index, "conflict") });
  }
  for (const { index, outcome } of retries) if (!accepted.has(index) || outcome.eventId !== accepted.get(index)) failures.push(`Retry ${index} did not retain original ID`);
  for (const { index, outcome } of conflicts) if (outcome.status !== 409) failures.push(`Changed-field key ${index} did not conflict`);

  const orgId = `org-${runId}`;
  async function snapshot() {
    const { rows } = await db.query(`SELECT e.id, e."idempotencyKey" AS key, e.amount, e."billedCustomerId" AS customer, e."receivedAt" AT TIME ZONE 'UTC' AS received, e."processingState" AS state, p."projectedAt" AT TIME ZONE 'UTC' AS projected, p.amount AS projected_quantity, r."ratedAt" AS rated, EXTRACT(EPOCH FROM (p."projectedAt" - e."receivedAt")) * 1000 AS projection_ms, EXTRACT(EPOCH FROM (r."ratedAt" - (e."receivedAt" AT TIME ZONE 'UTC'))) * 1000 AS rating_ms, r.quantity AS rated_quantity, r.amount AS rated_amount, r.currency, r."priceVersionId" AS price_id, i."eventId" IS NOT NULL AS has_intent, u."eventId" IS NOT NULL AS unrated, rr."eventId" IS NOT NULL AS rating_retry, rf."eventId" IS NOT NULL AS rating_failure FROM "UsageEvent" e LEFT JOIN "LedgerProcessingIntent" i ON i."eventId" = e.id LEFT JOIN "RatedEvent" r ON r."eventId" = e.id LEFT JOIN "LedgerEventProjection" p ON p."eventId" = e.id LEFT JOIN "UnratedEvent" u ON u."eventId" = e.id LEFT JOIN "RatingRetry" rr ON rr."eventId" = e.id LEFT JOIN "RatingFailure" rf ON rf."eventId" = e.id WHERE e."orgId" = $1 AND e."billingTreatment" = 'LEDGER_ONLY'`, [orgId]);
    return rows;
  }
  let rows = await snapshot();
  const backlogAtSendEnd = { raw: rows.length, missingProjection: rows.filter(r => !r.projected).length, missingRating: rows.filter(r => !r.rated).length };
  await sampleQueue("send-end");
  const drainDeadline = Date.now() + Number(process.env.PILOT_DRAIN_SECONDS || 1800) * 1000;
  while (rows.some(r => !r.projected || !r.rated) && Date.now() < drainDeadline) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    rows = await snapshot();
  }
  const byKey = new Map(rows.map(r => [r.key, r]));
  const rawIds = new Set(rows.map(r => r.id));
  const observedAcceptedResponses = accepted.size;
  for (let index = 0; index < count; index++) {
    const row = byKey.get(`event-${runId}-${index}`);
    if (row && !accepted.has(index)) accepted.set(index, row.id);
  }
  const acceptedIds = new Set(accepted.values());
  if (accepted.size !== count) failures.push(`Resolved ${accepted.size}/${count} original committed IDs`);
  if (rows.length !== count || rawIds.size !== count) failures.push(`Raw count/unique IDs: ${rows.length}/${rawIds.size}; expected ${count}`);
  for (let index = 0; index < count; index++) {
    const row = byKey.get(`event-${runId}-${index}`);
    if (!row || row.id !== accepted.get(index) || row.amount !== index % 3 + 1 || row.customer !== `customer-row-${index < (volume ? Math.min(20_000, count) : count) ? "" : "secondary-"}${runId}` || !row.has_intent || (row.projected && row.projected_quantity !== row.amount) || (row.rated && (row.rated_quantity !== row.amount || row.price_id !== `price-${runId}` || row.currency !== "USD" || Number(row.rated_amount) !== row.amount))) {
      if (failures.length < 30) failures.push(`Reconciliation mismatch at index ${index}`);
    }
  }
  const latencies = (field) => {
    const values = rows.filter(r => acceptedIds.has(r.id) && r[field] !== null).map(r => Number(r[field])).sort((a, b) => a - b);
    const percentile = p => values.length ? values[Math.ceil(values.length * p) - 1] : null;
    return { denominator: accepted.size, count: values.length, missing: accepted.size - values.length, p50Ms: percentile(.5), p95Ms: percentile(.95), p99Ms: percentile(.99), maxMs: values.at(-1) ?? null, above60Seconds: values.filter(v => v > 60_000).length };
  };
  const projected = latencies("projection_ms");
  const rated = latencies("rating_ms");
  const bothWithinMinute = rows.filter(r => r.projection_ms !== null && r.rating_ms !== null && Number(r.projection_ms) <= 60_000 && Number(r.rating_ms) <= 60_000).length;
  if (mode === "--arrival") {
    for (const item of phases.filter(item => item.name !== "seed")) {
      const first = item.name === "sustained" ? seedCount : seedCount + sustainedSeconds * 10;
      const phaseRows = Array.from({ length: item.count }, (_, offset) => byKey.get(`event-${runId}-${first + offset}`));
      item.reconciledIds = phaseRows.filter((row, offset) => row && row.id === accepted.get(first + offset)).length;
      item.bothWithin60Seconds = phaseRows.filter(row => row && row.projection_ms !== null && row.rating_ms !== null && Number(row.projection_ms) <= 60_000 && Number(row.rating_ms) <= 60_000).length;
      item.finalMissingProjection = phaseRows.filter(row => !row?.projected).length;
      item.finalMissingRating = phaseRows.filter(row => !row?.rated).length;
      if (item.reconciledIds !== item.count || item.bothWithin60Seconds !== item.count || item.finalMissingProjection || item.finalMissingRating) failures.push(`${item.name} did not meet full ID reconciliation and 60-second completion`);
    }
    await sampleQueue("final");
    const finalQueue = queueSamples.at(-1);
    if (finalQueue?.error || !finalQueue || finalQueue.waiting !== 0 || finalQueue.active !== 0 || finalQueue.delayed !== 0 || finalQueue.failed !== 0) failures.push("Final queue backlog is not zero");
  }
  if (projected.missing || rated.missing) failures.push(`Missing terminal timestamps: projection=${projected.missing}, rating=${rated.missing}`);
  const bytes = await readFile(journalPath);
  const expectedQuantity = Array.from({ length: count }, (_, index) => index % 3 + 1).reduce((a, b) => a + b, 0);
  if (rows.reduce((n, r) => n + r.amount, 0) !== expectedQuantity || rows.reduce((n, r) => n + (r.projected_quantity || 0), 0) !== expectedQuantity || rows.reduce((n, r) => n + (r.rated_quantity || 0), 0) !== expectedQuantity || rows.reduce((n, r) => n + Number(r.rated_amount || 0), 0) !== expectedQuantity) failures.push("Raw, projection, rating quantity or rated amount total differs from deterministic sender expectation");
  const unresolvedTransportAttempts = outcomes.filter(o => o.classification === "uncertain" && !byKey.has(`event-${runId}-${Number(o.attempt.split(":")[0])}`)).length;
  const responseSeconds = Array.from({ length: Math.ceil(initialSendElapsedSeconds) + 1 }, (_, second) => ({ second, responses: 0, acceptedUnique: 0 }));
  for (const outcome of outcomes.filter(o => o.variant === "original")) {
    const second = Math.max(0, Math.floor((Date.parse(outcome.completedAt) - startedAt.getTime()) / 1000));
    if (!responseSeconds[second]) responseSeconds[second] = { second, responses: 0, acceptedUnique: 0 };
    responseSeconds[second].responses++;
    if (outcome.classification === "accepted") responseSeconds[second].acceptedUnique++;
  }
  const firstReceipt = rows.reduce((v, r) => !v || r.received < v ? r.received : v, null);
  const lastReceipt = rows.reduce((v, r) => !v || r.received > v ? r.received : v, null);
  await sampleDatabase();
  const traceIds = new Set(Array.from({ length: count }, (_, index) => index).filter(index => index % sampleEvery === 0).map(index => accepted.get(index)).filter(Boolean));
  const correlation = await readTraces(directory, traceIds, new Map(rows.map(row => [row.id, row])));
  if (correlation.count !== traceIds.size) failures.push(`Correlated ${correlation.count}/${traceIds.size} sampled IDs`);
  for (const sample of correlation.samples) if (!sample.apiDispatchAt || !sample.queueEnteredAt || !sample.workerExecutionAt || !sample.durableClaimAt || sample.queueWaitMs === null || sample.claimToProjectionMs === null || sample.claimToProjectionMs < 0 || !sample.projectedAt || !sample.ratedAt) failures.push(`Incomplete or invalid sampled timing for ${sample.eventId}`);
  const report = {
    arrival: mode === "--arrival" ? { phases, queueSamples, seedReconciledBeforeBurst: true } : undefined,
    diagnosticQueueSamples: mode === "--volume" && count !== 100_000 ? queueSamples : undefined,
    correlation,
    database: { samples: databaseSamples, note: "Container CPU is point sampled; lock waiters are instantaneous. Cumulative database CPU and lock wait duration are unavailable from standard PostgreSQL views." },
    instrumentation: { sampledEvery: sampleEvery, journalSyncWallMs: journalOverheadMs, journalSyncWallMsPerAttempt: journalOverheadMs / outcomes.length, databaseSamplingWallMs: databaseSamplingMs, synchronousTraceEmissionMs: correlation.synchronousTraceMs, traceEmissionCount: correlation.traceEmissionCount, note: "Separate wall times for sender journal writes and fsyncs, database polling including Docker stats, and synchronous trace emission. The recovery scan's sample-membership lookup and indirect scheduling or I/O effects are not separately timed; concurrent work can overlap, so these are not a throughput correction." },
    mode, runId, startedAt: startedAt.toISOString(), ingestionEndedAt: ingestionEndedAt.toISOString(), endedAt: new Date().toISOString(), requested: { distinctEvents: count, requestsPerSecond: requestedRate, burstDurationSeconds: volume ? null : count / 10, volumeCustomerMinimum: volume && count >= 100_000 ? 20_000 : null, diagnosticEventCount: mode === "--volume" && count !== 100_000 ? count : null },
    achieved: { originalAcceptedResponses: observedAcceptedResponses, resolvedCommittedOriginals: accepted.size, uniquePersistedEvents: rows.length, httpAttempts: outcomes.length, uncertainAttempts: outcomes.filter(o => o.classification === "uncertain").length, unresolvedTransportAttempts, responseCodes, initialSendElapsedSeconds, ingestionElapsedSeconds, originalRequestsPerSecond: count / initialSendElapsedSeconds, acceptedUniquePerSecond: accepted.size / ingestionElapsedSeconds, responseSeconds: volume ? null : responseSeconds, firstReceiptAt: firstReceipt?.toISOString() ?? null, lastReceiptAt: lastReceipt?.toISOString() ?? null, receiptWindowSeconds: firstReceipt && lastReceipt ? (lastReceipt - firstReceipt) / 1000 : null, retryIdsRetained: retries.filter(({ index, outcome }) => outcome.eventId === accepted.get(index)).length, changedFieldConflicts: conflicts.filter(({ outcome }) => outcome.status === 409).length },
    backlogAtSendEnd, finalBacklog: { missingProjection: projected.missing, missingRating: rated.missing, pending: rows.filter(r => r.state === "PENDING").length, processing: rows.filter(r => r.state === "PROCESSING").length, failed: rows.filter(r => r.state === "FAILED").length, unrated: rows.filter(r => r.unrated).length, ratingRetry: rows.filter(r => r.rating_retry).length, ratingFailure: rows.filter(r => r.rating_failure).length },
    latency: { clockPrecision: "JavaScript Date and PostgreSQL timestamp read at millisecond precision", projectedAtMinusReceivedAt: projected, ratedAtMinusReceivedAt: rated, bothWithin60Seconds: bothWithinMinute, bothWithin60SecondsFraction: rows.length ? bothWithinMinute / rows.length : null },
    totals: { expectedQuantity, rawQuantity: rows.reduce((n, r) => n + r.amount, 0), projectedQuantity: rows.reduce((n, r) => n + (r.projected_quantity || 0), 0), ratedQuantity: rows.reduce((n, r) => n + (r.rated_quantity || 0), 0), ratedAmount: rows.reduce((n, r) => n + Number(r.rated_amount || 0), 0), primaryCustomerCount: rows.filter(r => r.customer === `customer-row-${runId}`).length },
    environment: { commit: process.env.PILOT_COMMIT || null, host: os.hostname(), cpuCount: os.cpus().length, cpuModel: os.cpus()[0]?.model, memoryBytes: os.totalmem(), freeMemoryBytesAtReport: os.freemem(), loadAverageAtReport: os.loadavg(), apiProcesses: 1, workerConcurrency: Number(process.env.WORKER_CONCURRENCY || 5), queue: process.env.QUEUE_NAME, databaseImage: "postgres:17.6-alpine", redisImage: "redis:7-alpine", network: "host loopback published container ports", postgres: dockerEvidence(`usageflow-pilot-pg-${runId}`), redis: dockerEvidence(`usageflow-pilot-redis-${runId}`), saturation: "single Docker stats sample; peak saturation unmeasured" },
    journal: { file: "sender-journal.jsonl", bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }, failures,
  };
  if (mode === "--export" && exportEvidence) {
    const { reconcileRatingEvidence } = await import("./pilot-evidence-export.mjs");
    const rating = await reconcileRatingEvidence(db, runId, exportEvidence.ids);
    exportEvidence.rating = rating;
    failures.push(...exportEvidence.failures, ...rating.failures);
    await writeFile(join(directory, "export-evidence.json"), `${JSON.stringify(exportEvidence, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  }
  report.export = mode === "--export" ? { evidence: exportEvidence ? "export-evidence.json" : null, creationMs: exportEvidence?.creationMs ?? null, paginationMs: exportEvidence?.paginationMs ?? null, pages: exportEvidence?.pages ?? null, rowCount: exportEvidence?.rowCount ?? null } : undefined;
  report.failures = failures;
  const reportName = `${mode === "--export" ? "export-load" : mode === "--arrival" ? "arrival" : volume ? "volume" : "burst"}-evidence.json`;
  await writeFile(join(directory, reportName), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ runId, mode, report: join(directory, reportName), export: report.export, achieved: report.achieved, latency: report.latency, failures }));
  if (failures.length) process.exitCode = 1;
} finally {
  clearInterval(databaseTimer);
  if (queueTimer) clearInterval(queueTimer);
  if (queue) await queue.close();
  await activeSample;
  await journal.close();
  await db.end();
}
