# 01: Accept a valid Customer UsageEvent with a stable receipt

**What to build:** A gated `POST /api/track` request with a nonblank idempotency key and explicit occurrence time commits a `LEDGER_ONLY` UsageEvent and returns its stable event ID and acceptance result. Document canonical billable fields and the time-window contract. This slice alone does not make ingestion safe to enable.

**Blocked by:** None (can start immediately).

**Status:** resolved

**Resolution:** Merged in [PR #38](https://github.com/jatin-awankar/UsageFlow/pull/38).

**Delivery:** Once this ticket is on `main`, implement it on a dedicated `codex/ledger-01-accept-event` branch from current `main`. Run the acceptance checks and `git diff --check`; commit and push only this ticket's changes, then open a draft PR against `main` linking this ticket and reporting test results and rollback steps.

- [ ] Through the API and disposable PostgreSQL, a valid request returns the committed event ID and acceptance result; the row has the resolved Organization and active Customer, metric, positive integer quantity, occurrence and receipt times, and `LEDGER_ONLY` treatment.
- [ ] Missing or blank key, omitted or invalid occurrence time, invalid quantity, and new events outside the permitted window return validation errors and insert no UsageEvent.
- [ ] Tests cover both sides of the UTC month boundary, the inclusive 72-hour arrival close, and exactly five minutes after receipt versus just beyond it. Use one captured server receipt instant for validation and persistence.
- [ ] The active Organization Subscription prerequisite and deployed Customer-linked ingestion gate remain in place and off by default. No pilot traffic is enabled by this ticket.
- [ ] Add nullable ledger fields or compatible defaults without rewriting legacy rows. On application rollback, retain any accepted ledger rows and keep the gate off.
