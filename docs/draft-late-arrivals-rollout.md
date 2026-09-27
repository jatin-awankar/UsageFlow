# Draft late-arrival evidence rollout and rollback

The additive migration adds `lateArrivals` to BillingRecordSnapshot. New calculations persist late source event detail, status buckets, and exact rated contribution in the same snapshot as lines and reconciliation. Existing snapshots receive an empty JSON object; they are historical calculations and are not rewritten.

For rollback, deploy the prior BillingRecord application route to remove the late-arrival view. Retain the populated BillingRecord and BillingRecordSnapshot tables, including the new column, every snapshot ID and current-snapshot pointer, UsageEvent receipt and occurrence times, RatedEvent and unresolved outcome evidence, and frozen ledger exports. Do not delete or rewrite accepted events, ratings, or legacy Invoices. A later schema removal requires a separate evidence export and review.

Keep `CUSTOMER_LINKED_INGESTION_ENABLED` disabled in deployed environments. The disposable acceptance harness enables it only against an isolated PostgreSQL database. The migration does not alter ingestion or the inclusive 72-hour acceptance rule.
