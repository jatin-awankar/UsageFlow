# Ticket 04 rating rollout and rollback

The migration adds `RatedEvent` and `RatingFailure` evidence tables and source-key indexes. It does not backfill existing events or change Plan, aggregate, or Invoice amounts. Keep `CUSTOMER_LINKED_INGESTION_ENABLED` disabled in deployed environments.

If the worker or application must be rolled back, deploy the previous application and worker while retaining both evidence tables, the source-key indexes, and the ledger occurrence-time guard. Accepted `UsageEvent` rows, ledger projections, ratings, and overflow failures remain available for inspection and a later forward rollout. Do not drop or rewrite those tables as an automatic rollback step. If schema removal is separately approved, first export both evidence tables with their referenced events and PriceVersions, verify counts and IDs, and retain that export for restoration before removing the schema.

`RatingFailure.reason = AMOUNT_OVERFLOW` is a terminal calculation failure under the ticket 01 money limit. It records no monetary amount and is excluded from automatic retry. A missing applicable price records neither a zero nor a failure; ticket 05 adds visible `UNRATED` outcomes and recovery for that case.

## Ticket 05 recovery and rollback

`UnratedEvent` records a completed missing-price decision with `NO_APPLICABLE_PRICE` and no monetary fields. `RatingRetry` records a transient attempt failure and its next retry time. The worker scans processed eligible events without a terminal outcome, even when queue dispatch was lost. Owner reconciliation reads expose ledger and rating states separately. A later ordinary PriceVersion does not trigger a retry of an `UnratedEvent`.

Keep `CUSTOMER_LINKED_INGESTION_ENABLED` off in deployed environments. To roll back application behavior, deploy the previous application and worker while retaining `UnratedEvent`, `RatingRetry`, `RatedEvent`, `RatingFailure`, and accepted events. The previous worker may repeatedly scan missing-price events because it does not know `UnratedEvent`; it will not assign a synthetic zero or change rated evidence. For a forward recovery, redeploy the ticket 05 worker and let it scan persisted events. Do not drop the evidence tables during an application rollback. Schema removal requires a separate reviewed export and reconciliation of event IDs and outcome counts.
