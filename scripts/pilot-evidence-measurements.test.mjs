import assert from 'node:assert/strict';
import { test } from 'node:test';
import { correlateTraces } from './pilot-evidence-measurements.mjs';

test('correlates sampled stages and counts repeated executions', () => {
  const line = event => `PILOT_TRACE ${JSON.stringify(event)}`;
  const api = line({stage:'api_dispatch',eventId:'one',at:'2026-01-01T00:00:00.000Z',queueEnteredAt:'2026-01-01T00:00:00.010Z'});
  const worker = [
    {stage:'worker_execution',eventId:'one',at:'2026-01-01T00:00:00.020Z'},
    {stage:'durable_claim',eventId:'one',at:'2026-01-01T00:00:00.030Z'},
    {stage:'worker_execution',eventId:'one',at:'2026-01-01T00:00:00.040Z'},
  ].map(line).join('\n');
  const result = correlateTraces(api, worker, new Set(['one']), new Map([['one',{projected:new Date('2026-01-01T00:00:00.050Z'),rated:new Date('2026-01-01T00:00:00.060Z')}]]));
  assert.equal(result.duplicateJobExecutions,1);
  assert.equal(result.samples[0].apiDispatchAt,'2026-01-01T00:00:00.000Z');
  assert.equal(result.samples[0].queueWaitMs,10);
  assert.equal(result.samples[0].claimToProjectionMs,20);
});

test('pairs the last durable claim before projection after a retry', () => {
  const line = event => `PILOT_TRACE ${JSON.stringify(event)}`;
  const api = line({stage:'api_dispatch',eventId:'one',at:'2026-01-01T00:00:00.000Z',queueEnteredAt:'2026-01-01T00:00:00.010Z'});
  const worker = [
    {stage:'worker_execution',eventId:'one',at:'2026-01-01T00:00:00.020Z'},
    {stage:'durable_claim',eventId:'one',at:'2026-01-01T00:00:00.030Z'},
    {stage:'worker_execution',eventId:'one',at:'2026-01-01T00:00:01.020Z'},
    {stage:'durable_claim',eventId:'one',at:'2026-01-01T00:00:01.030Z'},
  ].map(line).join('\n');
  const result = correlateTraces(api, worker, new Set(['one']), new Map([['one',{projected:new Date('2026-01-01T00:00:01.050Z'),rated:new Date('2026-01-01T00:00:01.060Z')}]]));
  assert.equal(result.samples[0].claimToProjectionMs,20);
});
