# Additive customer schema design

Status: proposal tested on an empty migrated schema with synthetic rows. `scripts/customer-schema-proposal.sql` is a disposable-database design probe, **not** an applied migration. The application and Prisma schema are unchanged.

Add `Customer(id, orgId, externalId, active, createdAt)`. Its external ID is nonblank, has no outer whitespace, and is unique within an organization; another organization may reuse it. The compound `(orgId, id)` key supports tenant-safe foreign keys. A trigger rejects identity changes and deletion; deactivation keeps the external ID reserved.

Add nullable `billedCustomerId` to `UsageEvent`, `Subscription`, and `Invoice`, each with a compound `(orgId, billedCustomerId)` foreign key to Customer. This permits legacy rows to remain unmapped and rejects a customer from another organization. Preserve the existing raw `UsageEvent.customerId` and `Subscription.externalCustomerId` columns without reinterpretation. A future billing record design will replace the current invoice semantics; this proposal does not do that work.

The database cannot resolve an unknown external ID on its own while the old event path still accepts free-form `customerId`. A future ingestion write path must look up an active Customer under the API-key organization and reject an unknown or inactive ID before committing an event. No such path is implemented here.

## Code conflicts

- `actions/subscription/createSubscription.ts` puts `user.id` in `Subscription.externalCustomerId`; the agreed Subscription refers to a billed Customer.
- `app/api/track/route.ts` accepts optional `customerId` text and selects an active subscription by organization; the agreed event requires a known Customer.
- `prisma/schema.prisma` has no Customer or PriceVersion, and `Invoice` is subscription-scoped rather than customer-scoped. Current invoice records are not the agreed BillingRecord.
- Current organization deletion cascades through billing data. The proposed Customer-to-Organization restriction would block that deletion once customers exist; the closure/retention workflow must be resolved before using the schema in production.

## Pending restored-copy inventory

No legacy row is mapped by this proposal. Before creating a production migration or backfill, inventory and reconcile a recent restored copy as described in `docs/customer-model-inventory.md`. The inventory must determine: counts and identifier categories per organization; which raw event identifiers have independent evidence for a Customer mapping; which subscription `externalCustomerId` values are user IDs or otherwise ambiguous; whether invoices can be attributed to a Customer from evidence beyond their subscription; duplicate invoice period groups; and cross-organization inconsistencies. Decide how each unmapped category remains visible and excluded. Preserve original identifiers and record every reviewed mapping decision.

Run the synthetic database checks with `bash scripts/test-customer-schema.sh`. They start a disposable, unexposed local PostgreSQL container from the already available `postgres:17.6-alpine` image, apply the repository migrations, apply the proposal, and test tenant boundaries and unmapped legacy rows. The script never reads `.env` or a database URL.
