# 07: Give owners an Organization-scoped delivery view

**What to build:** An Organization owner can see the state of a BillingRecord event and each selected endpoint, including attempts, terminal failures, and replay cycles, without seeing another tenant's data or secret material.

**Blocked by:** 04: Bound retries and expose attempt history and terminal failure; 05: Replay one terminally failed endpoint; 06: Create and rotate endpoint secrets with a 24-hour receiver overlap.

**Status:** resolved

- [x] Show no-target, pending, delivered, failed, skipped, and mixed target outcomes with clear endpoint-level attempt and replay history. Describe the underlying BillingRecord as a comparison calculation.
- [x] Scope event lookup, endpoint lookup, selected targets, attempt logs, replay, and rotation to the current Organization and current owner authority. Queue identifiers never grant authorization; no secret appears in views or logs.
- [x] With two Organizations, independent Customers and loopback endpoints on disposable PostgreSQL, verify receiver traffic, target selection, views, forged event and endpoint IDs, replay, rotation, and revoked membership remain tenant-isolated.
- [x] Validate any read-model migration on disposable PostgreSQL. Document rollback that removes the view and owner actions without deleting delivery evidence. Keep the deployed gate closed.
- [x] Use a dedicated implementation branch, run acceptance checks, commit only this ticket, push, and open a draft PR.

## Comments

Resolved in draft PR [#77](https://github.com/jatin-awankar/UsageFlow/pull/77), which remains open. The owner view and attempt authorization fixes passed the disposable PostgreSQL and loopback receiver acceptance run, six rendered outcome cases, typechecking, and changed-file lint. The deployed finalization gate remains closed.
