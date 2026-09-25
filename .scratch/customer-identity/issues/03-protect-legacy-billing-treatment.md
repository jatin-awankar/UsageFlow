# 03: Protect legacy billing treatment

**What to build:** A Customer link alone cannot change a historical UsageEvent's legacy billing treatment. Newly accepted ledger-only events cannot contribute to the legacy subscription aggregate or recorded invoice amount, even when another event later triggers aggregation.

**Blocked by:** 02: Owner creates a Customer.

**Status:** ready-for-agent

- [ ] Billing treatment is independent of the nullable Customer link: existing UsageEvents retain legacy treatment; new Customer-linked events can be explicitly ledger-only.
- [ ] The legacy aggregation path includes legacy-treated events whether or not they have a Customer link and excludes ledger-only events on every recomputation.
- [ ] In a disposable PostgreSQL test, aggregate a synthetic historical event and record the legacy aggregate and invoice amount. Add only a Customer link, recompute, and assert the **recomputed legacy aggregate is unchanged** and the recorded invoice amount is unchanged.
- [ ] Trigger a later recomputation with another legacy-treated event and assert the mapped historical event still contributes its original quantity.
- [ ] Add a ledger-only event, trigger aggregation through another event, and assert the ledger-only quantity contributes nothing to the recomputed legacy aggregate or legacy invoice amount.
- [ ] No production mapping, historical backfill, Customer rating, or BillingRecord calculation is performed.
