import { createHash } from "node:crypto";
import { open, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import pg from "pg";

const [mode, runId, directory, baseUrl, apiKey] = process.argv.slice(2);
if (!["--volume", "--burst"].includes(mode) || !runId || !directory || !baseUrl || !apiKey) throw new Error("Invalid load arguments");
if (process.env.CUSTOMER_LINKED_INGESTION_ENABLED === "true") throw new Error("Sender inherited the ingestion gate");
const volume = mode === "--volume";
const count = volume ? 100_000 : Number(process.env.PILOT_BURST_SECONDS || 10) * 10;
const requestedRate = volume ? null : 10;
const concurrency = volume ? 8 : 1;
const journalPath = join(directory, "sender-journal.jsonl");
const journal = await open(journalPath, "wx", 0o600);
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
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
let journalChain = Promise.resolve();
function append(record) {
  journalChain = journalChain.then(async () => { await journal.write(`${JSON.stringify(record)}\n`); await journal.sync(); });
  return journalChain;
}
function payloadFor(index) {
  return { customerId: index < (volume ? 20_000 : count) ? `customer-${runId}` : `customer-secondary-${runId}`, metric: "CALLS", amount: index % 3 + 1, timestamp: occurrence };
}
async function send(index, variant = "original") {
  const original = payloadFor(index);
  const body = variant === "conflict" ? { ...original, amount: original.amount + 1 } : original;
  const payload = JSON.stringify(body);
  const key = `event-${runId}-${index}`;
  const attemptNumber = (attemptNumbers.get(index) || 0) + 1;
  attemptNumbers.set(index, attemptNumber);
  const attempt = `${index}:${attemptNumber}`;
  await append({ type: "send", runId, organization: `org-${runId}`, externalCustomerId: body.customerId, metric: body.metric, quantity: body.amount, occurrenceTime: occurrence, idempotencyKey: key, payload, attempt, attemptNumber, variant, sendTime: new Date().toISOString() });
  let result;
  try {
    const response = await fetch(`${baseUrl}/api/track`, { method: "POST", headers: { "content-type": "application/json", "x-usageflow-api-key": apiKey, "idempotency-key": key }, body: payload, signal: AbortSignal.timeout(30_000) });
    const text = await response.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    result = { type: "outcome", runId, attempt, variant, completedAt: new Date().toISOString(), classification: response.ok && parsed?.eventId ? "accepted" : "rejected", status: response.status, eventId: parsed?.eventId ?? null, body: text.slice(0, 1000) };
    responseCodes[response.status] = (responseCodes[response.status] || 0) + 1;
    if ((variant === "original" || variant === "recovery") && result.classification === "accepted") accepted.set(index, result.eventId);
  } catch (error) {
    result = { type: "outcome", runId, attempt, variant, completedAt: new Date().toISOString(), classification: "uncertain", transportError: String(error) };
  }
  await append(result);
  outcomes.push(result);
  return result;
}
const failures = [];
try {
  if (volume) {
    await Promise.all(Array.from({ length: concurrency }, async () => {
      while (next < count) { const index = next++; await send(index); }
    }));
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
    const { rows } = await db.query(`SELECT e.id, e."idempotencyKey" AS key, e.amount, e."billedCustomerId" AS customer, e."receivedAt" AT TIME ZONE 'UTC' AS received, e."processingState" AS state, p."projectedAt" AS projected, p.amount AS projected_quantity, r."ratedAt" AS rated, EXTRACT(EPOCH FROM (p."projectedAt" - e."receivedAt")) * 1000 AS projection_ms, EXTRACT(EPOCH FROM (r."ratedAt" - (e."receivedAt" AT TIME ZONE 'UTC'))) * 1000 AS rating_ms, r.quantity AS rated_quantity, r.amount AS rated_amount, r.currency, r."priceVersionId" AS price_id, i."eventId" IS NOT NULL AS has_intent, u."eventId" IS NOT NULL AS unrated, rr."eventId" IS NOT NULL AS rating_retry, rf."eventId" IS NOT NULL AS rating_failure FROM "UsageEvent" e LEFT JOIN "LedgerProcessingIntent" i ON i."eventId" = e.id LEFT JOIN "RatedEvent" r ON r."eventId" = e.id LEFT JOIN "LedgerEventProjection" p ON p."eventId" = e.id LEFT JOIN "UnratedEvent" u ON u."eventId" = e.id LEFT JOIN "RatingRetry" rr ON rr."eventId" = e.id LEFT JOIN "RatingFailure" rf ON rf."eventId" = e.id WHERE e."orgId" = $1 AND e."billingTreatment" = 'LEDGER_ONLY'`, [orgId]);
    return rows;
  }
  let rows = await snapshot();
  const backlogAtSendEnd = { raw: rows.length, missingProjection: rows.filter(r => !r.projected).length, missingRating: rows.filter(r => !r.rated).length };
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
    if (!row || row.id !== accepted.get(index) || row.amount !== index % 3 + 1 || row.customer !== `customer-row-${index < (volume ? 20_000 : count) ? "" : "secondary-"}${runId}` || !row.has_intent || (row.projected && row.projected_quantity !== row.amount) || (row.rated && (row.rated_quantity !== row.amount || row.price_id !== `price-${runId}` || row.currency !== "USD" || Number(row.rated_amount) !== row.amount))) {
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
  const report = {
    mode, runId, startedAt: startedAt.toISOString(), ingestionEndedAt: ingestionEndedAt.toISOString(), endedAt: new Date().toISOString(), requested: { distinctEvents: count, requestsPerSecond: requestedRate, burstDurationSeconds: volume ? null : count / 10, volumeCustomerMinimum: volume ? 20_000 : null },
    achieved: { originalAcceptedResponses: observedAcceptedResponses, resolvedCommittedOriginals: accepted.size, uniquePersistedEvents: rows.length, httpAttempts: outcomes.length, uncertainAttempts: outcomes.filter(o => o.classification === "uncertain").length, unresolvedTransportAttempts, responseCodes, initialSendElapsedSeconds, ingestionElapsedSeconds, originalRequestsPerSecond: count / initialSendElapsedSeconds, acceptedUniquePerSecond: accepted.size / ingestionElapsedSeconds, responseSeconds: volume ? null : responseSeconds, firstReceiptAt: firstReceipt?.toISOString() ?? null, lastReceiptAt: lastReceipt?.toISOString() ?? null, receiptWindowSeconds: firstReceipt && lastReceipt ? (lastReceipt - firstReceipt) / 1000 : null, retryIdsRetained: retries.filter(({ index, outcome }) => outcome.eventId === accepted.get(index)).length, changedFieldConflicts: conflicts.filter(({ outcome }) => outcome.status === 409).length },
    backlogAtSendEnd, finalBacklog: { missingProjection: projected.missing, missingRating: rated.missing, pending: rows.filter(r => r.state === "PENDING").length, processing: rows.filter(r => r.state === "PROCESSING").length, failed: rows.filter(r => r.state === "FAILED").length, unrated: rows.filter(r => r.unrated).length, ratingRetry: rows.filter(r => r.rating_retry).length, ratingFailure: rows.filter(r => r.rating_failure).length },
    latency: { clockPrecision: "JavaScript Date and PostgreSQL timestamp read at millisecond precision", projectedAtMinusReceivedAt: projected, ratedAtMinusReceivedAt: rated, bothWithin60Seconds: bothWithinMinute, bothWithin60SecondsFraction: rows.length ? bothWithinMinute / rows.length : null },
    totals: { expectedQuantity, rawQuantity: rows.reduce((n, r) => n + r.amount, 0), projectedQuantity: rows.reduce((n, r) => n + (r.projected_quantity || 0), 0), ratedQuantity: rows.reduce((n, r) => n + (r.rated_quantity || 0), 0), ratedAmount: rows.reduce((n, r) => n + Number(r.rated_amount || 0), 0), primaryCustomerCount: rows.filter(r => r.customer === `customer-row-${runId}`).length },
    environment: { commit: process.env.PILOT_COMMIT || null, host: os.hostname(), cpuCount: os.cpus().length, cpuModel: os.cpus()[0]?.model, memoryBytes: os.totalmem(), freeMemoryBytesAtReport: os.freemem(), loadAverageAtReport: os.loadavg(), apiProcesses: 1, workerConcurrency: Number(process.env.WORKER_CONCURRENCY || 5), queue: process.env.QUEUE_NAME, databaseImage: "postgres:17.6-alpine", redisImage: "redis:7-alpine", network: "host loopback published container ports", postgres: dockerEvidence(`usageflow-pilot-pg-${runId}`), redis: dockerEvidence(`usageflow-pilot-redis-${runId}`), saturation: "single Docker stats sample; peak saturation unmeasured" },
    journal: { file: "sender-journal.jsonl", bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }, failures,
  };
  await writeFile(join(directory, `${volume ? "volume" : "burst"}-evidence.json`), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ runId, mode, report: join(directory, `${volume ? "volume" : "burst"}-evidence.json`), achieved: report.achieved, latency: report.latency, failures }));
  if (failures.length) process.exitCode = 1;
} finally {
  await journal.close();
  await db.end();
}
