# 03: Measure worker and Redis fault recovery against the sender journal

**What to build:** Run a healthy baseline and separate worker-stop, worker-kill-after-claim, Redis job-loss, and Redis outage/restart drills. Show whether committed original UsageEvents reach projection and rating after recovery, including bounded journal replay and uncertain-response classification.

**Blocked by:** 01: Run a disposable pilot evidence harness with a durable sender journal; 02: Measure pilot volume and achieved burst throughput.

**Status:** resolved

- [x] Implement and pass `npm run test:pilot-evidence -- --faults`: run every named scenario with the real API and worker, isolated Redis, and synthetic workload. Record the actual attempted and accepted sample size for every scenario, fault and recovery timestamps, queue backlog, and each checkpoint's pending, processing, failed, unrated, retry, and rating-failure counts.
- [x] Worker interruption uses the existing nonproduction crash seam and lease-expiry behavior; Redis loss proves PostgreSQL intents can requeue unfinished work. Do not edit measured UsageEvents or derived rows to force success.
- [x] After recovery, replay journaled attempts with their original keys and payloads. Reconcile accepted original IDs, raw count and quantity, projection and rating count and quantity, and separately identify replacement IDs if any. Classify no-response attempts through Organization-scoped idempotency lookup; unresolved attempts remain unresolved.
- [x] The check fails on unexplained missing, extra, duplicate, cross-Customer, or mismatched records and on unreported timeouts. Record worker/queue recovery time independently of PostgreSQL restore time.
- [x] Use synthetic data and fresh local services only. Document executable cleanup/rollback that removes only run-owned resources while retaining journal and evidence for review; leave production data and pilot gates untouched.
- [x] Implement on a dedicated branch for this ticket, run its acceptance checks, commit only this ticket, push, and open a draft PR. Report checks that could not run.

## Comments

- 2026-09-29: Draft PR [#84](https://github.com/jatin-awankar/UsageFlow/pull/84) is open. The five named scenarios passed the fault acceptance check with 20 attempted and 20 committed originals each, zero final database/queue backlog, and no unresolved attempts or replacement IDs. Retained run `6f4c0a23-fe6` is documented in `docs/pilot-evidence-faults.md`. The 7 Docker-backed fault regression checks, pilot smoke check, TypeScript, ESLint, shell syntax, and diff check passed. The two-axis code review found no blocking standards or spec gaps; one nonblocking maintainability concern remains in the disposable reporter. Earlier retained runs recorded setup and reporter failures and premature database-only success; the new regression checks cover those failure paths. Volume, PostgreSQL restore, and production recovery targets remain unmeasured; pilot gates stay closed.
