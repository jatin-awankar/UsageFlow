# Draft rated-line rollout and rollback

The additive migration adds `lines` and `ratedSources` JSON evidence to `BillingRecordSnapshot`. Existing snapshots retain their prior `sourceEvents` and receive empty arrays for the new fields. New recalculations atomically publish grouped lines and individual rating evidence with a new snapshot; older snapshots remain available.

To roll back application behavior, deploy the prior BillingRecord application route while retaining `BillingRecord`, `BillingRecordSnapshot`, `RatedEvent`, `PriceVersion`, `PricingGapCorrection`, and their source `UsageEvent` rows. Leave the new columns and populated evidence in place for a forward recovery. Do not reverse ratings or approved corrections. Any later schema removal needs a separate export and review of snapshot IDs, source event IDs, rating IDs, price version IDs, correction IDs, quantities, currencies, and exact amounts before deletion.

Keep `CUSTOMER_LINKED_INGESTION_ENABLED` disabled in deployed environments; disposable acceptance tests enable it only for their isolated database.
