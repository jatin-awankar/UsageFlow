# Draft readiness rollout and rollback

The additive migration extends `BillingRecordState` with `READY_FOR_REVIEW`. Recalculation continues to publish one complete append-only snapshot and its current pointer in the same transaction. After the inclusive close, it publishes `READY_FOR_REVIEW` only when every eligible accepted event has a persisted rating and counts, quantities, and monetary lines reconcile. `READY_FOR_REVIEW` is eligibility for owner review; it does not approve, finalize, or emit a webhook.

If persisted ratings unexpectedly span currencies, the recalculation publishes `BLOCKED` with exact totals per currency, a null combined amount, and a comparison that identifies source changes without a monetary delta. This prevents a stale ready snapshot from remaining current and avoids currency conversion or a fictitious combined total. Corrected evidence can become ready on a later recalculation.

An internal line/source reconciliation mismatch also publishes `BLOCKED` with `balanced: false` and retained source and line evidence. An actual publication error still rolls back the transaction and preserves the previous complete current snapshot.

Before rollback, record the affected BillingRecord IDs, current snapshot IDs, and any stable ledger export IDs. Deploy the previous billing-record application route to disable readiness publication, while retaining BillingRecords, snapshots, source evidence, ratings, and the current pointers. The added enum value can remain in PostgreSQL; do not delete or rewrite populated snapshots to remove it. A later constraint or enum cleanup needs a separate evidence-preserving migration and review. Keep deployed `CUSTOMER_LINKED_INGESTION_ENABLED` disabled.
