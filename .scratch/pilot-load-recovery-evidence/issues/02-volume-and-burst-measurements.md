# 02: Measure pilot volume and achieved burst throughput

**What to build:** Produce reproducible application-level evidence for one UTC-month workload of 100,000 distinct accepted UsageEvents and a separate short-burst workload. Show actual throughput, accepted unique events versus HTTP attempts, backlog, and independent projection and rating latency outcomes.

**Blocked by:** 01: Run a disposable pilot evidence harness with a durable sender journal.

**Status:** ready-for-agent

- [ ] Implement and pass the explicitly opt-in `npm run test:pilot-evidence -- --volume`: send 100,000 distinct accepted events for one Organization, including at least 20,000 for one active Customer, using deterministic idempotency keys and positive integer quantities that distinguish event counts from quantity totals. Record actual accepted count, receipt window, elapsed time, retries retaining original IDs, and changed-field conflicts. Routine CI runs only a small synthetic smoke workload.
- [ ] Implement and pass the separate `npm run test:pilot-evidence -- --burst`: drive the real API and worker at a requested 10 requests/second for a recorded duration, then report achieved requests and unique acceptances per second, response codes, and backlog. Do not present requested rate as achieved rate.
- [ ] For each accepted original ID, report `projectedAt - receivedAt` and `ratedAt - receivedAt` separately from database timestamps: p50, p95, p99, maximum, count above 60 seconds, missing terminal timestamp counts, and fraction completing both stages within one minute. Record the total accepted-event denominator, clock precision, host/container limits, and resource saturation.
- [ ] The checks use synthetic data and fresh local services, retain journal and results for review, and clean up only their own processes and containers. Document an executable cleanup/rollback command; leave production data and pilot gates untouched.
- [ ] Implement on a dedicated branch for this ticket, run its acceptance checks, commit only this ticket, push, and open a draft PR. Report checks that could not run.
