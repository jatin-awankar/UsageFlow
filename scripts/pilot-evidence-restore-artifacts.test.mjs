import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

const directory = process.env.PILOT_RESTORE_ASSERT_DIR;
if (!directory) throw Error('PILOT_RESTORE_ASSERT_DIR is required');
const evidence = JSON.parse(await readFile(join(directory, 'restore-evidence.json'), 'utf8'));

test('restore evidence records a measured snapshot completion and backup gap', () => {
  const { backupStart, snapshotCompletion, backupFinish, outageStart } = evidence.clocks;
  assert.ok(Date.parse(backupStart) <= Date.parse(snapshotCompletion));
  assert.ok(Date.parse(snapshotCompletion) <= Date.parse(backupFinish));
  assert.ok(Date.parse(backupFinish) <= Date.parse(outageStart));
  assert.equal(evidence.preReplay.backupGapSeconds, (Date.parse(outageStart) - Date.parse(snapshotCompletion)) / 1000);
});

test('durable ingestion probe has a journaled send and accepted outcome', async () => {
  const journal = (await readFile(join(directory, 'restore-journal.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  const sent = journal.find(record => record.type === 'send' && record.idempotencyKey === evidence.probe.key);
  assert.ok(sent);
  assert.equal(sent.payload, JSON.stringify({ customerId: `customer-${evidence.runId}`, metric: 'CALLS', amount: 1, timestamp: evidence.occurrenceTime }));
  const outcome = journal.find(record => record.type === 'outcome' && record.attempt === sent.attempt);
  assert.equal(outcome?.classification, 'accepted');
  assert.equal(outcome.eventId, evidence.probe.id);
});

test('restored Customer-month and per-event rating evidence reconciles', () => {
  const groupKey = `org-${evidence.runId}|customer-row-${evidence.runId}|CALLS|${evidence.occurrenceTime.slice(0, 7)}`;
  const { backlog, ...totals } = evidence.postReplay.groups[groupKey];
  assert.deepEqual(totals, { expectedCount: 31, expectedQuantity: 61, rawCount: 31, rawQuantity: 61, projectedCount: 31, projectedQuantity: 61, ratedCount: 31, ratedQuantity: 61, ratedAmount: 61 });
  assert.deepEqual(Object.values(backlog), [0, 0, 0, 0, 0, 0]);
  assert.equal(evidence.postReplay.events.length, 31);
  for (const event of evidence.postReplay.events) {
    assert.equal(event.ratedAmount, event.quantity);
    assert.equal(event.currency, 'USD');
    assert.equal(event.priceVersionId, `price-${evidence.runId}`);
  }
});
