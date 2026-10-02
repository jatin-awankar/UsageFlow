import { createHash } from 'node:crypto';
import { open, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const [action, label, runId, directory, baseUrl, apiKey, faultTimestamp] = process.argv.slice(2);
const scenario = label.split(':')[0];
const count = Number(process.env.PILOT_FAULT_COUNT || 20);
const requestedRate = process.env.PILOT_FAULT_RATE ? Number(process.env.PILOT_FAULT_RATE) : null;
if (!['fault', 'injected', 'send', 'send-one', 'send-rest', 'wait-claim', 'checkpoint', 'recover', 'replay', 'finish'].includes(action) || !/^[0-9a-f]{8}-[0-9a-f]{3}$/.test(runId) || !Number.isSafeInteger(count) || count < 1 || count > 100000) throw Error('Invalid fault arguments');
if (requestedRate !== null && (!Number.isFinite(requestedRate) || requestedRate <= 0 || requestedRate > 10)) throw Error('PILOT_FAULT_RATE must be greater than zero and at most 10');
if (process.env.CUSTOMER_LINKED_INGESTION_ENABLED === 'true') throw Error('Sender inherited ingestion gate');
const journalFile = join(directory, 'fault-sender-journal.jsonl');
const evidenceFile = join(directory, 'fault-evidence.json');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
let evidence;
try { evidence = JSON.parse(await readFile(evidenceFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; evidence = { runId, commit: process.env.PILOT_COMMIT, startedAt: new Date().toISOString(), countPerScenario: count, requestedRate, scenarios: {}, failures: [], gates: { customerLinkedIngestion: 'child processes only', finalization: 'closed' }, environment: { host: os.hostname(), cpuCount: os.cpus().length, memoryBytes: os.totalmem(), workerConcurrency: Number(process.env.WORKER_CONCURRENCY || 5), apiProcesses: 1, queue: process.env.QUEUE_NAME, postgresImage: 'postgres:17.6-alpine', redisImage: 'redis:7-alpine', network: 'loopback container ports', containerLimits: 'Docker defaults; per-container limits not set', saturation: 'unmeasured' }, postgresRestoreRto: 'unmeasured; separate ticket' }; }
const current = action === 'finish' ? null : (evidence.scenarios[scenario] ||= { checkpoints: [], attempts: [], acceptedOriginalIds: {}, resolvedOriginalIds: {}, replacementIds: {}, failures: [] });
async function save() { await writeFile(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 }); }
async function append(record) { const file = await open(journalFile, 'a', 0o600); try { await file.write(`${JSON.stringify(record)}\n`); await file.sync(); } finally { await file.close(); } }
const keyFor = index => `fault-${runId}-${scenario}-${index}`;
const payloadFor = index => ({ customerId: `customer-${runId}`, metric: 'CALLS', amount: index % 3 + 1, timestamp: current.occurrenceTime });
async function send(index, kind, journaledPayload) {
  const key = keyFor(index), payload = journaledPayload ?? JSON.stringify(payloadFor(index));
  const attempt = `${scenario}:${index}:${kind}`;
  await append({ type: 'send', runId, scenario, attempt, organization: `org-${runId}`, externalCustomerId: `customer-${runId}`, metric: 'CALLS', quantity: index % 3 + 1, occurrenceTime: current.occurrenceTime, idempotencyKey: key, payload, attemptNumber: kind === 'original' ? 1 : 2, sendTime: new Date().toISOString() });
  let result;
  try {
    const response = await fetch(`${baseUrl}/api/track`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-usageflow-api-key': apiKey, 'idempotency-key': key }, body: payload, signal: AbortSignal.timeout(30000) });
    const body = await response.text();
    let parsed; try { parsed = JSON.parse(body); } catch {}
    result = { type: 'outcome', attempt, kind, status: response.status, classification: response.ok && parsed?.eventId ? 'accepted' : 'rejected', eventId: parsed?.eventId || null, body: body.slice(0, 1000), completedAt: new Date().toISOString() };
    if (kind === 'original' && process.env.PILOT_FAULT_TEST_LOST_RESPONSE === `${scenario}:${index}` && result.classification === 'accepted') result = { type: 'outcome', attempt, kind, classification: 'uncertain', transportError: 'Synthetic response lost after acceptance', completedAt: new Date().toISOString() };
  } catch (error) { result = { type: 'outcome', attempt, kind, classification: 'uncertain', transportError: String(error), completedAt: new Date().toISOString() }; }
  await append(result); current.attempts.push(result);
  if (kind === 'original' && result.eventId) current.acceptedOriginalIds[key] = result.eventId;
  return result;
}
async function snapshot() {
  const journalRecords = (await readFile(journalFile, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  const originals = journalRecords.filter(record => record.type === 'send' && record.attemptNumber === 1);
  const expectedByKey = new Map(originals.map(record => [record.idempotencyKey, record]));
  const orgId = `org-${runId}`;
  const { rows: allRows } = await db.query(`SELECT e.id, e."idempotencyKey" key, e.amount, e."billedCustomerId" customer, e."billingTreatment" treatment, e."metricKey" metric, e."metricId" metric_id, to_char(e.timestamp, 'YYYY-MM') event_month, e."processingState" state, i."eventId" IS NOT NULL intent, p."eventId" IS NOT NULL projection, p."orgId" projected_org, p."billedCustomerId" projected_customer, p."metricKey" projected_metric, p.amount projected_quantity, r."eventId" IS NOT NULL rating, r."orgId" rated_org, r."billedCustomerId" rated_customer, r."metricId" rated_metric_id, r.quantity rated_quantity, r.amount rated_amount, r.currency, r."priceVersionId" price_id, u."eventId" IS NOT NULL unrated, rr."eventId" IS NOT NULL retry, rf."eventId" IS NOT NULL rating_failure FROM "UsageEvent" e LEFT JOIN "LedgerProcessingIntent" i ON i."eventId" = e.id LEFT JOIN "LedgerEventProjection" p ON p."eventId" = e.id LEFT JOIN "RatedEvent" r ON r."eventId" = e.id LEFT JOIN "UnratedEvent" u ON u."eventId" = e.id LEFT JOIN "RatingRetry" rr ON rr."eventId" = e.id LEFT JOIN "RatingFailure" rf ON rf."eventId" = e.id WHERE e."orgId" = $1`, [orgId]);
  const rows = allRows.filter(row => row.key?.startsWith(`fault-${runId}-${scenario}-`));
  const allByKey = new Map(allRows.map(row => [row.key, row]));
  const failures = [];
  const expectedQuantity = Array.from({ length: count }, (_, i) => i % 3 + 1).reduce((a,b) => a+b, 0);
  for (const row of allRows) {
    const sent = expectedByKey.get(row.key);
    if (!sent) { failures.push(`Extra raw event ${row.id}`); continue; }
    const payload = JSON.parse(sent.payload);
    const expectedCustomer = payload.customerId === `customer-${runId}` ? `customer-row-${runId}` : `customer-row-secondary-${runId}`;
    if (row.treatment !== 'LEDGER_ONLY' || row.amount !== payload.amount || row.customer !== expectedCustomer || row.metric !== payload.metric || row.metric_id !== `metric-${runId}` || row.event_month !== payload.timestamp.slice(0, 7) || !row.intent || row.projection && (row.projected_org !== orgId || row.projected_customer !== expectedCustomer || row.projected_metric !== payload.metric || row.projected_quantity !== payload.amount) || row.rating && (row.rated_org !== orgId || row.rated_customer !== expectedCustomer || row.rated_metric_id !== `metric-${runId}` || row.rated_quantity !== payload.amount || Number(row.rated_amount) !== payload.amount || row.currency !== 'USD' || row.price_id !== `price-${runId}`)) failures.push(`${row.key}: row mismatch`);
  }
  for (const [key, id] of Object.entries(current.acceptedOriginalIds)) {
    const row = allByKey.get(key);
    if (row && row.id !== id) failures.push(`${key}: original ID changed`);
  }
  if (rows.length > count || new Set(rows.map(row => row.id)).size !== rows.length) failures.push('Extra or duplicate raw rows');
  const { rows: derivedCounts } = await db.query(`SELECT (SELECT count(*)::int FROM "LedgerEventProjection" WHERE "orgId" = $1) projections, (SELECT count(*)::int FROM "RatedEvent" WHERE "orgId" = $1) ratings`, [orgId]);
  if (derivedCounts[0].projections !== allRows.filter(row => row.projection).length || derivedCounts[0].ratings !== allRows.filter(row => row.rating).length) failures.push('Extra or duplicate derived rows');
  const totals = { expectedQuantity, rawCount: rows.length, rawQuantity: rows.reduce((n,r) => n+r.amount,0), projectedCount: rows.filter(r => r.projection).length, projectedQuantity: rows.reduce((n,r) => n+Number(r.projected_quantity || 0),0), ratedCount: rows.filter(r => r.rating).length, ratedQuantity: rows.reduce((n,r) => n+Number(r.rated_quantity || 0),0), ratedAmount: rows.reduce((n,r) => n+Number(r.rated_amount || 0),0) };
  const backlog = { pending: rows.filter(r => r.state === 'PENDING').length, processing: rows.filter(r => r.state === 'PROCESSING').length, failed: rows.filter(r => r.state === 'FAILED').length, unrated: rows.filter(r => r.unrated).length, ratingRetry: rows.filter(r => r.retry).length, ratingFailure: rows.filter(r => r.rating_failure).length, missingProjection: count - totals.projectedCount, missingRating: count - totals.ratedCount };
  const groups = {};
  const group = key => groups[key] ||= { expected: { count: 0, quantity: 0 }, actual: { rawCount: 0, rawQuantity: 0, projectedCount: 0, projectedQuantity: 0, ratedCount: 0, ratedQuantity: 0, ratedAmount: 0 } };
  for (const sent of originals.filter(record => record.scenario === scenario)) {
    const customer = sent.externalCustomerId === `customer-${runId}` ? `customer-row-${runId}` : `customer-row-secondary-${runId}`;
    const key = `${orgId}|${customer}|${sent.metric}|${sent.occurrenceTime.slice(0, 7)}`;
    const expected = group(key).expected;
    expected.count++;
    expected.quantity += sent.quantity;
  }
  for (const row of rows) {
    const key = `${orgId}|${row.customer}|${row.metric}|${row.event_month}`;
    const actual = group(key).actual;
    actual.rawCount++;
    actual.rawQuantity += row.amount;
    if (row.projection) { actual.projectedCount++; actual.projectedQuantity += row.projected_quantity; }
    if (row.rating) { actual.ratedCount++; actual.ratedQuantity += row.rated_quantity; actual.ratedAmount += Number(row.rated_amount); }
  }
  let queue;
  try {
    const container = `usageflow-pilot-redis-${runId}`;
    const countKey = (verb, key) => Number(execFileSync('docker', ['exec', container, 'redis-cli', verb, `bull:${process.env.QUEUE_NAME}:${key}`], { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).trim());
    queue = { waiting: countKey('LLEN', 'wait'), active: countKey('LLEN', 'active'), delayed: countKey('ZCARD', 'delayed'), failed: countKey('ZCARD', 'failed') };
  } catch (error) { queue = { unavailable: String(error) }; }
  return { at: new Date().toISOString(), totals, backlog, groups, queue, rowsByKey: Object.fromEntries(rows.map(r => [r.key, { id: r.id, projection: r.projection, rating: r.rating }])), failures };
}

try {
  if (action === 'fault') {
    current.faultAt = faultTimestamp && !Number.isNaN(Date.parse(faultTimestamp)) ? faultTimestamp : new Date().toISOString();
  } else if (action === 'injected') {
    current.injectionCompletedAt = new Date().toISOString();
  } else if (action === 'send' || action === 'send-one' || action === 'send-rest') {
    current.occurrenceTime ||= new Date(Date.now() - 60000).toISOString();
    const first = action === 'send-rest' ? 1 : 0;
    const last = action === 'send-one' ? 1 : count;
    const started = performance.now();
    for (let i=first;i<last;i++) {
      if (requestedRate !== null) {
        const delay = started + (i - first) * 1000 / requestedRate - performance.now();
        if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
      }
      await send(i, 'original');
    }
    const elapsedSeconds = (performance.now() - started) / 1000;
    (current.sendPhases ||= []).push({ action, count: last - first, requestedRate, elapsedSeconds, achievedRate: (last - first) / elapsedSeconds });
    if (action !== 'send-one') current.sendEndedAt = new Date().toISOString();
    if (process.env.PILOT_FAULT_TEST_EXTRA_EVENT === 'true' && scenario === 'baseline') {
      const response = await fetch(`${baseUrl}/api/track`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-usageflow-api-key': apiKey, 'idempotency-key': `unrecorded-${runId}` }, body: JSON.stringify(payloadFor(0)), signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw Error(`Synthetic extra event was not accepted: ${response.status}`);
    }
  } else if (action === 'wait-claim') {
    const deadline = Date.now() + 10000;
    do {
      const { rows } = await db.query(`SELECT count(*)::int claimed FROM "UsageEvent" e JOIN "LedgerProcessingIntent" i ON i."eventId" = e.id WHERE e."orgId" = $1 AND e."idempotencyKey" = $2 AND e."processingState" = 'PROCESSING' AND i."leaseUntil" > now()`, [`org-${runId}`, keyFor(0)]);
      if (rows[0].claimed > 0) { current.claimedAtStop = rows[0].claimed; current.claimObservedAt = new Date().toISOString(); break; }
      await new Promise(resolve => setTimeout(resolve, 50));
    } while (Date.now() < deadline);
    if (!current.claimedAtStop) throw Error('Worker did not claim the synthetic event before stop');
  } else if (action === 'checkpoint') {
    const check = await snapshot(); check.name = label.split(':')[1]; current.checkpoints.push(check);
    current.failures.push(...check.failures);
  } else if (action === 'recover') {
    current.recoveryStartedAt = new Date().toISOString();
    const deadline = Date.now() + Number(process.env.PILOT_FAULT_DRAIN_SECONDS || 90) * 1000;
    let check;
    const drained = state => state.totals.rawCount === count && state.totals.projectedCount === count && state.totals.ratedCount === count && state.backlog.pending === 0 && state.backlog.processing === 0 && state.backlog.failed === 0 && state.backlog.unrated === 0 && state.backlog.ratingRetry === 0 && state.backlog.ratingFailure === 0 && state.queue.waiting === 0 && state.queue.active === 0 && state.queue.delayed === 0 && state.queue.failed === 0;
    do { check = await snapshot(); if (drained(check)) break; await new Promise(resolve => setTimeout(resolve, 1000)); } while (Date.now() < deadline);
    current.recoveryDrain = { backlog: check.backlog, queue: check.queue };
    current.recoveryEndedAt = new Date().toISOString();
    current.timedOut = !drained(check);
    current.recoverySeconds = current.timedOut ? null : (Date.parse(current.recoveryEndedAt) - Date.parse(current.sendEndedAt))/1000;
    current.faultToDrainSeconds = current.timedOut || scenario === 'baseline' ? null : (Date.parse(current.recoveryEndedAt) - Date.parse(current.faultAt))/1000;
    current.baselineElapsedSeconds = scenario === 'baseline' && !current.timedOut ? (Date.parse(current.recoveryEndedAt) - Date.parse(current.faultAt))/1000 : null;
    current.checkpoints.push({ ...check, name: 'recovered' });
    if (current.timedOut) current.failures.push('Recovery timed out with backlog');
  } else if (action === 'replay') {
    const records = (await readFile(journalFile, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    const originalSends = new Map(records.filter(record => record.type === 'send' && record.scenario === scenario && record.attemptNumber === 1).map(record => [record.idempotencyKey, record]));
    current.preReplayLookupAt = new Date().toISOString();
    current.attemptClassifications = {};
    current.replayObservedIds = {};
    const originalOutcomes = new Map(current.attempts.filter(attempt => attempt.kind === 'original').map(attempt => [attempt.attempt, attempt]));
    for (let start = 0; start < count; start += 1000) {
      const keys = Array.from({ length: Math.min(1000, count - start) }, (_, offset) => keyFor(start + offset));
      let found = new Map(), lookupError = null;
      try {
        const { rows } = await db.query(`SELECT id, "idempotencyKey" key FROM "UsageEvent" WHERE "orgId" = $1 AND "idempotencyKey" = ANY($2::text[])`, [`org-${runId}`, keys]);
        found = new Map(rows.map(row => [row.key, row.id]));
      } catch (error) { lookupError = String(error); }
      for (const key of keys) {
        const index = Number(key.slice(key.lastIndexOf('-') + 1));
        const originalOutcome = originalOutcomes.get(`${scenario}:${index}:original`);
        const unavailable = lookupError || process.env.PILOT_FAULT_TEST_LOOKUP_UNAVAILABLE === `${scenario}:${index}`;
        const id = unavailable ? null : found.get(key);
        if (id) current.resolvedOriginalIds[key] = id;
        const classification = unavailable ? 'unresolved' : id ? 'committed-original' : originalOutcome?.classification === 'uncertain' ? 'absent-after-uncertain-response' : 'absent';
        current.attemptClassifications[key] = { classification, eventId: id || null, originalResponse: originalOutcome?.classification || 'missing', ...(unavailable ? { reason: lookupError || 'Synthetic lookup unavailable' } : {}) };
        if (originalOutcome?.eventId && !unavailable && id !== originalOutcome.eventId) current.failures.push(`${key}: accepted response ID missing or changed before replay`);
      }
    }
    for (let i=0;i<count;i++) {
      const journaled = originalSends.get(keyFor(i));
      if (!journaled) { current.failures.push(`${keyFor(i)}: missing original journal send`); continue; }
      const result = await send(i, 'replay', journaled.payload);
      const original = current.acceptedOriginalIds[keyFor(i)] || current.resolvedOriginalIds[keyFor(i)];
      if (original && result.eventId !== original) current.failures.push(`${keyFor(i)}: replay did not retain original ID`);
      if (!original && result.eventId && current.attemptClassifications[keyFor(i)]?.classification === 'unresolved') current.replayObservedIds[keyFor(i)] = result.eventId;
      else if (!original && result.eventId) current.replacementIds[keyFor(i)] = result.eventId;
    }
  } else if (action === 'finish') {
    evidence.endedAt = new Date().toISOString();
    const bytes = await readFile(journalFile);
    const journalRecords = bytes.toString('utf8').trim().split('\n').map(line => JSON.parse(line));
    evidence.journal = { file: 'fault-sender-journal.jsonl', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    for (const [name, item] of Object.entries(evidence.scenarios)) {
      item.sample = { attempted: item.attempts.filter(a => a.kind === 'original').length, acceptedResponses: item.attempts.filter(a => a.kind === 'original' && a.classification === 'accepted').length, uncertainResponses: item.attempts.filter(a => a.kind === 'original' && a.classification === 'uncertain').length, committedOriginals: Object.keys(item.resolvedOriginalIds).length, absentBeforeReplay: Object.values(item.attemptClassifications || {}).filter(value => value.classification.startsWith('absent')).length, unresolvedAttempts: Object.values(item.attemptClassifications || {}).filter(value => value.classification === 'unresolved').length, replacementIds: Object.keys(item.replacementIds).length };
      if (requestedRate !== null && item.sendPhases.some(phase => phase.count >= 10 && phase.achievedRate < requestedRate * 0.99)) item.failures.push('Fault sender did not achieve its requested rate');
      if (item.sample.unresolvedAttempts) item.failures.push(`${item.sample.unresolvedAttempts} original attempts unresolved before replay`);
      const originalSends = journalRecords.filter(record => record.type === 'send' && record.scenario === name && record.attemptNumber === 1);
      item.journalExpected = { count: originalSends.length, quantity: originalSends.reduce((total, record) => total + record.quantity, 0), uniqueKeys: new Set(originalSends.map(record => record.idempotencyKey)).size };
      if (item.journalExpected.count !== count || item.journalExpected.uniqueKeys !== count) item.failures.push('Original journal count or key mismatch');
      const final = item.checkpoints.at(-1);
      for (let index = 0; index < count; index++) if (!final?.rowsByKey[`fault-${runId}-${name}-${index}`]) item.failures.push(`fault-${runId}-${name}-${index}: missing final raw row`);
      if (final?.totals.rawCount !== count || final?.totals.projectedCount !== count || final?.totals.ratedCount !== count || final?.totals.rawQuantity !== final?.totals.expectedQuantity || final?.totals.projectedQuantity !== final?.totals.expectedQuantity || final?.totals.ratedQuantity !== final?.totals.expectedQuantity || final?.totals.ratedAmount !== final?.totals.expectedQuantity || new Set([...Object.keys(item.resolvedOriginalIds), ...Object.keys(item.acceptedOriginalIds), ...Object.keys(item.replacementIds)]).size !== count) item.failures.push('Final reconciliation mismatch');
      if (final?.totals.rawQuantity !== item.journalExpected.quantity || final?.totals.projectedQuantity !== item.journalExpected.quantity || final?.totals.ratedQuantity !== item.journalExpected.quantity || final?.totals.ratedAmount !== item.journalExpected.quantity) item.failures.push('Final quantities differ from journal');
      for (const [groupKey, values] of Object.entries(final?.groups || {})) if (values.expected.count !== values.actual.rawCount || values.expected.count !== values.actual.projectedCount || values.expected.count !== values.actual.ratedCount || values.expected.quantity !== values.actual.rawQuantity || values.expected.quantity !== values.actual.projectedQuantity || values.expected.quantity !== values.actual.ratedQuantity || values.expected.quantity !== values.actual.ratedAmount) item.failures.push(`Group mismatch: ${groupKey}`);
      item.queueDrainedAtFinal = final?.queue?.waiting === 0 && final?.queue?.active === 0 && final?.queue?.delayed === 0 && final?.queue?.failed === 0;
      if (!item.queueDrainedAtFinal || final?.backlog?.pending || final?.backlog?.processing || final?.backlog?.failed || final?.backlog?.unrated || final?.backlog?.ratingRetry || final?.backlog?.ratingFailure) item.failures.push('Unresolved final queue or database backlog');
      item.fullReconciliationSeconds = final && !item.failures.length ? (Date.parse(final.at) - Date.parse(item.faultAt)) / 1000 : null;
      item.targets = { volume100000: count >= 100000 && !item.failures.length ? 'pass-local-sample' : 'unmeasured', customer20000: count >= 20000 && !item.failures.length ? 'pass-local-sample' : 'unmeasured', burst10PerSecond: 'unmeasured', processingWithin60Seconds: 'unmeasured', ingestionRestorationWithin4Hours: 'unmeasured' };
      evidence.failures.push(...item.failures.map(f => `${name}: ${f}`));
    }
    console.log(JSON.stringify({ evidenceFile, failures: evidence.failures }));
    if (evidence.failures.length) process.exitCode = 1;
  }
  await save();
} finally { await db.end(); }
