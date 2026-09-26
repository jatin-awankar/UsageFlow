# 04: Recover and replay ledger processing after worker failure

**What to build:** A restarted worker discovers committed pending ledger work in PostgreSQL, recovers interrupted work, records reviewable failure reasons, and applies each ledger-stage projection once despite repeated execution.

**Blocked by:** 03: Commit acceptance and processing intent atomically.

**Status:** ready-for-agent

- [ ] With disposable PostgreSQL and the real queue and worker, simulate queue loss, worker restart, interruption during `PROCESSING`, duplicate delivery, and retry of `FAILED` work.
- [ ] Reconcile accepted source events to the durable ledger-stage projection. Work may execute more than once, but persisted counts and completion have one effect per event.
- [ ] `PENDING`, `PROCESSING`, `PROCESSED`, and `FAILED` states are visible and recoverable; `FAILED` retains a safe, reviewable reason. `PROCESSED` means completed ledger reconciliation work, not rating or billing.
- [ ] Customer-linked events remain `LEDGER_ONLY` in every processing state and do not enter legacy Subscription aggregation.
- [ ] Add leases, failure details, and projection uniqueness controls additively. On rollback, preserve pending and failed rows for replay; keep the deployed ingestion gate off.
