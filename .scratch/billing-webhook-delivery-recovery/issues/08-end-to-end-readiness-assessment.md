# 08: Verify delivery and recovery readiness with the deployed gate closed

**What to build:** The team has a repeatable local evidence package for deciding whether BillingRecord delivery and recovery are ready for a separate rollout decision. This ticket does not enable owner finalization or revision in pilot or production traffic.

**Blocked by:** 02: Recover delivery from PostgreSQL after queue loss or worker crash; 03: Sign and document the exact billing-event request; 04: Bound retries and expose attempt history and terminal failure; 05: Replay one terminally failed endpoint; 06: Create and rotate endpoint secrets with a 24-hour receiver overlap; 07: Give owners an Organization-scoped delivery view.

**Status:** ready-for-agent

- [ ] Run the real application and worker against disposable PostgreSQL and local Redis with a loopback receiver. Through the nonproduction owner gate, finalize and revise, then verify one committed event per version, target selection or no-target outcome, exact-body HMAC, retries, recovery, replay, rotation, owner visibility, and tenant isolation.
- [ ] Prove recovery after Redis job loss and crashes before selection, before HTTP send, and after receiver acceptance but before recording success. Duplicates retain event ID and billing facts; no recovery path repeats the underlying billing action.
- [ ] Rehearse migration validation and documented application rollback on a disposable database, retaining committed event and attempt evidence. Check legacy Invoice rows and legacy webhook behavior remain unchanged.
- [ ] Record passing and failing checks, outstanding risks, and evidence for a separate rollout decision. Run the deployed-configuration gate check and confirm owner finalization and revision remain closed; this ticket never opens that gate.
- [ ] Use a dedicated implementation branch, run acceptance checks, commit only this ticket, push, and open a draft PR.
