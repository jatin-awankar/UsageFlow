# Ticket 04 rating rollout and rollback

The migration adds `RatedEvent` and `RatingFailure` evidence tables and source-key indexes. It does not backfill existing events or change Plan, aggregate, or Invoice amounts. Keep `CUSTOMER_LINKED_INGESTION_ENABLED` disabled in deployed environments.

If the worker or application must be rolled back, deploy the previous application and worker while retaining both evidence tables and the source-key indexes. Accepted `UsageEvent` rows, ledger projections, ratings, and overflow failures remain available for inspection and a later forward rollout. Do not drop or rewrite those tables as an automatic rollback step. If schema removal is separately approved, first export both evidence tables with their referenced events and PriceVersions, verify counts and IDs, and retain that export for restoration before removing the schema.

`RatingFailure.reason = AMOUNT_OVERFLOW` is a terminal calculation failure under the ticket 01 money limit. It records no monetary amount and is excluded from automatic retry. A missing applicable price records neither a zero nor a failure; ticket 05 adds visible `UNRATED` outcomes and recovery for that case.
