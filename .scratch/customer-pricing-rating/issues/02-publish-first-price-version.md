# 02: Publish and inspect a metric's first PriceVersion

**What to build:** An Organization owner can publish and inspect the first immutable fixed unit price for a metric, with an explicit UTC effective instant and the Organization currency. The first ordinary version follows the same future-effective rule as later versions; earlier events have no applicable price.

**Blocked by:** 01: Set Organization currency and money contract.

**Status:** ready-for-agent

**Delivery:** After ticket 01 is merged, implement this ticket on a dedicated `codex/rating-02-first-price` branch from current `main`. Run its acceptance checks and `git diff --check`; commit and push only this ticket's changes, then open a draft PR against `main` linking the ticket and reporting test results and rollback steps.

- [ ] The owner-facing application path rejects unauthorized or cross-Organization operations, invalid metric, currency mismatch, invalid price, duplicate start, and an effective instant not strictly later than server time plus the ledger's five-minute future-occurrence allowance.
- [ ] Disposable PostgreSQL application tests pin price-input precision, scale, maximum, nonnegative and zero boundaries from ticket 01's money contract.
- [ ] Once a version is published, the owner-facing path rejects an in-place Organization currency change.
- [ ] Published source fields cannot be updated or deleted. Reads show UTC start, creator, creation time, exact price, and currency.
- [ ] Migration adds the schedule with PostgreSQL uniqueness and immutability controls. Rollback preserves published pricing evidence; the deployed Customer-linked ingestion gate remains off.
