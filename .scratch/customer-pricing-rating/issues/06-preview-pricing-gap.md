# 06: Preview a Customer-scoped pricing gap

**What to build:** An owner can review a half-open UTC interval with no published price and see the exact eligible UNRATED event IDs for one Organization, metric, and Customer scope before approving a correction.

**Blocked by:** 05: Expose UNRATED outcomes and recover rating work.

**Status:** ready-for-agent

**Delivery:** After ticket 05 is merged, implement this ticket on a dedicated `codex/rating-06-gap-preview` branch from current `main`. Run its acceptance checks and `git diff --check`; commit and push only this ticket's changes, then open a draft PR against `main` linking the ticket and reporting test results and rollback steps.

- [ ] The preview shows the proposed interval, Customer scope, currency, exact eligible IDs, and enough event context for owner review; it cannot include a time where any published PriceVersion applies.
- [ ] Disposable PostgreSQL application tests cover Organization, metric, Customer, and interval boundaries, identical external Customer IDs across Organizations, and cross-Organization event-ID exclusion.
- [ ] The preview makes no rating or published-price change. Any migration is additive; rollback leaves schedules and outcomes untouched, and the deployed Customer-linked ingestion gate remains off.
