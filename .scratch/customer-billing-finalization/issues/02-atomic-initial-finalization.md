# 02: Finalize one immutable version with an atomic outbound event

**What to build:** Behind the closed pilot gate, an Organization owner can finalize a ready Customer BillingRecord into an immutable comparison calculation. Finalization independently repeats readiness in its own PostgreSQL transaction, records the first final version and one current pointer, and commits its durable `invoice.finalized` event with them.

**Blocked by:** 01: Show fresh owner finalization readiness.

**Status:** resolved

- [x] Require current owner membership, verified Customer scope, and server time strictly after the inclusive close. Re-evaluate eligible ledger and persisted rating evidence under a serialization guard in the finalization transaction; reject stale or blocked evidence with safe current reasons and commit no version or event.
- [x] Freeze complete approved source, line, quantity, reconciliation, currency, exact amount, approver, and approval-time evidence. Database protections prevent later worker recovery, draft recalculation, or direct writes from changing the final version's monetary content.
- [x] Database constraints or equivalent transactional guarantees allow at most one initial final version for a BillingRecord and at most one current final pointer. Concurrent first approvals cannot commit duplicate initial versions or events, even before ticket 03 improves response behavior.
- [x] Insert one stable `invoice.finalized` outbound event in the same transaction as the initial version and pointer. Its fixed payload identifies Organization, BillingRecord, Customer, period, version, currency, and exact amount. No success can commit without the event; do not use the helper that queues HTTP delivery outside this transaction.
- [x] Application-level acceptance tests on disposable PostgreSQL finalize through the owner action with the test gate enabled, inspect persisted version, pointer, and event rows, and force errors before version insertion, pointer advancement, and outbound event insertion. Each aborted transaction leaves no partial finalization; a clean retry succeeds. Include a concurrent database invariant check.
- [x] Read surfaces call the result a BillingRecord comparison calculation, never a tax invoice, payment request, or authority to charge. A seeded legacy Invoice and its `invoice.created` behavior remain unchanged; cross-Organization access is denied.
- [x] Apply only additive schema changes. Document migration validation and application rollback that closes the action gate while retaining final versions, source evidence, and outbound events. Destructive schema removal needs separate review. Keep the deployed gate off.
- [x] Create a dedicated branch for this ticket before edits. Run relevant acceptance checks, keep the commit limited to this ticket, then commit, push, and open a draft PR. Report checks that could not run.

## Comments

- Implemented in draft PR [#65](https://github.com/jatin-awankar/UsageFlow/pull/65). Focused disposable PostgreSQL acceptance, the closed-gate test, typecheck, all repository test scripts, two-axis code review, and `git diff --check` passed. Migration validation and evidence-preserving application rollback are documented in `docs/atomic-finalization-rollout.md`. The PR remains draft and the deployed gate remains closed until webhook delivery and recovery are verified.
