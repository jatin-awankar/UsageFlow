# 04: Apply one audited linked revision with an atomic outbound event

**What to build:** Behind the closed pilot gate, an Organization owner can correct a finalized BillingRecord through an explicit adjustment against the expected current version. The correction preserves the prior version, adds one immutable linked version and audit record, advances the sole current pointer, and commits one durable `invoice.revised` event atomically.

**Blocked by:** 03: Return stable results for concurrent and retried finalization.

**Status:** resolved

- [x] Require current owner membership, an exact expected-current-version match, a reason, and a durable evidence reference. Reject stale versions, unsupported currency changes, ambiguous evidence, silent repricing, and invalid affected lines or source references.
- [x] Record actor, request identity, time, predecessor, previous exact amount, signed delta, revised exact amount, currency, affected evidence, and explanation. Validate exact arithmetic and reconciliation of revised lines and totals.
- [x] Keep every prior final version and its frozen lines readable and unchanged. The new version links to the exact predecessor and becomes the only current version in the adjustment transaction; database protections enforce the linkage and immutability.
- [x] Insert exactly one fixed `invoice.revised` outbound event with Organization, BillingRecord, Customer, period, new and predecessor version IDs, currency, previous and revised exact amounts, and adjustment identity in that same transaction. No revision can commit without its event.
- [x] Application-level acceptance tests on disposable PostgreSQL revise through the owner action with the test gate enabled, inspect persisted versions, pointer, audit evidence, and event rows, and inject errors before adjustment, version, pointer, and event writes complete. Aborted transactions retain the original current version and create no partial adjustment or event. Verify tenant isolation and unchanged legacy Invoice data.
- [x] Use additive migration and constraints. Application rollback closes the gate and retains all prior and revised versions, adjustments, audit evidence, and outbound events. Keep the deployed owner gate off.
- [x] Create a dedicated branch for this ticket before edits. Run relevant acceptance checks, keep the commit limited to this ticket, then commit, push, and open a draft PR. Report checks that could not run.

## Comments

- Implemented in draft PR [#67](https://github.com/jatin-awankar/UsageFlow/pull/67). Focused owner revision and closed-gate acceptance tests on disposable PostgreSQL, typecheck, targeted lint, the full scripted suite, two-axis code review, and `git diff --check` passed. The deployed gate remains closed until webhook delivery and recovery are verified. Evidence-preserving rollback is documented in `docs/atomic-finalization-rollout.md` and the PR.
