# 03: Measure worker and Redis fault recovery against the sender journal

**What to build:** Run a healthy baseline and separate worker-stop, worker-kill-after-claim, Redis job-loss, and Redis outage/restart drills. Show whether committed original UsageEvents reach projection and rating after recovery, including bounded journal replay and uncertain-response classification.

**Blocked by:** 01: Run a disposable pilot evidence harness with a durable sender journal; 02: Measure pilot volume and achieved burst throughput.

**Status:** ready-for-agent

- [ ] Implement and pass `npm run test:pilot-evidence -- --faults`: run every named scenario with the real API and worker, isolated Redis, and synthetic workload. Record the actual attempted and accepted sample size for every scenario, fault and recovery timestamps, queue backlog, and each checkpoint's pending, processing, failed, unrated, retry, and rating-failure counts.
- [ ] Worker interruption uses the existing nonproduction crash seam and lease-expiry behavior; Redis loss proves PostgreSQL intents can requeue unfinished work. Do not edit measured UsageEvents or derived rows to force success.
- [ ] After recovery, replay journaled attempts with their original keys and payloads. Reconcile accepted original IDs, raw count and quantity, projection and rating count and quantity, and separately identify replacement IDs if any. Classify no-response attempts through Organization-scoped idempotency lookup; unresolved attempts remain unresolved.
- [ ] The check fails on unexplained missing, extra, duplicate, cross-Customer, or mismatched records and on unreported timeouts. Record worker/queue recovery time independently of PostgreSQL restore time.
- [ ] Use synthetic data and fresh local services only. Document executable cleanup/rollback that removes only run-owned resources while retaining journal and evidence for review; leave production data and pilot gates untouched.
- [ ] Implement on a dedicated branch for this ticket, run its acceptance checks, commit only this ticket, push, and open a draft PR. Report checks that could not run.
