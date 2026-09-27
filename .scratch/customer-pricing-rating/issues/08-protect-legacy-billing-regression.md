# 08: Protect legacy billing through rating and correction

**What to build:** Rating and an approved pricing-gap correction leave legacy Plan, AggregatedUsage, and Invoice values and treatment unchanged, including for historical LEGACY events that happen to gain a Customer link in synthetic test data.

**Blocked by:** 07: Approve and apply a reviewed pricing-gap correction.

**Status:** resolved

**Delivery:** After ticket 07 is merged, implement this ticket on a dedicated `codex/rating-08-legacy-regression` branch from current `main`. Run its acceptance checks and `git diff --check`; commit and push only this ticket's changes, then open a draft PR against `main` linking the ticket and reporting test results and rollback steps.

- [x] A disposable PostgreSQL application test seeds legacy prices, aggregate, and Invoice, then uses the owner pricing path, POST /api/track, real worker, and a gap correction; recorded legacy rows and amounts remain unchanged after normal legacy aggregation is triggered.
- [x] In synthetic test data, linking a historical LEGACY event to a Customer does not make it rating-eligible or alter its aggregate and Invoice treatment. No historical mapping or production backfill is performed.
- [x] Any required guard is additive. Rollback never reclassifies historical records or recalculates legacy billing; the deployed Customer-linked ingestion gate remains off.

## Comments

- 2026-09-27: Focused disposable PostgreSQL regression, typecheck, inventory tests, targeted ESLint, complete shell test sweep, two-axis code review, and `git diff --check` passed. The regression exercises owner pricing, real worker rating, reviewed gap correction, and a worker attempt on a synthetically Customer-linked historical LEGACY event. Rollback removes only the test and harness additions; it does not reclassify historical records or recalculate legacy billing.
