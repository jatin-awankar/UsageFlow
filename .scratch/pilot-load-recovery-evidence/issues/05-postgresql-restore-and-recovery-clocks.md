# 05: Restore PostgreSQL and measure original-ID loss and recovery clocks

**What to build:** Take a timed logical backup during synthetic ingestion, restore it into a fresh local stack, and replay the sender journal. Preserve the distinction between original UsageEvent IDs lost after the backup and usage quantity recreated by replay; measure ingestion restoration and full reconciliation on separate clocks.

**Blocked by:** 01: Run a disposable pilot evidence harness with a durable sender journal; 02: Measure pilot volume and achieved burst throughput.

**Status:** ready-for-agent

- [ ] Implement and pass `npm run test:pilot-evidence -- --restore`: record backup start, consistency point or snapshot completion, finish, outage injection and original API unavailability times, image versions/digests, commands, and whether writes paused. Restore into fresh PostgreSQL with the same schema/application version and clean Redis; let PostgreSQL intents drive recovery.
- [ ] Before replay, classify observed accepted original IDs as survived, absent, or unresolved in disjoint sets. Report absent original IDs and quantity, the backup-to-outage gap, and time from oldest absent acceptance to outage. A deliberately accepted post-backup event must appear as original-ID loss.
- [ ] Replay every journaled attempt with its original key and payload. Preserve pre-replay and post-replay reports showing duplicate responses with surviving IDs, replay-created replacement IDs, quantity recovered, original IDs still absent, unrecovered quantity, and final count/quantity/rating reconciliation. Recovered quantity must never erase original-ID loss or imply zero RPO.
- [ ] Define outage start as the earlier of fault injection and original API unavailability. Measure ingestion RTO until the restored API durably accepts and reads back a new probe; measure full-reconciliation RTO until surviving originals and successfully replayed usage have expected projection/rating with no unexplained unfinished records. Report failures/timeouts without inventing finite RTOs.
- [ ] Use synthetic data and fresh local services only; never infer a billed Customer from ambiguous identifiers or `Subscription.externalCustomerId`. Document executable cleanup/rollback limited to run-owned resources, retaining journal and backup artifacts for review. Leave production data and pilot gates untouched.
- [ ] Implement on a dedicated branch for this ticket, run its acceptance checks, commit only this ticket, push, and open a draft PR. Report checks that could not run.
