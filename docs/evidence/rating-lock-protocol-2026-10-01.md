# Rating lock protocol experiment (2026-10-01)

This branch tests a lock protocol under disposable PostgreSQL and Redis. It is an experiment, not a pilot capacity claim. The production-like 100,000-event gate remains closed.

## Organization lock inventory

- `worker/processors/rateCustomerEvent.ts` explicitly held `Organization FOR NO KEY UPDATE` through outcome checks, price selection, and rating insertion. Every ordinary rating for one Organization serialized here.
- `actions/pricing/firstPrice.ts` holds the same row lock while validating currency, the latest schedule, and already-rated conflicts before publishing a PriceVersion.
- `lib/pricing-gap-correction.ts` holds the same row lock while re-running the reviewed preview and inserting a correction and its ratings.
- `actions/organization/setCurrency.ts` updates the Organization row. Its database trigger rejects currency changes after any PriceVersion exists. `updateOrganization.ts` updates the name, and `deleteOrganization.ts` deletes the row. These row writes still interact with the retained row locks on publication and correction; ordinary ratings no longer take that row lock.
- `createOrganization.ts` inserts a new row and does not contend for an existing Organization lock. Foreign-key checks on other writes may acquire compatible key-share locks. Database triggers on `RatedEvent`, `RatingFailure`, and `UnratedEvent` also lock their own UsageEvent row; they are separate from the Organization lock.
- `tests/rating.spec.ts` explicitly holds the old Organization row lock as a test barrier. The new race suite uses UsageEvent row barriers instead.

## Protocol and race tests

Ordinary ratings take a transaction-scoped **shared** advisory lock keyed by Organization, then `UsageEvent FOR UPDATE` for their own event. Scheduled price publication and reviewed correction take the corresponding transaction-scoped **exclusive** advisory lock before retaining their existing `Organization FOR NO KEY UPDATE` lock. The advisory key is a namespaced 64-bit PostgreSQL text hash; a collision can cause extra waiting but cannot weaken ordering. Acquiring the advisory lock first gives one order between rating, publication, and correction. The event-row lock prevents two rating workers for one event from both passing the idempotence check, while different events can proceed together. Retaining the Organization row lock on mutations preserves their ordering with currency edits and Organization deletion.

The confirmed public test seams are the real rating worker and the scheduled-price and correction HTTP flows, with disposable PostgreSQL sessions as race barriers and persisted ratings as evidence. The new `scripts/test-rating-lock-protocol.sh` seeds synthetic events and runs four races:

1. Block one event row after its rating starts; a different event in the same Organization must rate before the first row is released. This failed against the original Organization-row rating lock at the unchanged five-second assertion, then passed with the new protocol.
2. Race duplicate worker jobs for one event; both complete, leaving one RatedEvent and no RatingRetry.
3. Block an in-flight rating, submit a scheduled price that would change its result, then release the rating. Publication waits and rejects the change; the original price and one rating remain.
4. Preview a pricing gap, block an incoming unrated event while approval waits, then release it. The reviewed correction rejects the now-stale event set; both events remain unrated and no correction is created.

The two safety races passed on the old protocol before any production lock edit. All four passed on the new protocol. TypeScript also passed.

## Paired 20,000-event observations

The unpaced pair used fresh PostgreSQL 17.6 and Redis 7 containers, one production-mode API, eight sender loops, worker concurrency five, the same single-join recovery query, and the same journal, trace, queue, database, and per-scan instrumentation. The old-lock run temporarily restored only the three production files changed by this protocol from parent commit `fa7d043`, then restored the new files before the next run. Full artifacts are `/tmp/usageflow-rating-lock-old/4a0558db-1ad/` and `/tmp/usageflow-rating-lock-new/785e6d88-cf9/`.

- Old lock: 126.376 accepted IDs/s, 111.212 terminal ratings/s over 179.836 s, 3,060 maximum sampled Redis waiting, 3,052 ratings missing at send end; rating latency p50/p95/p99 11.063/25.596/27.115 s. Sampled rating lock-acquisition p50/p95 was 10.899/32.699 ms.
- New lock: 122.949 accepted IDs/s, 111.574 terminal ratings/s over 179.254 s, 2,006 maximum waiting, 1,881 ratings missing at send end; rating latency p50/p95/p99 10.043/18.334/19.206 s. Sampled lock-acquisition p50/p95 was 1.200/2.388 ms.

The sender was unpaced and achieved 2.7% less offered load in the new run. The 0.362 ratings/s terminal difference does not establish a throughput gain, and the queue and latency differences cannot be attributed to the lock alone. Endpoint host load averages were 3.95/3.06/2.44 and 5.47/4.07/2.99; point-sampled PostgreSQL CPU was 100.11% and 98.80%.

A second pair requested 115 events/s with a diagnostic-only sender pacing option, but neither run achieved the target, so it also did not hold offered load equal. Artifacts are `/tmp/usageflow-rating-lock-paced-old/e8a69bf1-fd4/` and `/tmp/usageflow-rating-lock-paced-new/5542b241-6af/`.

- Old lock: 111.720 accepted IDs/s, 97.136 terminal ratings/s over 205.896 s, 2,969 maximum waiting, 2,965 ratings missing at send end; rating latency p50/p95/p99 3.661/24.970/26.254 s. Sampled lock-acquisition p50/p95 was 15.679/35.770 ms.
- New lock: 101.131 accepted IDs/s, 95.531 terminal ratings/s over 209.357 s, 1,256 maximum waiting, 1,252 ratings missing at send end; rating latency p50/p95/p99 3.613/10.893/11.264 s. Sampled lock-acquisition p50/p95 was 1.387/2.784 ms.

The new run received 9.5% fewer accepted events per second and had lower terminal throughput. It also had a much shorter queue and p95 latency; those observations are confounded by the offered-load difference. Endpoint host load averages were 5.52/4.65/3.52 and 4.72/4.88/3.91; point-sampled PostgreSQL CPU was 78.22% and 100.43%. Each lock-acquisition trace covers 100 or 101 sampled attempts; the old timer measured its Organization row lock, while the new timer includes the shared advisory and event-row acquisitions. Per-scan p50/p95 was 3.028/7.602 versus 4.396/9.799 ms in the unpaced pair, and 3.747/11.528 versus 4.956/11.638 ms in the paced pair.

All four completed runs reconciled 20,000 distinct accepted, persisted, projected, and rated IDs and 39,999 expected/raw/projected/rated units and rated amount. Each had 20,006 HTTP attempts, three same-ID retries, three expected 409 conflicts, no unresolved transport attempts, zero final pending/processing/failed/unrated/retry/rating-failure/queue backlog, and no recorded failures. All 20,000 finished both stages within 60 seconds. Each 16,331,320-byte journal independently matched the report SHA-256: unpaced old `4fcdd0cadc215c4a19a228f733d33827b31a7cfcd8f4cc30dff782640f597ee2`, unpaced new `84d8492fdb7d7c3622e66cddc4e53777c81eede5085c6d9bbcdefcf811c38ec1`, paced old `e91633a80227e48f9f18cefaad51c508b04ecc9fec8b9f842eef1fa19781527d`, paced new `816f75b7ca3c41b621f8efd7d1f04c17b6f59e20d81ac6e7085a37feb69c486f`.

## Checks and decision

The new PostgreSQL race suite (four tests), `scripts/test-unrated-recovery.sh`, `scripts/test-scheduled-price.sh`, and `scripts/test-currency-owner.sh` (five tests) passed. On the first run, `scripts/test-rating.sh` and the owner path of `scripts/test-pricing-gap-preview.sh` failed before reaching rating or correction behavior: both tried to publish fixed September/October 2026 prices, now in the past. A development/test-only `PRICING_TEST_NOW` fixture was added to those two harnesses; production mode always uses the real clock. The pricing-gap suite then passed both tests. The rating suite next reached an assertion that expected the old Organization row lock to block rating; its barrier was updated to the new advisory lock, and the full rating suite passed. TypeScript passed after these changes. These failed intermediate runs are retained in `/tmp/usageflow-lock-rating-suite.log`, `/tmp/usageflow-lock-gap-suite.log`, and `/tmp/usageflow-lock-rating-suite-fixed.log`.

The lock protocol preserves the exercised races and reduces sampled lock acquisition. Neither paired 20,000-event comparison supports an end-to-end throughput gain under equal achieved load. Do not advance to the 100,000-event gate or open the pilot gate from this evidence. A next capacity experiment needs a sender that demonstrably achieves the same offered rate in both runs, plus investigation of the new run's PostgreSQL CPU and API ingestion contention.
