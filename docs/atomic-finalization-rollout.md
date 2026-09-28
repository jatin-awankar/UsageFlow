# Initial BillingRecord finalization rollout

Ticket 02 adds immutable initial versions and durable `invoice.finalized` records. Ticket 03 adds immutable owner request bindings to the original version and event. Ticket 04 adds linked revisions, immutable adjustments, and durable `invoice.revised` records. Both owner actions are closed in production. They can run only in a nonproduction disposable acceptance environment with both `CUSTOMER_BILLING_FINALIZATION_TEST_ENABLED=true` and `CUSTOMER_LINKED_INGESTION_ENABLED=true`. Webhook delivery remains unavailable.

## Migration validation

Apply the additive migration on a recent restored PostgreSQL copy, then run the customer monthly draft acceptance harness. Check that legacy `Invoice` counts, amounts, and `invoice.created` events are unchanged. Confirm that existing BillingRecords have null `currentFinalVersionId`, that the new version table is empty, and that the version, composite pointer, event uniqueness, and immutability constraints are present. The acceptance test exercises owner approval, current evidence, concurrent attempts, transaction failures, and a successful retry.

For ticket 03, also confirm existing request bindings are empty before the migration, then check the Organization-scoped request key, version and event references, and immutability trigger. The acceptance test covers concurrent first approvals, a response lost after commit, stable retries, conflicting request fields, and a distinct identity finding an already finalized record.

Before any customer-model backfill, separately run the documented inventory on that restored copy and reconcile Organization, Subscription, UsageEvent, and Invoice counts and identifier classifications. Do not map ambiguous identifiers automatically.

For ticket 04, validate the additive adjustment table, predecessor and adjustment foreign keys, sole-successor index, immutable adjustment trigger, pointer progression guard, and deferred revision event guard on a recent restored database copy. Confirm existing initial versions have null predecessor and adjustment IDs. Exercise owner revision and injected failures with the disposable PostgreSQL acceptance harness. Check the old frozen lines and amount, linked new version, sole pointer, audit evidence, and one `invoice.revised` row; legacy Invoice counts and amounts must remain unchanged.

## Application rollback

Keep the action gate closed and roll back the application to the prior release. Retain the additive schema, all prior and revised final versions and frozen lines, approved source evidence, adjustments and audit references, current pointers, immutable request bindings, and outbound events. Do not delete or rewrite evidence or reuse a bound request identity for new approval work. Schema removal or cleanup needs a separate review and a recovery plan. Delivery and recovery must be verified before any pilot enablement.
