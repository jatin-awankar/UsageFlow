# Draft calculation history rollout and rollback

The additive migration stores comparison evidence in each new `BillingRecordSnapshot` and indexes snapshots by record and calculation time. The owner billing-record path returns the retained snapshots in `history`, with their calculation times, complete source evidence, and each snapshot's comparison to its predecessor. Existing snapshots receive an empty comparison object and remain unchanged.

Recalculation writes the new snapshot and advances `BillingRecord.currentSnapshotId` in one PostgreSQL transaction. An error before commit rolls both changes back, leaving the prior current snapshot and its populated evidence available. A repeat with identical evidence can reuse the current snapshot.

For rollback, deploy the prior billing-record route to disable history comparison. Keep the `BillingRecord` and `BillingRecordSnapshot` tables, the populated `comparison`, `ratedSources`, `sourceEvents`, `lines`, `lateArrivals`, `eventOutcomes`, and `reconciliation` columns, and all current snapshot pointers. Do not delete or rewrite accepted events, ratings, or historical snapshots. Removing the comparison column or index later requires a separate evidence export and review.

Keep `CUSTOMER_LINKED_INGESTION_ENABLED` disabled in deployed environments. The acceptance harness enables it only on disposable PostgreSQL.
