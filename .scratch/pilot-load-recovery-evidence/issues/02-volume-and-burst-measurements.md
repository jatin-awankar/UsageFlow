# 02: Measure pilot volume and achieved burst throughput

**What to build:** Produce reproducible application-level evidence for one UTC-month workload of 100,000 distinct accepted UsageEvents and a separate short-burst workload. Show actual throughput, accepted unique events versus HTTP attempts, backlog, and independent projection and rating latency outcomes.

**Blocked by:** 01: Run a disposable pilot evidence harness with a durable sender journal.

**Status:** resolved

- [x] Implement and pass the explicitly opt-in `npm run test:pilot-evidence -- --volume`: send 100,000 distinct accepted events for one Organization, including at least 20,000 for one active Customer, using deterministic idempotency keys and positive integer quantities that distinguish event counts from quantity totals. Record actual accepted count, receipt window, elapsed time, retries retaining original IDs, and changed-field conflicts. Routine CI runs only a small synthetic smoke workload.
- [x] Implement and pass the separate `npm run test:pilot-evidence -- --burst`: drive the real API and worker at a requested 10 requests/second for a recorded duration, then report achieved requests and unique acceptances per second, response codes, and backlog. Do not present requested rate as achieved rate.
- [x] For each accepted original ID, report `projectedAt - receivedAt` and `ratedAt - receivedAt` separately from database timestamps: p50, p95, p99, maximum, count above 60 seconds, missing terminal timestamp counts, and fraction completing both stages within one minute. Record the total accepted-event denominator, clock precision, host/container limits, and resource saturation.
- [x] The checks use synthetic data and fresh local services, retain journal and results for review, and clean up only their own processes and containers. Document an executable cleanup/rollback command; leave production data and pilot gates untouched.
- [x] Implement on a dedicated branch for this ticket, run its acceptance checks, commit only this ticket, push, and open a draft PR. Report checks that could not run.

## Comments

- 2026-09-29: Implemented on `codex/pilot-evidence-02-volume-burst` in [draft PR #83](https://github.com/jatin-awankar/UsageFlow/pull/83), still open at delivery. The final local volume run accepted 100,000 distinct events, including 20,000 for one Customer, from 100,008 HTTP attempts at 65.344 unique acceptances/second. The separate 10-second burst achieved 10.067 unique acceptances/second. All accepted events ultimately projected and rated, but only 9.18% completed both stages within 60 seconds at volume, so the one-minute processing target failed on this host. Journals, timestamps, resource limits, and earlier failed runs are retained as described in `docs/pilot-evidence-volume-burst.md`. Ticket acceptance checks and two-axis code review passed after review findings were fixed. The final repository sweep passed 12 of 13 scripts; `test:billing-webhook-readiness` repeatedly timed out in its pre-delivery rollback browser login check, while its other sections passed. Pilot gates remain closed; no production capacity guarantee is claimed.
