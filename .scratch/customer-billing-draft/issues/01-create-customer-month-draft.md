# 01: Create a Customer/month draft with snapshots

**What to build:** An Organization owner can request and read one draft BillingRecord for a billed Customer and UTC calendar month. Each BillingRecord has a current-snapshot pointer from the start; calculations are append-only, and a repeat with unchanged evidence may return the current snapshot. Show the period, inclusive 72-hour close, calculation time, and state. Use occurrence time and verified billed Customer identity to select accepted `LEDGER_ONLY` events; never infer a Customer from a raw identifier, User, Subscription, or Invoice. `OPEN` applies only while server time is at or before close. A post-close draft is `BLOCKED` until full readiness evaluation is delivered by ticket 07. This is a calculation, not an Invoice or payment request.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Owner-authorized request and read paths are Organization scoped; another Organization cannot read or aggregate the draft, including when external IDs are reused.
- [ ] UTC half-open occurrence periods, leap month and year boundaries, calculation time, close time, one BillingRecord per key, and a current append-only snapshot are observable.
- [ ] A disposable PostgreSQL application-level acceptance test configures Customers through owner paths, accepts events through `POST /api/track`, runs the real ledger worker, and inspects the draft and persisted snapshot. It covers repeat requests, UTC boundaries, pre-close `OPEN`, post-close `BLOCKED`, and tenant isolation with the deployed Customer ingestion gate enabled only in the test harness.
- [ ] Migration adds the BillingRecord identity, append-only calculation snapshots, and current-snapshot linkage without changing legacy Invoices. Rollback disables the new application path while retaining populated draft tables, snapshots, and source evidence for recovery; any schema removal is a separate, explicitly reviewed cleanup.
- [ ] Create a dedicated branch before editing; limit the commit to this ticket, run its acceptance check and relevant regression checks, then commit, push, and open a draft PR. Report any checks that could not run.
