# 05: Replay one terminally failed endpoint

**What to build:** A current Organization owner can safely replay one terminally failed target after repairing the receiver, without creating a new billing event or disturbing successful endpoints.

**Blocked by:** 04: Bound retries and expose attempt history and terminal failure.

**Status:** ready-for-agent

- [ ] Require current owner membership and same-Organization event and endpoint selection. Reject a successful, pending, in-flight, foreign, or unselected target.
- [ ] An idempotency key or equivalent guard makes repeated replay requests one new bounded cycle. Audit actor, reason, event, endpoint, and replay time without secrets; preserve prior attempt history.
- [ ] A replay request keeps the original event ID, type, version, and billing facts, and never repeats finalization or revision. Only the selected failed endpoint receives the replay.
- [ ] In disposable PostgreSQL with the real owner action, worker, and loopback receiver, fail an endpoint terminally, replay it, repeat the replay request, and verify the new cycle, old history, stable event ID, and untouched successful endpoint. Test forged IDs and revoked owner membership.
- [ ] Validate additive replay-cycle and audit migration. Document rollback that hides replay while retaining active cycles and history for recovery. Keep the deployed gate closed.
- [ ] Use a dedicated implementation branch, run acceptance checks, commit only this ticket, push, and open a draft PR.
