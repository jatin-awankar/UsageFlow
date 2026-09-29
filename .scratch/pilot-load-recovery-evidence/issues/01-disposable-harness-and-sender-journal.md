# 01: Run a disposable pilot evidence harness with a durable sender journal

**What to build:** Run the real ingestion API and ledger worker against fresh, run-isolated PostgreSQL and Redis services with synthetic Organizations, active Customers, API keys, subscriptions, metrics, currency, and effective PriceVersions. Preserve every attempted send in a journal outside the database and containers so acceptance and recovery can be compared with what the sender actually observed.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Implement and pass `npm run test:pilot-evidence -- --smoke`: start fresh PostgreSQL and an isolated Redis instance for each run, use unique credentials, ports, and queue names, apply migrations, start the real API and worker, and send synthetic events through `/api/track`. Only child processes enable Customer-linked ingestion; finalization and revision gates stay closed.
- [x] Before each HTTP request, flush a durable journal record with run ID, Organization, external Customer ID, metric, quantity, occurrence time, idempotency key, exact payload, attempt number, and send time. Append response or transport outcome afterward. Classify accepted, rejected, and uncertain responses separately; preserve timed-out and lost-response attempts for later lookup.
- [x] The smoke check verifies identical retry IDs and changed-billable-field conflicts, journal hash and byte length, and cleanup limited to the run's own containers and processes. Retain the journal and any evidence artifacts until review; saved evidence contains synthetic keys and no production secrets.
- [x] Document local prerequisites, executable smoke command, cleanup/rollback command, and how to inspect retained artifacts. Use synthetic data and local services only; do not change production data, deployed configuration, or pilot gates.
- [x] Implement on a dedicated branch for this ticket, run its acceptance checks, commit only this ticket, push, and open a draft PR. Report checks that could not run.

## Comments

- Implemented in draft PR [#82](https://github.com/jatin-awankar/UsageFlow/pull/82), which remains open. Follow-up TDD cycles resolved both review findings: the sender no longer inherits the Customer-linked ingestion flag, and the run-specific cleanup command stops registered process trees while preserving unrelated processes. The smoke, cleanup test, TypeScript check, and changed-file lint pass. Repository-wide lint still fails on the pre-existing unescaped apostrophe in `app/app/[orgId]/settings/page.tsx:70`.
