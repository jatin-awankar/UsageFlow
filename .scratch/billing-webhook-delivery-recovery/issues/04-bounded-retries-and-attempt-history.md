# 04: Bound retries and expose attempt history and terminal failure

**What to build:** An owner can diagnose each endpoint's sends and terminal failure while transient failures retry within a fixed, durable bound.

**Blocked by:** 02: Recover delivery from PostgreSQL after queue loss or worker crash.

**Status:** ready-for-agent

- [ ] Record every network attempt's start, endpoint, time, safe outcome, response code or safe error, and duration without secrets or unbounded response bodies. Count an uncertain send as an attempt and keep history across recovery.
- [ ] Use a five-second request timeout and at most five automatic attempts per endpoint per cycle. Retry timeout, connection failure, and every non-2xx response after 1, 2, 4, and 8 minutes; recover missing retry wakeups from durable due state. Stop after a failed fifth attempt.
- [ ] Derive pending, delivered, and failed event outcomes from selected targets; show a mixed success and failure, disabled target, and no-target outcome accurately. A successful endpoint receives no retry because another endpoint failed.
- [ ] With disposable PostgreSQL, controlled time or short test-only intervals, real worker, and loopback receiver, exercise 2xx, 4xx, 5xx, timeout, and connection close. Assert visible attempt history, due timing, terminal failure, and no further automatic sends.
- [ ] Validate additive attempt and cycle migration on disposable PostgreSQL. Document rollback that halts new retries but preserves attempts, due work, and terminal evidence. Keep the deployed gate closed.
- [ ] Use a dedicated implementation branch, run acceptance checks, commit only this ticket, push, and open a draft PR.
