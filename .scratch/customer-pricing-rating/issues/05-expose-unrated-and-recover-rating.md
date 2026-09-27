# 05: Expose UNRATED outcomes and recover rating work

**What to build:** An owner can distinguish ledger processing from rating. An accepted eligible event with no applicable price has a visible UNRATED outcome and stable NO_APPLICABLE_PRICE reason, while transient worker failures remain recoverable.

**Blocked by:** 04: Rate Customer events at occurrence time.

**Status:** resolved

**Resolution:** Acceptance checks and standards/spec review passed in [draft PR #51](https://github.com/jatin-awankar/UsageFlow/pull/51), which remains open. The final disposable PostgreSQL full suite, inventory and money tests, typecheck, focused lint, and `git diff --check` passed.

**Delivery:** After ticket 04 is merged, implement this ticket on a dedicated `codex/rating-05-unrated-recovery` branch from current `main`. Run its acceptance checks and `git diff --check`; commit and push only this ticket's changes, then open a draft PR against `main` linking the ticket and reporting test results and rollback steps.

- [x] Owner-facing reconciliation reads show rating state and safe reason independently of PENDING, PROCESSING, PROCESSED, or FAILED ledger state. UNRATED has null amount and null PriceVersion, never a synthetic zero.
- [x] Disposable PostgreSQL API and real-worker tests cover lost queue dispatch, interruption, restart, sequential and concurrent replay, and a missing-price event that remains visible after ledger projection.
- [x] Repeated work returns the existing outcome without changing rated amount or provenance or creating another rating. A later ordinary PriceVersion does not silently reprice a prior result.
- [x] Migration adds durable recovery state and uniqueness controls without changing ledger or legacy billing semantics. Rollback retains events and reviewable outcomes for replay; the deployed Customer-linked ingestion gate remains off.
