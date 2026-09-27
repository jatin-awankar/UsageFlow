# 05: Recover concurrent and retried revision requests

**What to build:** Owners can safely retry corrections after lost responses, while competing corrections against the same predecessor cannot overwrite one another. A delayed retry of the original finalization still returns its original version and event after a revision, without changing the revised current result.

**Blocked by:** 04: Apply one audited linked revision with an atomic outbound event.

**Status:** ready-for-agent

- [ ] Bind a revision request identity to its billable adjustment fields and original version and event. Identical retries return the original committed result; changed fields conflict, even after later revisions.
- [ ] Concurrent revisions with the same expected predecessor produce exactly one new current version. The other request receives a stale-version conflict or, if it is a retry of the committed identity, its own original result. Neither path creates a duplicate adjustment or event.
- [ ] Application-level acceptance tests on disposable PostgreSQL send concurrent owner revisions, simulate a crash or lost response after commit, and retry after commit. Inspect versions, predecessor links, one current pointer, audit records, request bindings, and `invoice.revised` rows.
- [ ] After a successful revision, retry the original finalization request identity. It returns the initial finalized version and original `invoice.finalized` event; the revised version remains current, and no new version, adjustment, pointer change, or event appears.
- [ ] Recheck crash-before-commit recovery across adjustment, version, current-pointer, and outbound-event writes, including a clean retry after rollback. Successful revision and finalization still cannot commit without their respective events.
- [ ] Keep the deployed owner gate off until the separate webhook delivery and recovery path is verified. Application rollback retains all versions, request bindings, adjustments, audit evidence, and outbound events. HTTP delivery, signatures, delivery retries, secret rotation, payments, tax invoices, and historical backfill remain outside this ticket.
- [ ] Create a dedicated branch for this ticket before edits. Run relevant acceptance checks, keep the commit limited to this ticket, then commit, push, and open a draft PR. Report checks that could not run.
