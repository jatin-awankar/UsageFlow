# 05: Show late arrivals separately

**What to build:** An owner can inspect events received after the UTC month end and through the inclusive 72-hour close in a separate draft section. Show source ID, occurrence and receipt times, metric, quantity, rating status, amount only when rated, counts and quantities by metric and status, and exact rated late-event contribution. New calculations retain this detail in their snapshots; a late contribution is not presented as every change to the draft total.

**Blocked by:** 03: Show unresolved events and reconcile the ledger.

**Status:** resolved

- [x] An eligible late event stays in its occurrence month, including one received at the exact close instant; acceptance just after close follows the existing ledger rejection rule.
- [x] Late counts, quantities, status, and rated contribution agree with source and reconciliation evidence without duplicating a billable line.
- [x] A disposable PostgreSQL application-level acceptance test uses controlled server time, owner paths, `POST /api/track`, and real workers to cover month end, exact close and just after, out-of-order processing, and exact idempotent retry. It verifies owner detail and persisted snapshot evidence.
- [x] Migration adds late-arrival evidence to new snapshots. Rollback disables its application view while retaining populated tables, snapshots, and source evidence for recovery; ingestion rules remain unchanged.
- [x] Create a dedicated branch before editing; limit the commit to this ticket, run its acceptance check and relevant regression checks, then commit, push, and open a draft PR. Report any checks that could not run.

## Comments

- Implemented on `codex/customer-draft-05-late-arrivals`; draft PR link will be recorded after publication.
