# Frozen ledger export API

An authenticated Organization owner creates a snapshot with `POST /api/ledger-exports` and JSON `{ "orgId": "...", "period": "YYYY-MM" }`. The period is one UTC calendar month, selected by event occurrence time. The response includes the export ID, UTC boundaries, creation time, row count, and Customer/metric count and quantity totals.

Read pages with `GET /api/ledger-exports/{id}?orgId={orgId}`. Pass `nextCursor` as the `cursor` query parameter to fetch the next page. The page size is 100. Rows are ordered by occurrence time, then event ID, and include accepted event ID, a short keyed reference to the idempotency key, occurrence and receipt times, external Customer ID, metric, quantity, processing state, and a safe failure code. The raw key, Customer name, metadata, API key, and member data are excluded. Only an owner of the snapshot's Organization can read it.

The export stores rows and totals in the same repeatable-read transaction. Later ingestion or worker changes require a new export. Export rows have no dependency on mutable UsageEvents, so an application rollback can retain and read existing snapshots after the export code is restored. Keep the additive migration and its data during rollback; do not drop the two export tables. The export does not enable Customer-linked ingestion or pilot billing.
