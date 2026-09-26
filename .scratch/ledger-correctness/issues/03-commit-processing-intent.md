# 03: Commit acceptance and processing intent atomically

**What to build:** A newly accepted Customer UsageEvent and recoverable `PENDING` ledger work commit together. Queue dispatch may accelerate processing but cannot change the result of a committed acceptance.

**Blocked by:** 02: Resolve Organization-scoped sequential and concurrent retries.

**Status:** ready-for-agent

**Delivery:** After ticket 02 is merged, implement this ticket on a dedicated `codex/ledger-03-processing-intent` branch from current `main`. Run the acceptance checks and `git diff --check`; commit and push only this ticket's changes, then open a draft PR against `main` linking this ticket and reporting test results and rollback steps.

- [ ] Inject a failure between commit and queue dispatch. The API still returns the committed event ID and acceptance result, and PostgreSQL retains visible pending work. An identical retry returns that same result.
- [ ] Inject a database transaction failure. The API never acknowledges an uncommitted UsageEvent or processing intent.
- [ ] Merely inserting an event or dispatching a job leaves it `PENDING`; it is not `PROCESSED`. Processing state remains independent of `LEDGER_ONLY` billing treatment.
- [ ] Add processing state and durable intent storage without changing legacy processing. An application rollback retains committed pending intents for later recovery and leaves the deployed Customer-linked gate off.
