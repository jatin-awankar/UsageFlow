# 02: Resolve Organization-scoped sequential and concurrent retries

**What to build:** An authenticated Organization receives the original event ID and acceptance result for an identical key and canonical billable contents. Changed contents conflict without a new row. Existing-key comparison precedes current Customer, Subscription, and time-window eligibility checks.

**Blocked by:** 01: Accept a valid Customer UsageEvent with a stable receipt.

**Status:** resolved

**Resolution:** Merged in [PR #39](https://github.com/jatin-awankar/UsageFlow/pull/39).

**Delivery:** After ticket 01 is merged, implement this ticket on a dedicated `codex/ledger-02-retries` branch from current `main`. Run the acceptance checks and `git diff --check`; commit and push only this ticket's changes, then open a draft PR against `main` linking this ticket and reporting test results and rollback steps.

- [ ] API and PostgreSQL tests show one event and one original result for sequential and concurrent identical requests; changed external Customer ID, normalized metric, quantity, or occurrence instant returns a distinct conflict and inserts nothing.
- [ ] The same key works independently in two Organizations. PostgreSQL enforces uniqueness on Organization plus key, and concurrent losing requests compare the committed fingerprint before responding.
- [ ] An identical retry after the 72-hour close, Customer deactivation, or Subscription change returns its original result; a changed retry still conflicts. Invalid or unparseable billable contents cannot match an accepted event.
- [ ] Metadata changes on a retry do not alter the original event. Document canonicalization and the 12-month key, fingerprint, and original-result retention contract.
- [ ] Migrate away from the existing global unique key without changing legacy event identities or discarding keys. Reconcile constraints before dropping the global uniqueness. If cross-Organization duplicate keys have been accepted, rollback retains them and uses forward repair; it must not attempt to restore an invalid global constraint.
- [ ] Keep the Customer-linked ingestion gate off for deployed pilot traffic.
