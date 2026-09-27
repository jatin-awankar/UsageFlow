# 07: Approve and apply a reviewed pricing-gap correction

**What to build:** An owner approves a documented unit price for exactly the previewed UNRATED event IDs in a genuine price-free interval. The correction is an immutable exception, separate from the published PriceVersion schedule.

**Blocked by:** 06: Preview a Customer-scoped pricing gap.

**Status:** resolved

**Implementation PR:** [#53](https://github.com/jatin-awankar/UsageFlow/pull/53) (draft, open)

**Delivery:** After ticket 06 is merged, implement this ticket on a dedicated `codex/rating-07-gap-correction` branch from current `main`. Run its acceptance checks and `git diff --check`; commit and push only this ticket's changes, then open a draft PR against `main` linking the ticket and reporting test results and rollback steps.

- [x] Approval records actor, review and approval time, reason, evidence, interval, currency, Organization, metric, Customer scope, exact affected IDs, and resulting rating IDs. Corrected ratings retain correction provenance and exact money under ticket 01's contract.
- [x] One PostgreSQL transaction rechecks the complete reviewed target set and every event's Organization, Customer, metric, interval, LEDGER_ONLY treatment, and UNRATED NO_APPLICABLE_PRICE state, plus absence of a published price anywhere in the interval. No nonenumerated or later event is rated.
- [x] Disposable PostgreSQL application tests reject stale or omitted IDs, a rated event, wrong Customer or Organization or metric, out-of-interval events, and published-price overlap. Rejection is atomic and changes neither outcomes nor PriceVersions.
- [x] Tests lightly verify Organization isolation and unchanged legacy values. Migration preserves an immutable audit trail; rollback preserves corrections and resulting ratings for review, and the deployed Customer-linked ingestion gate remains off.

## Comments

- 2026-09-27: Focused PostgreSQL tests, inventory tests, typecheck, targeted ESLint, two-axis review, and `git diff --check` passed. The full shell-test sweep passed after two test-only fixes were rerun: the proposal-schema harness now excludes this additive migration, and the owner UI review-time assertion no longer compares timestamps from separate review paths. Draft PR #53 includes rollback steps that retain the audit trail and resulting ratings.
