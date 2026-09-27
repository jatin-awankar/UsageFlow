# 03: Show unresolved events and reconcile the ledger

**What to build:** An owner sees all eligible accepted source events partitioned exactly once into rated, ledger pending or processing, ledger failed, rating pending or retry, rating failed, or `UNRATED`. Show counts and quantities by metric and status, total accepted and rated, safe failure or unrated reasons, and reconciliation against rated monetary contributions. Unresolved events have no invented zero amount. New calculations retain this evidence in their snapshots.

**Blocked by:** 02: Show rated lines and price provenance.

**Status:** ready-for-agent

- [ ] The accepted count and quantity reconcile with disjoint categories; monetary total equals the exact sum of rated source amounts. Classification uses durable evidence rather than treating `PROCESSED` as rated.
- [ ] An owner can identify unresolved work without raw idempotency keys or secrets, and can compare a draft with a ledger export captured from the same stable source state.
- [ ] A disposable PostgreSQL application-level acceptance test uses owner paths, `POST /api/track`, and real workers; pauses or fails work to observe pending, processing, ledger failure, rating retry and failure, and `UNRATED`; then verifies owner-visible detail and persisted reconciliation evidence. Ingestion and workers are quiescent between export and draft captures.
- [ ] Migration adds unresolved and reconciliation evidence to new snapshots. Rollback disables the new application view while retaining populated tables, snapshots, and source evidence for recovery.
- [ ] Create a dedicated branch before editing; limit the commit to this ticket, run its acceptance check and relevant regression checks, then commit, push, and open a draft PR. Report any checks that could not run.
