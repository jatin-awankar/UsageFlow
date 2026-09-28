# 01: Show fresh owner finalization readiness

**What to build:** An Organization owner can inspect the close instant and request a current, informational readiness result for a Customer BillingRecord. The result explains whether the accepted Customer ledger and persisted rating evidence reconcile. It is never an approval token: finalization must repeat the check inside its own transaction.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Readiness uses server time and is blocked at the inclusive 72-hour close instant; it can become ready only strictly after close. A client-supplied time has no effect outside the disposable test harness.
- [x] The result covers only verified, Organization-scoped Customers and eligible `LEDGER_ONLY` events for the occurrence-time UTC month. Missing, arbitrary, or User-ID-shaped identifiers are not mapped or inferred from Subscriptions or legacy Invoices.
- [x] A fresh read checks ledger pending, processing, and failed states; rating pending, retry, failed, and `UNRATED` states; one rated contribution per eligible event; counts, quantities, source-to-line totals, currency, and exact amounts. It returns safe blocking evidence without leaking another Organization's data.
- [x] A previously ready draft can become blocked by a newly accepted eligible event or changed worker outcome. A later recovery can restore readiness; the earlier result never authorizes finalization.
- [x] Application-level acceptance tests on disposable PostgreSQL use owner paths for setup and reads, the real ledger ingestion endpoint and workers, and controlled server time. They exercise the close boundary, stale-ready cases, worker failures and retries, `UNRATED`, and reconciliation mismatch. They inspect that no final version or outbound event was created.
- [x] Keep the deployed owner finalization and revision gate off. This ticket does not enable either action.
- [x] Create a dedicated branch for this ticket before edits. Run relevant acceptance checks, keep the commit limited to this ticket, then commit, push, and open a draft PR. Report checks that could not run.

## Comments

- Implemented in draft PR [#64](https://github.com/jatin-awankar/UsageFlow/pull/64). Focused PostgreSQL acceptance, typecheck, all repository test scripts, code review, and `git diff --check` passed. The PR remains open; rollback steps are in its description.
