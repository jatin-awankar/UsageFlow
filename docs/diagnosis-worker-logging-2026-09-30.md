# Pilot worker timing diagnosis — 2026-09-30

This is synthetic, local diagnostic evidence on `codex/pilot-rating-lock-diagnostic`, based on PR #92. It does not establish production capacity or open a pilot gate.

## Reproduction and probes

The retained 100,000-event run `5d1346e5-e5a` reconciled all accepted IDs but finished only 86,095 within 60 seconds. Its 100 sampled queue waits reached about 68 seconds at p95, while claim-to-projection was short. The worker log was about 816 MiB and the API log about 364 MiB. The test harness runs `next dev` and its worker in development mode; `lib/prisma.ts` therefore emits every Prisma query, unlike its production setting.

This branch adds sampled rating transaction and Organization-row lock timing. `PILOT_DIAGNOSTIC_QUIET_WORKER=true` suppresses routine worker job logs and worker-only Prisma query logs in nonproduction. It does not change production logging or the API process. The flag is an experiment switch, not a proposed rollout setting.

Run the existing disposable harness with:

```sh
PILOT_DIAGNOSTIC_EVENT_COUNT=10000 WORKER_CONCURRENCY=5 npm run test:pilot-evidence -- --volume
PILOT_DIAGNOSTIC_EVENT_COUNT=10000 WORKER_CONCURRENCY=5 PILOT_DIAGNOSTIC_QUIET_WORKER=true npm run test:pilot-evidence -- --volume
```

## Local observations

All three 10,000-event runs below reconciled accepted IDs, had zero final backlog, and completed every event within 60 seconds. The runs used fresh disposable PostgreSQL and Redis. Values below are per run, not a controlled throughput guarantee.

- Normal logging, `5a3fa723-33b`: 92.7 accepted events/s; rated p50/p99 1,384/2,734 ms; sampled queue-wait p50/p99 1,304/2,619 ms; sampled rating-lock wait p50/p99 21.8/39.4 ms; worker log 86.1 MB.
- Quiet worker, `b68aac3a-501`: 81.7 accepted events/s; rated p50/p99 74/771 ms; sampled queue-wait p50/p99 1/623 ms; sampled rating-lock wait p50/p99 8.4/29.9 ms; worker log 0.17 MB.
- Normal logging again, `e9d7760e-b34`: 81.3 accepted events/s; rated p50/p99 1,863/3,782 ms; sampled queue-wait p50/p99 1,745/3,408 ms; sampled rating-lock wait p50/p99 24.6/46.9 ms; worker log 86.2 MB.

The last two sender rates were close, and the latency increase returned when logging returned. This supports worker logging as a substantial contributor **in the development harness**. The switch removes both routine job logs and Prisma query logs; this experiment does not isolate their individual CPU costs. Prisma query lines account for most of the log volume in the first quiet attempt, which suppressed only routine job logs and still wrote about 85 MB. The observed 20–47 ms sampled lock waits are real contention, but much shorter than the multi-second queue waits in these runs.

Increasing worker concurrency from five to ten in a separate 10,000-event diagnostic did not improve latency: rated p99 was 4,070 ms with ten workers versus 2,984 ms with five, under variable sender and host load. That comparison does not establish an optimal concurrency value.

## Next decision

Do not merge PR #91 or #92 based on these diagnostics. First run a production-like, disposable 100,000-event verification with query logging disabled and bounded operational logs. Keep the sender journal, sampled traces, ID reconciliation, and failure evidence. Compare the result with `5d1346e5-e5a` while recording sender rate and host limits; the changed logging means this is a new environment comparison, not a same-condition speedup claim. If the one-minute target still fails, instrument sustained queue depth and PostgreSQL lock duration at the 100,000-event scale before changing the billing or recovery algorithms.

No production data or deployed gate was changed.
