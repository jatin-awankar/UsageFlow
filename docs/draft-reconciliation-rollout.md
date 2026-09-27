# Draft reconciliation rollout and rollback

The additive migration gives existing snapshots empty `eventOutcomes` and `reconciliation` fields. New calculations capture the accepted event partition, safe reason codes, quantities, and exact rated total together with rated lines. Existing snapshots and legacy Invoices remain intact.

For rollback, deploy the prior BillingRecord application route and leave the new columns and populated snapshots in place. Keep the UsageEvent ledger, LedgerProcessingIntent, RatedEvent, RatingFailure, RatingRetry, UnratedEvent, PriceVersion, and pricing correction evidence. Record current and prior snapshot IDs plus the frozen ledger export ID before rollback so forward recovery can compare the same source state. Do not delete or rewrite accepted events, ratings, or legacy Invoices. Any later schema removal requires a separate evidence export and review.

Keep `CUSTOMER_LINKED_INGESTION_ENABLED` disabled in deployed environments. The disposable acceptance harness enables it only against an isolated database.
