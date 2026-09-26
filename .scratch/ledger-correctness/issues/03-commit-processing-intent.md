# 03: Commit acceptance and processing intent atomically

**What to build:** A newly accepted Customer UsageEvent and recoverable `PENDING` ledger work commit together. Queue dispatch may accelerate processing but cannot change the result of a committed acceptance.

**Blocked by:** 02: Resolve Organization-scoped sequential and concurrent retries.

**Status:** ready-for-agent

- [ ] Inject a failure between commit and queue dispatch. The API still returns the committed event ID and acceptance result, and PostgreSQL retains visible pending work. An identical retry returns that same result.
- [ ] Inject a database transaction failure. The API never acknowledges an uncommitted UsageEvent or processing intent.
- [ ] Merely inserting an event or dispatching a job leaves it `PENDING`; it is not `PROCESSED`. Processing state remains independent of `LEDGER_ONLY` billing treatment.
- [ ] Add processing state and durable intent storage without changing legacy processing. An application rollback retains committed pending intents for later recovery and leaves the deployed Customer-linked gate off.
