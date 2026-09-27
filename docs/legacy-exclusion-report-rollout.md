# Excluded legacy usage report

Owners can open **Billing → Excluded legacy usage** and select a UTC month. The read-only report counts stored `LEGACY` UsageEvents by Organization and metric in the occurrence-time interval `[month start, next month start)`. It intentionally shows no Customer identifiers or monetary amounts. A historical Customer link does not change a `LEGACY` event's exclusion from Customer drafts.

No migration, mapping, backfill, or ingestion flag change is required. Keep `CUSTOMER_LINKED_INGESTION_ENABLED` off in deployed environments. The disposable acceptance test seeds its own PostgreSQL data and leaves that deployed gate off.

To roll back, remove or disable the billing link and report page in the application deployment. Preserve UsageEvents, BillingRecords and snapshots, Invoices, AggregatedUsage, and all other legacy evidence. Do not delete or rewrite records to roll back this read-only report.
