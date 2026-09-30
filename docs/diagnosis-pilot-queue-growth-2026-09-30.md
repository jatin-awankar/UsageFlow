# Disposable queue-growth diagnosis — 2026-09-30

The retained production-like run `85f97452-32c` remains **failed** on the one-minute processing target: 12,137/100,000 (12.137%) completed projection and rating within 60 seconds. Its sender journal at `/tmp/usageflow-pilot-evidence/85f97452-32c/sender-journal.jsonl` still hashes to SHA-256 `9088860332994951847e967633efc6b0fb32fff5c1b5ffbd82d8e9ab6ac2016f`, matching its retained report. All 100,000 original IDs and 199,999 units reconciled eventually. Nothing here changes that verdict or establishes capacity.

## Repeatable local workload

On branch `codex/pilot-100k-queue-diagnosis`, run `PILOT_DIAGNOSTIC_EVENT_COUNT=20000 WORKER_CONCURRENCY=5 npm run test:pilot-evidence -- --volume`, then repeat with `WORKER_CONCURRENCY=10`. The count override uses eight sender loops and the production build/API and worker, one API process, fresh loopback PostgreSQL 17.6 and Redis 7 containers, and run-scoped synthetic credentials. This diagnostic enables `pg_stat_statements` and PostgreSQL I/O timing only in the disposable PostgreSQL container. It samples BullMQ waiting/active depth every second, durable accepted/projected/rated counts and PostgreSQL activity and statement timing every five seconds, and up to 100 correlated event traces. BullMQ removes completed jobs, so its `completed` count is zero; cumulative durable rated counts represent completed processing, not all BullMQ job completions. The report preserves the sender journal and failures. The containers are removed at exit.

An initial 5,000-event probe (`a7269695-a91`) reconciled 5,000 IDs and 9,999 units and stayed below three seconds of rating latency, but did not show sustained growth. The 20,000-event runs did. Earlier 20,000-event probes `d27cd09b-ec1` (5 slots), `e0e72e8b-bb2` (10 slots), and `afc15cfb-21b` (5 slots) also reconciled 20,000 IDs and 39,999 units each. They lacked identical statement-timing instrumentation; their send-end waiting depths were 961, 2,005, and 3,476 respectively. This variation is why the statement-timed pair below, rather than those probes, is the primary comparison. Every new run's journal byte count and SHA-256 were independently checked against its report, and all six reports list zero failures.

## Matched statement-timed pair

Both runs used the same Apple M5 host (10 logical CPUs, 16 GiB RAM), Docker's 7.817 GiB memory ceiling, no per-container CPU or memory limit, and the same 20,000-event sender, schema, diagnostic sampling, and production process configuration. The sole processing variable was worker concurrency. Runs were sequential, so changing host contention and Docker state remain possible confounders. PostgreSQL point-sampled CPU reached 155.53% and 152.56% respectively; these are not continuous peaks.

| Measure | 5 slots: `1fba4ecf-b1a` | 10 slots: `e36bddf6-ec6` |
| --- | ---: | ---: |
| Accepted originals / resolved IDs / persisted / projected / rated | 20,000 each | 20,000 each |
| Expected / raw / projected / rated quantity and rated amount | 39,999 each | 39,999 each |
| Primary Customer events; unresolved attempts; report failures | 20,000; 0; 0 | 20,000; 0; 0 |
| Sender rate; send duration | 102.67/s; 194.80 s | 106.64/s; 187.54 s |
| Mid-send accepted / durable rated rate (about 10k–18k accepted) | 102.80 / 85.11 per second | 104.11 / 79.86 per second |
| Mid-send accepted-minus-rated backlog, first → last sample | 960 → 2,286 | 1,088 → 2,664 |
| Maximum waiting; waiting at send end | 2,740; 2,740 | 3,434; 3,433 |
| Sampled queue wait p95 | 24.34 s | 27.04 s |
| Worker start→claim / claim→projection / projection→rating p95 | 19 / 6 / 64 ms | 27 / 12 / 141 ms |
| Sampled rating Organization lock wait / rating transaction p95 | 43.6 / 62.6 ms | 125.7 / 140.5 ms |
| PostgreSQL instantaneous lock waiters, maximum | 4 | 8 |
| Rated latency from receipt p95; both stages within 60 s | 24.38 s; 20,000/20,000 | 27.28 s; 20,000/20,000 |

`pg_stat_statements` cumulative execution time at the final sample includes overlapping time in concurrent database sessions. The Organization `FOR NO KEY UPDATE` statement took 415,228 ms across 20,357 calls at five slots (mean 20.4 ms, max 204.5 ms) and 1,319,515 ms across 20,885 calls at ten slots (mean 63.2 ms, max 289.6 ms). The recovery candidate query took 134,354 ms across 109 calls (mean 1,232.6 ms, max 8,041.5 ms) and 127,093 ms across 109 calls (mean 1,166.0 ms, max 7,734.4 ms), respectively. Rated-event inserts took 3,794 and 3,675 ms total. The recovery query runs while the queue grows and may compete for PostgreSQL CPU; the Organization statement's elapsed time includes row-lock waiting. These measurements do not partition CPU time from wait time for every statement. Sampled lock waiters and the worker's rating-lock trace provide the lock-specific evidence.

The paired runs reached 20,000 terminal ratings and zero final database backlog; neither reproduces a one-minute violation. Their send-end queue growth reproduces the accumulation mechanism seen in the retained 100,000-event failure. The smaller runs must not be used as a capacity guarantee.

The earlier production-like run `0fad70d7-1bc` also remains a failed one-minute result (13,389/100,000). The combined retained-evidence check still exits nonzero: 25 runs, four disclosed failed or incomplete outcomes, and missing currently retained burst/fault/export/restore coverage in that evidence root. No failed verdict was overwritten. Polling intervals are scheduled at one and five seconds but can slip under host load; calculations above use actual sample timestamps.

## Testable causes and next gate

1. **Organization-row rating serialization, strongest evidence.** Rating takes a `FOR NO KEY UPDATE` lock per event. Doubling worker slots increased its mean statement time about threefold and sampled p95 lock wait about threefold while durable processing rate fell. Test a billing-safe way to narrow this lock's scope or reduce work inside its transaction, retaining concurrent price-schedule correctness and idempotent rating checks. Increasing worker concurrency is not a supported fix.
2. **Recovery candidate scan, substantial measured database time.** Its query averaged over a second and reached about eight seconds at this ledger size. Test its plan and a bounded scan/index strategy against lost-dispatch and unrated recovery cases. Do not weaken recovery timing without a fault regression.
3. **Sender/host variability.** The offered rate varied from 102.67 to 106.64/s in the matched pair, and prior five-slot waiting depth varied widely. Repeat on representative isolated infrastructure before attributing a small throughput difference to code.

No production algorithm or gate was changed, and no fix is supported by this single bounded-variable comparison. A candidate fix needs a relevant regression check and paired same-host runs with the same telemetry. A promising result must then pass the full 100,000-event, one-minute verification as a separate gate, with accepted IDs and quantities reconciled. Keep pilot traffic closed and PRs unmerged meanwhile.
