# 07: Protect concurrent recalculation and determine readiness

**What to build:** Concurrent owner recalculations produce one current BillingRecord and a complete current snapshot without duplicated source contributions. At or before the inclusive close, state is `OPEN`; after close, unresolved events or failed reconciliation make it `BLOCKED`, and a fully rated, reconciled draft becomes `READY_FOR_REVIEW`. Recovery and approved correction can move a blocked draft to ready on recalculation. Readiness means eligible for owner review, not finalized or approved.

**Blocked by:** 06: Compare append-only calculation history.

**Status:** ready-for-agent

- [ ] Concurrent recalculations serialize or have equivalent conflict protection; retries do not duplicate contributions, and failed recalculation preserves the prior current snapshot.
- [ ] State uses server time and current evidence; post-close idempotent retry adds no new source event; blocked-to-ready recovery is observable without finalization or webhook creation.
- [ ] A disposable PostgreSQL application-level acceptance test races owner requests against the same Customer/month, runs real workers, exercises unresolved and recovered ratings after close, and inspects one current pointer, consistent persisted evidence, state transitions, and unchanged Invoice data.
- [ ] Migration adds only needed concurrency and lifecycle constraints. Rollback disables the new application behavior while retaining populated BillingRecords, snapshots, and source evidence for recovery; any constraint rollback must preserve those records.
- [ ] Create a dedicated branch before editing; limit the commit to this ticket, run its acceptance check and relevant regression checks, then commit, push, and open a draft PR. Report any checks that could not run.
