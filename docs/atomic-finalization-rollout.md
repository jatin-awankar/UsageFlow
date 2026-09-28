# Initial BillingRecord finalization rollout

Ticket 02 adds immutable initial versions and durable `invoice.finalized` records. The owner action is closed in production. It can run only in a nonproduction disposable acceptance environment with both `CUSTOMER_BILLING_FINALIZATION_TEST_ENABLED=true` and `CUSTOMER_LINKED_INGESTION_ENABLED=true`. Revision and webhook delivery remain unavailable.

## Migration validation

Apply the additive migration on a recent restored PostgreSQL copy, then run the customer monthly draft acceptance harness. Check that legacy `Invoice` counts, amounts, and `invoice.created` events are unchanged. Confirm that existing BillingRecords have null `currentFinalVersionId`, that the new version table is empty, and that the version, composite pointer, event uniqueness, and immutability constraints are present. The acceptance test exercises owner approval, current evidence, concurrent attempts, transaction failures, and a successful retry.

Before any customer-model backfill, separately run the documented inventory on that restored copy and reconcile Organization, Subscription, UsageEvent, and Invoice counts and identifier classifications. Do not map ambiguous identifiers automatically.

## Application rollback

Keep the action gate closed and roll back the application to the prior release. Retain the additive schema, final versions, approved source evidence, current pointers, and outbound events. Do not delete or rewrite evidence. Schema removal or cleanup needs a separate review and a recovery plan. Delivery and recovery must be verified before any pilot enablement.
