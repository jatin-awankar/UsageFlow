# 02: Recover delivery from PostgreSQL after queue loss or worker crash

**What to build:** A recovering worker finds committed billing events and due endpoint work from PostgreSQL, even if Redis loses every wakeup or the worker crashes before endpoint selection is recorded.

**Blocked by:** 01: Deliver a committed BillingRecord event to selected endpoints.

**Status:** ready-for-agent

- [ ] A bounded startup and periodic scan discovers committed events lacking durable selection, records the original Organization's selected targets or no-target outcome, and discovers due or expired delivery work. Redis is a wakeup, not the source of truth.
- [ ] Atomically claim work with expiring leases so concurrent workers do not normally send the same attempt. Recover expired claims after a crash, including a crash before selection and a crash after the receiver accepts a request but before success is recorded.
- [ ] Treat an uncertain send as retryable. Any duplicate request after crash recovery retains the original event ID and billing facts and never repeats the underlying finalization or revision.
- [ ] In disposable PostgreSQL with local Redis and a loopback receiver, withhold or kill the worker, remove queued jobs, restart workers, and observe recovery from database state. Include concurrent worker claims and both sides of the HTTP acceptance crash boundary.
- [ ] Validate additive lease and due-state migration plus indexes on disposable PostgreSQL. Document rollback by stopping scanner and claims while preserving selected targets and unfinished work for forward recovery. Keep the deployed gate closed.
- [ ] Use a dedicated implementation branch, run acceptance checks, commit only this ticket, push, and open a draft PR.
