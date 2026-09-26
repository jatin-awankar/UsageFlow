# 01: Set Organization currency and money contract

**What to build:** An Organization owner can set and inspect one explicit ISO 4217 currency. Before any price is accepted, record the exact unit-price precision and scale, quantity and extended-amount limits, multiplication method, rounding mode and rounding point as an implementation contract. Currency cannot change in place after a PriceVersion is published.

**Blocked by:** None (can start immediately).

**Status:** resolved

**Resolution:** Acceptance checks and code review completed in [PR #47](https://github.com/jatin-awankar/UsageFlow/pull/47); merge pending.

**Delivery:** Once this ticket is on `main`, implement it on a dedicated `codex/rating-01-currency` branch from current `main`. Run its acceptance checks and `git diff --check`; commit and push only this ticket's changes, then open a draft PR against `main` linking the ticket and reporting test results and rollback steps.

- [ ] Owner-facing application operations enforce role and Organization scope, reject invalid currency, and never infer currency from legacy Plan prices.
- [ ] The money contract is documented and tested against its declared boundaries before price creation is enabled; it uses exact decimal or integer arithmetic, not binary floating point.
- [ ] Disposable PostgreSQL application tests prove currency validation, owner authorization, and Organization isolation. The documented policy forbids in-place currency change after publication; ticket 02 tests that lock when PriceVersion creation exists.
- [ ] Migration adds currency without assigning an unverified default or changing legacy amounts. Rollback preserves recorded currency decisions and leaves the deployed Customer-linked ingestion gate off.
