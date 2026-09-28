# 01: Deliver a committed BillingRecord event to selected endpoints

**What to build:** A committed `invoice.finalized` or `invoice.revised` event selects subscribed active endpoints in its Organization, durably records each selected target or an explicit no-target outcome, and reaches a loopback receiver. The BillingRecord remains a comparison calculation, not a tax invoice, payment request, or charge authorization.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Persist endpoint selection or the no-target outcome before sending. Later endpoint changes cannot redirect an existing event; a disabled selected endpoint has a visible skipped outcome, never a false HTTP success.
- [x] Deliver only after the billing transaction commits. Keep the stored event ID, type, Organization, version reference, and billing payload immutable; delivery never repeats finalization or revision.
- [x] With disposable PostgreSQL, local Redis, the real application and worker, and a loopback HTTP receiver, finalize and revise through the nonproduction owner gate and observe one committed event per version and one request per selected target. Show no-target events explicitly.
- [x] Scope targets and sends to the event's Organization; leave `invoice.created` and other legacy delivery behavior unchanged.
- [x] Validate the additive migration on a disposable database. Document an application rollback that stops new billing-event dispatch while retaining committed events, selected targets, and no-target evidence for later recovery. Keep the deployed owner gate closed.
- [x] Use a dedicated implementation branch, run acceptance checks, commit only this ticket, push, and open a draft PR.

## Comments

- 2026-09-28: Implemented in [PR #70](https://github.com/jatin-awankar/UsageFlow/pull/70), now merged. Checked target selection, no-target and skipped outcomes, Organization isolation, committed delivery, migration, and rollback against the merged code and acceptance harness. `npm run test:billing-webhook-recovery` passed on `main`; no blocking findings remain.
