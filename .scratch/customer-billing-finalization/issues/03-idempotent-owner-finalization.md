# 03: Return stable results for concurrent and retried finalization

**What to build:** An owner whose approval request races another request or loses its response can retry safely. One initial final version and one `invoice.finalized` event remain durable, while the owner receives the stable result of the committed request.

**Blocked by:** 02: Finalize one immutable version with an atomic outbound event.

**Status:** resolved

- [x] Bind each finalization request identity to its billable fields and original version and event. An identical retry returns those original stable IDs; reuse with different billable fields conflicts.
- [x] Concurrent first-time finalization requests cannot create another initial version or event. Define and test the owner-visible result for a race, including a request that finds the record already finalized by a different identity.
- [x] Application-level acceptance tests on disposable PostgreSQL send concurrent owner requests and repeated identical requests, including a simulated crash or lost response after commit but before the response reaches the caller. Inspect persisted versions, current pointer, request binding, and events for exactly-once committed effects.
- [x] Retain the database uniqueness and transactional event guarantees from ticket 02. An application rollback closes the gate and preserves request bindings, versions, and outbound events. The deployed owner gate remains off.
- [x] Create a dedicated branch for this ticket before edits. Run relevant acceptance checks, keep the commit limited to this ticket, then commit, push, and open a draft PR. Report checks that could not run.

## Comments

- Implemented in draft PR [#66](https://github.com/jatin-awankar/UsageFlow/pull/66). Focused disposable PostgreSQL acceptance, typecheck, all repository test scripts, two-axis code review, and `git diff --check` passed. Repository lint has one pre-existing error in the untouched settings page (`react/no-unescaped-entities`). The deployed finalization gate remains closed. Evidence-preserving rollback is documented in `docs/atomic-finalization-rollout.md` and the PR.
