# UsageFlow private pilot specification

Status: agreed product target, not a claim about the current implementation.

The first release serves two or three trusted SaaS teams, initially recruited in India. UsageFlow calculates billing records for comparison with each team's existing process. The records are not tax invoices, payment requests, or authority to charge customers.

One UsageFlow organization represents one SaaS business. Its billed customers are separate organization-scoped accounts. The API key determines the organization; ingestion resolves an existing active customer by that organization's immutable external customer ID.

An accepted usage event has an immutable event ID, customer, metric, positive integer quantity, UTC occurrence time, receipt time, and organization-scoped idempotency key. Identical retries return the original result; a reused key with different billable fields conflicts. Raw accepted events are the reconciliation ledger. UTC calendar-month periods accept late events for 72 hours; later corrections use audited adjustments.

Each metric has one fixed unit price per effective version and an explicit organization currency. Rating uses the price effective at occurrence time. Unrated or unprocessed events block finalization. An owner reviews a draft after the late window and explicitly finalizes it. Finalized monetary records are immutable; corrections create linked revisions with one current version per customer and period.

Finalization and revision durably create `invoice.finalized` or `invoice.revised` webhook events in the same database transaction. Delivery records attempts, retries, terminal failures, and manual replay. Receivers deduplicate by stable event ID. The pilot exposes a ledger export for sender reconciliation and retains billing evidence for a proposed 12 months.

Pilot targets, subject to verification: up to 100,000 accepted events per organization per month, 20,000 per billed customer, and short bursts of 10 events per second; healthy processing within one minute; ingestion restoration within four hours during published support hours. Publish only recovery and capacity guarantees demonstrated by load, restore, and replay drills.

Legacy records remain preserved. Only evidence-backed customer mappings may enter new pilot calculations; ambiguous records remain unmapped and excluded until reviewed and reconciled.
