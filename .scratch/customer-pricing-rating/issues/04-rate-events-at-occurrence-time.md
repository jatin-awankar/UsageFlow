# 04: Rate Customer events at occurrence time

**What to build:** An accepted, resolved-Customer LEDGER_ONLY UsageEvent receives one persisted monetary outcome using the PriceVersion effective at its immutable occurrence instant. The outcome shows quantity, exact unit price and amount, currency, rating time, and source PriceVersion.

**Blocked by:** 03: Schedule future PriceVersions.

**Status:** ready-for-agent

**Delivery:** After ticket 03 is merged, implement this ticket on a dedicated `codex/rating-04-rate-events` branch from current `main`. Run its acceptance checks and `git diff --check`; commit and push only this ticket's changes, then open a draft PR against `main` linking the ticket and reporting test results and rollback steps.

- [ ] Through the owner pricing path, POST /api/track, and the real worker on disposable PostgreSQL, tests cover exact effective instants and adjacent instants, late and out-of-order receipt, UTC month boundaries, and multiple versions.
- [ ] Actual rating tests pin exact multiplication, rounding, large valid quantities, amount boundaries, and overflow behavior against ticket 01's contract. A published zero price produces a rated zero.
- [ ] PostgreSQL coordination prevents concurrent ordinary scheduling and rating from changing the applicable price or a persisted result; test the race and rejection of a new schedule that would alter an already rated event.
- [ ] Only resolved-Customer LEDGER_ONLY events are eligible. Tests lightly verify Organization and Customer isolation and that rating does not enter legacy aggregation or Invoices.
- [ ] Migration adds separate durable outcomes with a unique event reference and immutable rated provenance. Rollback preserves accepted events and rating evidence; the deployed Customer-linked ingestion gate remains off.
