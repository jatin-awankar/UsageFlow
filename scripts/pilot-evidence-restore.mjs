import { createHash } from 'node:crypto';
import { open, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import pg from 'pg';

const [action, marker] = process.argv.slice(2);
const { PILOT_RESTORE_DIR: dir, PILOT_RESTORE_RUN_ID: runId, PILOT_RESTORE_API_KEY: apiKey } = process.env;
if (!dir || !/^[0-9a-f]{8}-[0-9a-f]{3}$/.test(runId || '')) throw Error('Invalid restore run');
if (process.env.CUSTOMER_LINKED_INGESTION_ENABLED === 'true') throw Error('Sender inherited ingestion gate');
const path = join(dir, 'restore-evidence.json');
const journalPath = join(dir, 'restore-journal.jsonl');
let evidence;
try { evidence = JSON.parse(await readFile(path, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; evidence = { runId, commit: process.env.PILOT_COMMIT, startedAt: new Date().toISOString(), writesPaused: false, versions: { postgres: 'postgres:17.6-alpine', redis: 'redis:7-alpine', applicationCommit: process.env.PILOT_COMMIT }, commands: ['pg_dump -Fc -U postgres -d postgres', 'pg_restore -U postgres -d postgres --no-owner --no-privileges'], failures: [], clocks: {} }; }
const save = () => writeFile(path, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
async function append(record) { const file = await open(journalPath, 'a', 0o600); try { await file.write(`${JSON.stringify(record)}\n`); await file.sync(); } finally { await file.close(); } }
const keyFor = index => `restore-${runId}-${index}`;
function imageId(container) { try { return execFileSync('docker', ['inspect', '--format', '{{.Image}}', container], { encoding: 'utf8' }).trim(); } catch (error) { return { unavailable: String(error) }; } }
const payloadFor = index => ({ customerId: `customer-${runId}`, metric: 'CALLS', amount: index % 3 + 1, timestamp: evidence.occurrenceTime });
async function send(index, baseUrl, variant = 'original', source, keyOverride) {
  const key = keyOverride || keyFor(index), payload = source?.payload || JSON.stringify(payloadFor(index));
  const attempt = `${index}:${variant}:${Date.now()}`;
  await append({ type: 'send', attempt, runId, organization: `org-${runId}`, externalCustomerId: `customer-${runId}`, metric: 'CALLS', quantity: JSON.parse(payload).amount, occurrenceTime: JSON.parse(payload).timestamp, idempotencyKey: key, payload, variant, sendTime: new Date().toISOString() });
  let outcome;
  try {
    const response = await fetch(`${baseUrl}/api/track`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-usageflow-api-key': apiKey, 'idempotency-key': key }, body: payload, signal: AbortSignal.timeout(30000) });
    const body = await response.text(); let parsed; try { parsed = JSON.parse(body); } catch {}
    outcome = { type: 'outcome', attempt, variant, status: response.status, classification: response.ok && parsed?.eventId ? 'accepted' : 'rejected', eventId: parsed?.eventId || null, body: body.slice(0, 1000), completedAt: new Date().toISOString() };
  } catch (error) { outcome = { type: 'outcome', attempt, variant, classification: 'uncertain', transportError: String(error), completedAt: new Date().toISOString() }; }
  await append(outcome);
  return outcome;
}
async function records() { return (await readFile(journalPath, 'utf8')).trim().split('\n').map(line => JSON.parse(line)); }
async function database(fn) { const db = new pg.Client({ connectionString: process.env.DATABASE_URL }); await db.connect(); try { return await fn(db); } finally { await db.end(); } }
const query = `SELECT e.id, e."orgId" org, e."idempotencyKey" key, e.amount, e."billedCustomerId" customer, e."metricKey" metric, to_char(e.timestamp, 'YYYY-MM') event_month, e."billingTreatment" treatment, e."processingState" state, e."receivedAt", i."eventId" IS NOT NULL intent, p."eventId" IS NOT NULL projection, p.amount projected_quantity, r."eventId" IS NOT NULL rating, r.quantity rated_quantity, r.amount rated_amount, r.currency, r."priceVersionId" price_id, u."eventId" IS NOT NULL unrated, rr."eventId" IS NOT NULL rating_retry, rf."eventId" IS NOT NULL rating_failure FROM "UsageEvent" e LEFT JOIN "LedgerProcessingIntent" i ON i."eventId"=e.id LEFT JOIN "LedgerEventProjection" p ON p."eventId"=e.id LEFT JOIN "RatedEvent" r ON r."eventId"=e.id LEFT JOIN "UnratedEvent" u ON u."eventId"=e.id LEFT JOIN "RatingRetry" rr ON rr."eventId"=e.id LEFT JOIN "RatingFailure" rf ON rf."eventId"=e.id WHERE e."orgId"=$1`;
async function rows() { return database(async db => (await db.query(query, [`org-${runId}`])).rows); }
function originals(all) { const outcomes = new Map(all.filter(r => r.type === 'outcome').map(r => [r.attempt, r])); return all.filter(r => r.type === 'send' && r.variant === 'original').map(send => ({ ...send, outcome: outcomes.get(send.attempt) })); }
function summarizeRows(items) {
  const sum = field => items.reduce((n, row) => n + Number(row[field] || 0), 0);
  return { rawCount: items.length, rawQuantity: sum('amount'), projectedCount: items.filter(r => r.projection).length, projectedQuantity: sum('projected_quantity'), ratedCount: items.filter(r => r.rating).length, ratedQuantity: sum('rated_quantity'), ratedAmount: sum('rated_amount'), backlog: { pending: items.filter(r => r.state === 'PENDING').length, processing: items.filter(r => r.state === 'PROCESSING').length, failed: items.filter(r => r.state === 'FAILED').length, unrated: items.filter(r => r.unrated).length, ratingRetry: items.filter(r => r.rating_retry).length, ratingFailure: items.filter(r => r.rating_failure).length } };
}
function groupKey(row) { return `${row.org}|${row.customer}|${row.metric}|${row.event_month}`; }
function groupRows(items) { return Object.fromEntries([...new Set(items.map(groupKey))].sort().map(key => [key, summarizeRows(items.filter(row => groupKey(row) === key))])); }
try {
  if (action === 'mark') {
    if (!['backupStart', 'snapshotCompletion', 'backupFinish', 'faultInjected', 'originalUnavailable'].includes(marker)) throw Error('Invalid marker');
    evidence.clocks[marker] = new Date().toISOString();
    if (marker === 'snapshotCompletion') evidence.clocks.snapshotBound = 'logical dump complete; pg_dump MVCC snapshot acquired after backupStart';
    if (marker === 'faultInjected') evidence.clocks.outageStart = evidence.clocks.faultInjected;
  } else if (action === 'ingest') {
    evidence.occurrenceTime = new Date(Date.now() - 60000).toISOString(); await save();
    for (let i = 0; i < 30; i++) {
      if (i === 5) await writeFile(join(dir, 'ingestion-started'), 'started\n', { flag: 'wx' });
      const outcome = await send(i, process.env.PILOT_RESTORE_ORIGINAL_API);
      if (outcome.classification !== 'accepted') throw Error(`Original ${i} failed: ${JSON.stringify(outcome)}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } else if (action === 'post') {
    const outcome = await send(30, process.env.PILOT_RESTORE_ORIGINAL_API);
    if (outcome.classification !== 'accepted') throw Error(`Deliberate post-backup acceptance failed: ${JSON.stringify(outcome)}`);
    evidence.deliberatelyLostKey = keyFor(30);
  } else if (action === 'classify') {
    const sent = originals(await records());
    const restoredRows = await rows();
    const found = new Map(restoredRows.map(row => [row.key, row]));
    const classifications = { survived: [], absent: [], unresolved: [] };
    for (const item of sent) {
      if (item.outcome?.classification !== 'accepted' || !item.outcome.eventId) { classifications.unresolved.push({ key: item.idempotencyKey, reason: 'no observed accepted ID' }); continue; }
      const row = found.get(item.idempotencyKey);
      if (!row) classifications.absent.push({ key: item.idempotencyKey, originalId: item.outcome.eventId, quantity: item.quantity, acceptedAt: item.outcome.completedAt });
      else if (row.id === item.outcome.eventId) classifications.survived.push({ key: item.idempotencyKey, originalId: row.id, quantity: item.quantity });
      else classifications.unresolved.push({ key: item.idempotencyKey, originalId: item.outcome.eventId, observedId: row.id, reason: 'key points to different ID' });
    }
    evidence.preReplay = { at: new Date().toISOString(), classifications, absentOriginalCount: classifications.absent.length, absentOriginalQuantity: classifications.absent.reduce((n, x) => n + x.quantity, 0), restored: summarizeRows(restoredRows), groups: groupRows(restoredRows) };
    evidence.versions.originalPostgresImageId = imageId(`usageflow-pilot-pg-${runId}`);
    evidence.versions.originalRedisImageId = imageId(`usageflow-pilot-redis-${runId}`);
    evidence.versions.restoredPostgresImageId = imageId(`usageflow-pilot-restore-pg-${runId}`);
    evidence.versions.restoredRedisImageId = imageId(`usageflow-pilot-restore-redis-${runId}`);
    if (!classifications.absent.some(x => x.key === evidence.deliberatelyLostKey)) throw Error('Deliberately lost accepted event survived backup');
    if (classifications.unresolved.length) throw Error('Unresolved original IDs before replay');
    const oldest = classifications.absent.map(x => Date.parse(x.acceptedAt)).sort()[0];
    evidence.preReplay.backupGapSeconds = (Date.parse(evidence.clocks.outageStart) - Date.parse(evidence.clocks.snapshotCompletion)) / 1000;
    evidence.preReplay.consistencyPointToOutageBoundsSeconds = { minimum: (Date.parse(evidence.clocks.outageStart) - Date.parse(evidence.clocks.snapshotCompletion)) / 1000, maximum: (Date.parse(evidence.clocks.outageStart) - Date.parse(evidence.clocks.backupStart)) / 1000 };
    evidence.preReplay.oldestAbsentAcceptanceToOutageSeconds = oldest === undefined ? null : (Date.parse(evidence.clocks.outageStart) - oldest) / 1000;
  } else if (action === 'probe') {
    const key = `restore-probe-${runId}`;
    const payload = JSON.stringify({ customerId: `customer-${runId}`, metric: 'CALLS', amount: 1, timestamp: evidence.occurrenceTime });
    const result = await send(0, process.env.NEXTAUTH_URL, 'probe', { payload }, key);
    if (result.classification !== 'accepted') throw Error(`Probe was not accepted: ${JSON.stringify(result)}`);
    const found = (await rows()).find(row => row.key === key && row.id === result.eventId && row.intent);
    if (!found) throw Error('Accepted probe not durably readable with intent');
    evidence.probe = { key, id: result.eventId, acceptedAndReadBackAt: new Date().toISOString() };
    evidence.ingestionRtoSeconds = (Date.parse(evidence.probe.acceptedAndReadBackAt) - Date.parse(evidence.clocks.outageStart)) / 1000;
  } else if (action === 'replay') {
    const sent = originals(await records());
    evidence.replay = { duplicateOriginalIds: [], replacementIds: [], failed: [] };
    for (const item of sent) {
      const result = await send(Number(item.idempotencyKey.split('-').at(-1)), process.env.NEXTAUTH_URL, 'replay', item);
      if (result.classification !== 'accepted') evidence.replay.failed.push({ key: item.idempotencyKey, result });
      else if (result.eventId === item.outcome?.eventId) evidence.replay.duplicateOriginalIds.push(result.eventId);
      else evidence.replay.replacementIds.push({ key: item.idempotencyKey, originalId: item.outcome?.eventId, replacementId: result.eventId, quantity: item.quantity });
    }
    if (evidence.replay.failed.length) throw Error('Replay failures');
  } else if (action === 'reconcile') {
    const sent = originals(await records());
    const expected = new Map(sent.map(item => [item.idempotencyKey, item]));
    const deadline = Date.now() + Number(process.env.PILOT_RESTORE_DRAIN_SECONDS || 180) * 1000;
    let actual, failures;
    do {
      const allRows = await rows();
      actual = allRows.filter(row => row.key !== evidence.probe.key);
      const byKey = new Map(actual.map(row => [row.key, row])); failures = [];
      const probe = allRows.find(row => row.key === evidence.probe.key);
      if (!probe || !probe.projection || !probe.rating || probe.unrated || probe.rating_retry || probe.rating_failure) failures.push('Probe unfinished');
      if (actual.length !== expected.size || byKey.size !== expected.size) failures.push('Raw count or duplicate keys mismatch');
      for (const [key, item] of expected) {
        const row = byKey.get(key);
        if (!row || row.amount !== item.quantity || row.customer !== `customer-row-${runId}` || row.metric !== 'CALLS' || row.treatment !== 'LEDGER_ONLY' || !row.intent || !row.projection || row.projected_quantity !== item.quantity || !row.rating || row.rated_quantity !== item.quantity || Number(row.rated_amount) !== item.quantity || row.currency !== 'USD' || row.price_id !== `price-${runId}` || row.state === 'PENDING' || row.state === 'PROCESSING' || row.state === 'FAILED' || row.unrated || row.rating_retry || row.rating_failure) failures.push(`${key}: unfinished or mismatched`);
      }
      for (const item of evidence.preReplay.classifications.survived) if (byKey.get(item.key)?.id !== item.originalId) failures.push(`${item.key}: surviving original ID changed`);
      for (const item of evidence.replay.replacementIds) if (byKey.get(item.key)?.id !== item.replacementId) failures.push(`${item.key}: replacement ID changed`);
      for (const row of actual) if (!expected.has(row.key)) failures.push(`${row.key}: unexpected row`);
      if (!failures.length) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    } while (Date.now() < deadline);
    const summary = summarizeRows(actual);
    const expectedQuantity = sent.reduce((n, item) => n + item.quantity, 0);
    const groups = groupRows(actual);
    for (const item of sent) {
      const key = `org-${runId}|customer-row-${runId}|${item.metric}|${item.occurrenceTime.slice(0, 7)}`;
      const group = groups[key] ||= summarizeRows([]);
      group.expectedCount = (group.expectedCount || 0) + 1;
      group.expectedQuantity = (group.expectedQuantity || 0) + item.quantity;
    }
    for (const [key, group] of Object.entries(groups)) if (group.expectedCount !== group.rawCount || group.expectedQuantity !== group.rawQuantity || group.expectedCount !== group.projectedCount || group.expectedQuantity !== group.projectedQuantity || group.expectedCount !== group.ratedCount || group.expectedQuantity !== group.ratedQuantity || group.expectedQuantity !== group.ratedAmount) failures.push(`${key}: group mismatch`);
    const post = { at: new Date().toISOString(), expectedCount: expected.size, expectedQuantity, ...summary, groups, events: actual.map(row => ({ key: row.key, originalId: expected.get(row.key)?.outcome?.eventId || null, restoredId: row.id, organization: row.org, customer: row.customer, metric: row.metric, utcMonth: row.event_month, quantity: row.amount, hasIntent: row.intent, projectedQuantity: row.projected_quantity, ratedQuantity: row.rated_quantity, ratedAmount: Number(row.rated_amount), currency: row.currency, priceVersionId: row.price_id })).sort((a,b) => a.key.localeCompare(b.key)), remainingOriginalIdLoss: evidence.preReplay.classifications.absent.map(x => x.originalId).filter(id => !actual.some(row => row.id === id)), replayCreatedReplacementIds: evidence.replay.replacementIds, replayedQuantity: evidence.replay.replacementIds.reduce((n, x) => n + x.quantity, 0), unrecoveredQuantity: expectedQuantity - summary.rawQuantity, failures };
    if ([post.rawQuantity, post.projectedQuantity, post.ratedQuantity, post.ratedAmount].some(n => n !== expectedQuantity)) post.failures.push('Quantity or rating total mismatch');
    evidence.postReplay = post;
    evidence.fullReconciliationRtoSeconds = post.failures.length ? null : (Date.parse(post.at) - Date.parse(evidence.clocks.outageStart)) / 1000;
    const bytes = await readFile(journalPath); evidence.journal = { file: 'restore-journal.jsonl', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    const backup = await readFile(process.env.PILOT_RESTORE_BACKUP); evidence.backup = { file: 'postgres.dump', bytes: backup.length, sha256: createHash('sha256').update(backup).digest('hex') };
    evidence.endedAt = new Date().toISOString();
    if (post.failures.length) throw Error(`Full reconciliation failed: ${post.failures.slice(0, 5).join('; ')}`);
  } else throw Error('Invalid restore action');
} catch (error) { evidence.failures.push({ action, at: new Date().toISOString(), error: String(error) }); process.exitCode = 1; }
finally {
  if (action === 'ingest') {
    const latest = JSON.parse(await readFile(path, 'utf8'));
    latest.occurrenceTime = evidence.occurrenceTime;
    latest.failures.push(...evidence.failures);
    evidence = latest;
  }
  await save();
}
