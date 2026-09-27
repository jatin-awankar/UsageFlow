# 06: Preview a Customer-scoped pricing gap

**What to build:** An owner can review a half-open UTC interval with no published price and see the exact eligible UNRATED event IDs for one Organization, metric, and Customer scope before approving a correction.

**Blocked by:** 05: Expose UNRATED outcomes and recover rating work.

**Status:** resolved

**Implementation PR:** [#52](https://github.com/jatin-awankar/UsageFlow/pull/52) (draft, open)

**Delivery:** After ticket 05 is merged, implement this ticket on a dedicated `codex/rating-06-gap-preview` branch from current `main`. Run its acceptance checks and `git diff --check`; commit and push only this ticket's changes, then open a draft PR against `main` linking the ticket and reporting test results and rollback steps.

- [x] The preview shows the proposed interval, Customer scope, currency, exact eligible IDs, and enough event context for owner review; it cannot include a time where any published PriceVersion applies.
- [x] Disposable PostgreSQL application tests cover Organization, metric, Customer, and interval boundaries, identical external Customer IDs across Organizations, and cross-Organization event-ID exclusion.
- [x] The preview makes no rating or published-price change. Any migration is additive; rollback leaves schedules and outcomes untouched, and the deployed Customer-linked ingestion gate remains off.

## Comments

- 2026-09-27: Acceptance checks and two-axis code review passed with no blocking findings. Focused application tests, typecheck, inventory, and repository test scripts passed. The first full-suite pass stopped during ledger-acceptance startup; both ledger-acceptance runs passed on retry, then the remaining scripts passed. No migration or ingestion-gate change was made. Draft PR #52 is open against `main`.
- 2026-09-27: Follow-up review identified that the preview test seeded events and pricing directly. The test now configures currency and publishes the PriceVersion through the owner pages, accepts events through `POST /api/track`, runs the real ledger/rating worker, and previews the resulting outcomes. The focused PostgreSQL suite and typecheck pass.
