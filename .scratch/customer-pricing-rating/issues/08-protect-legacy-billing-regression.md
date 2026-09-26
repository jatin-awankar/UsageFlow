# 08: Protect legacy billing through rating and correction

**What to build:** Rating and an approved pricing-gap correction leave legacy Plan, AggregatedUsage, and Invoice values and treatment unchanged, including for historical LEGACY events that happen to gain a Customer link in synthetic test data.

**Blocked by:** 07: Approve and apply a reviewed pricing-gap correction.

**Status:** ready-for-agent

**Delivery:** After ticket 07 is merged, implement this ticket on a dedicated `codex/rating-08-legacy-regression` branch from current `main`. Run its acceptance checks and `git diff --check`; commit and push only this ticket's changes, then open a draft PR against `main` linking the ticket and reporting test results and rollback steps.

- [ ] A disposable PostgreSQL application test seeds legacy prices, aggregate, and Invoice, then uses the owner pricing path, POST /api/track, real worker, and a gap correction; recorded legacy rows and amounts remain unchanged after normal legacy aggregation is triggered.
- [ ] In synthetic test data, linking a historical LEGACY event to a Customer does not make it rating-eligible or alter its aggregate and Invoice treatment. No historical mapping or production backfill is performed.
- [ ] Any required guard is additive. Rollback never reclassifies historical records or recalculates legacy billing; the deployed Customer-linked ingestion gate remains off.
