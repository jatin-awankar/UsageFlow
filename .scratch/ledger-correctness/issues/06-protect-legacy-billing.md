# 06: Protect legacy aggregates and recorded invoices

**What to build:** New Customer-linked ledger events remain outside legacy aggregation and invoice calculations after worker processing and later aggregation triggers. A Customer link alone does not change a historical event's `LEGACY` billing treatment.

**Blocked by:** 04: Recover and replay ledger processing after worker failure.

**Status:** resolved

**Resolution:** Merged in [PR #44](https://github.com/jatin-awankar/UsageFlow/pull/44).

**Delivery:** After ticket 04 is merged, implement this ticket on a dedicated `codex/ledger-06-legacy-regression` branch from current `main`. Run the acceptance checks and `git diff --check`; commit and push only this ticket's changes, then open a draft PR against `main` linking this ticket and reporting test results and rollback steps.

- [ ] Through the ingestion API and disposable PostgreSQL, record a legacy aggregate and invoice amount, accept and process a Customer-linked event, then trigger legacy aggregation. Assert both the **recomputed aggregate** and recorded invoice amount remain unchanged.
- [ ] In synthetic test data, add a Customer link to a historical `LEGACY` event without performing backfill. Assert its billing treatment, recomputed legacy aggregate, and recorded invoice amount remain unchanged.
- [ ] Preserve historical values and the `LEGACY`/`LEDGER_ONLY` distinction. Any added guard is additive; rollback does not reclassify rows or recalculate recorded invoices.
- [ ] Historical mapping, production backfill, and pilot enablement remain outside this ticket; the deployed Customer-linked gate stays off.
