# 06: Assemble a reproducible pilot load and recovery evidence report

**What to build:** Combine volume, burst, worker/Redis fault, export, and PostgreSQL restore results into one auditable report. Compare actual measurements and sample sizes with the pilot targets while making failures, missing evidence, original-ID loss, and unmeasured targets explicit.

**Blocked by:** 02: Measure pilot volume and achieved burst throughput; 03: Measure worker and Redis fault recovery against the sender journal; 04: Reconcile the owner ledger export at pilot workload; 05: Restore PostgreSQL and measure original-ID loss and recovery clocks.

**Status:** resolved

- [x] Implement and pass `npm run test:pilot-evidence -- --report` against retained synthetic run evidence: list every run, including failures, with commands, commit SHA, UTC timestamps, host and container limits, API/worker configuration, queue and network placement, image versions, saturation, journal and artifact hashes, and actual sample size for every fault drill.
- [x] Show measured values and denominators for 100,000 events per Organization/month, 20,000 per Customer, 10/second bursts, 60-second processing, and four-hour ingestion restoration. Mark each target pass, fail, or unmeasured; keep the 100,000-event run explicitly opt-in outside routine CI.
- [x] Report export creation and pagination separately; show pre-replay original-ID and quantity loss, post-replay remaining original-ID loss and unrecovered quantity, backup gap, and separate worker/queue, ingestion, and full-reconciliation recovery times. Reject a zero-original-ID-loss or zero-RPO claim based solely on recreated quantity.
- [x] The report check fails on omitted scenarios or failed runs, missing hashes or sample sizes, unexplained reconciliation differences, missing original-ID classifications, or absent RTO timeout/failure status. A local pass is scoped to the tested configuration and does not publish a production capacity or recovery guarantee; a separate rollout decision remains necessary.
- [x] Use synthetic evidence and local services only. Document executable cleanup/rollback of run-owned resources while retaining journals and backups until review; leave production data and pilot gates untouched.
- [x] Implement on a dedicated branch for this ticket, run its acceptance checks, commit only this ticket, push, and open a draft PR. Report checks that could not run.

## Comments

- 2026-09-29: Implementation merged in [PR #87](https://github.com/jatin-awankar/UsageFlow/pull/87). Follow-up review found the combined check incorrectly passed with disclosed failed runs and did not require accepted fault-sample counts. The follow-up PR fixes both checks. Seven focused report tests, TypeScript, ESLint, and diff checks pass. The retained corpus contains 42 runs, including 27 failed or incomplete; `--report` now correctly writes the evidence and exits nonzero. This is an evidence verdict, not an implementation test failure or pilot approval. The 100,000-event run still misses the one-minute processing target. Pilot gates remain closed.
