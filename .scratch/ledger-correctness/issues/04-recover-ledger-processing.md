# 04: Recover and replay ledger processing after worker failure

**What to build:** A restarted worker discovers committed pending ledger work in PostgreSQL, recovers interrupted work, records reviewable failure reasons, and applies each ledger-stage projection once despite repeated execution.

**Blocked by:** 03: Commit acceptance and processing intent atomically.

**Status:** resolved

**Resolution:** Merged in [PR #42](https://github.com/jatin-awankar/UsageFlow/pull/42).

**Delivery:** After ticket 03 is merged, implement this ticket on a dedicated `codex/ledger-04-worker-recovery` branch from current `main`. Run the acceptance checks and `git diff --check`; commit and push only this ticket's changes, then open a draft PR against `main` linking this ticket and reporting test results and rollback steps.

- [ ] With disposable PostgreSQL and the real queue and worker, simulate queue loss, worker restart, interruption during `PROCESSING`, duplicate delivery, and retry of `FAILED` work.
- [ ] Reconcile accepted source events to the durable ledger-stage projection. Work may execute more than once, but persisted counts and completion have one effect per event.
- [ ] `PENDING`, `PROCESSING`, `PROCESSED`, and `FAILED` states are visible and recoverable; `FAILED` retains a safe, reviewable reason. `PROCESSED` means completed ledger reconciliation work, not rating or billing.
- [ ] Customer-linked events remain `LEDGER_ONLY` in every processing state and do not enter legacy Subscription aggregation.
- [ ] Add leases, failure details, and projection uniqueness controls additively. On rollback, preserve pending and failed rows for replay; keep the deployed ingestion gate off.
