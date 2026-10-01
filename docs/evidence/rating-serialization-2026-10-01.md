# Rating serialization diagnostic (2026-10-01)

This is a performance investigation only. It uses the two completed disposable 20,000-event runs described in [recovery-scan-step-2-2026-10-01.md](recovery-scan-step-2-2026-10-01.md). Both runs used worker concurrency five, one Organization and primary Customer for all 20,000 events, and the same production-mode instrumentation. The rating path was identical in both runs; only the recovery candidate SQL differed. No rating behavior, price publication, or pilot gate changed here.

## Serialization point

`rateCustomerEvent` opens a transaction, reads the event, and obtains `SELECT id FROM "Organization" ... FOR NO KEY UPDATE` before checking existing outcomes, finding the metric and effective price, inserting a `RatedEvent` (or unrated/failure outcome), and deleting a retry. The lock is held until that transaction commits. All five workers rating this one Organization therefore contend on the same row. This lock also protects `publishPrice` and `approvePricingGap`: publication checks for already-rated events before inserting a future price, while a pricing-gap correction verifies reviewed event IDs and creates corrected ratings. Any change to rating lock granularity must preserve that ordering and the resulting price and correction invariants.

## Observed timing

`PILOT_TRACE` records one `rating_timing` event per sampled rating attempt, including time from rating start to requesting the lock (`preLockMs`), time spent awaiting the lock query (`lockWaitMs`), and whole transaction wall time (`transactionMs`). There were 103 attempts for 100 unique sampled IDs in each run; the extra attempts are retries/duplicates. The sample covers one of every 200 original events, so it is not a census of all ratings. Times include Prisma and database round trips; `lockWaitMs` is not a pure PostgreSQL wait-duration counter.

| Rating timing | Original recovery query | Single-join recovery query |
| --- | ---: | ---: |
| Lock query wait p50 / p95 / max | 15.214 / 41.383 / 68.512 ms | 14.527 / 42.599 / 74.622 ms |
| Whole rating transaction p50 / p95 / max | 25.369 / 59.513 / 82.767 ms | 23.780 / 65.475 / 95.947 ms |
| Median lock-query share of transaction | 63.4% | 64.0% |
| Median time after lock query returns, through transaction completion | 8.151 ms | 7.220 ms |

The last row is `transactionMs - preLockMs - lockWaitMs`; it is an approximate remainder, not the lock's exact hold time. The database sampler observed at least one lock waiter in 40 of 42 original-query samples and 41 of 43 single-join samples, with at most three waiters. Its `lock_waiters` count covers all database locks, so that count alone does not identify the Organization row. The rating-specific trace and code identify the contention point.

## Capacity signal and limit

The unpaced sender achieved 119.647 and 119.576 accepted IDs/s. At send end, 15,879 and 14,703 events respectively were rated, leaving 4,121 and 5,297 awaiting rating. Dividing those counts by send duration gives 94.994 and 87.906 rated IDs/s during the send windows; these are broad window averages, not direct service rates. Full-run terminal throughput was 97.919 and 95.318 ratings/s, including drain. The 2.601 ratings/s difference is **not** a reliable estimate of the effect of candidate SQL or lock contention; sequential runs had different host and queue conditions. Faster candidate scans did not remove the growing rating queue.

The evidence supports Organization-row rating serialization as a material bottleneck candidate for this one-Organization workload. It does not establish how much throughput could be gained by changing the lock, or prove that other database work and host contention are negligible. The next controlled experiment should compare the current Organization lock with a correctness-preserving narrower serialization design under matched offered load, include concurrent price publication and correction races, and verify identical rating IDs, versions, amounts, and finalization readiness before any production change. The production-like 100,000-event run remains a separate step 3.
