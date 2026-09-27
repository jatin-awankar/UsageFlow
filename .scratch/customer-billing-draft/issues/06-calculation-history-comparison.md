# 06: Compare append-only calculation history

**What to build:** An owner can inspect retained calculation snapshots and explain the difference between the current and previous totals. Show added, removed, and newly rated source-event effects; distinguish a late event's rated contribution from changes caused by later rating or recovery. Recalculation atomically publishes a complete new snapshot and leaves the previous current snapshot intact if publication fails. A no-change repeat may return the current snapshot.

**Blocked by:** 05: Show late arrivals separately.

**Status:** ready-for-agent

- [ ] History exposes calculation times, prior totals, exact total differences, and source explanations without treating all changes as late-arrival effects.
- [ ] Each published snapshot contains mutually consistent lines, source evidence, late detail, and reconciliation; failure leaves the prior current pointer and evidence intact.
- [ ] A disposable PostgreSQL application-level acceptance test uses owner paths, `POST /api/track`, and real workers to calculate before and after late acceptance and rating recovery, inspect persisted snapshots and comparison evidence, and verify failure preservation.
- [ ] Migration adds comparison evidence or indexes only as needed to the append-only snapshot model established in ticket 01; no migration of earlier calculations into a new snapshot model is required. Rollback disables history comparison while retaining populated snapshots and source evidence for recovery.
- [ ] Create a dedicated branch before editing; limit the commit to this ticket, run its acceptance check and relevant regression checks, then commit, push, and open a draft PR. Report any checks that could not run.
