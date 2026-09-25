# Customer-model inventory (read only)

Run this before designing a customer migration. It reads the current PostgreSQL schema without changing rows or schema. It does **not** infer a billed customer from `Subscription.externalCustomerId`: subscription creation currently stores a user ID there. The schema has no billed-customer table, so every nonblank `UsageEvent.customerId` is still unverified.

## Run safely

1. Prefer a recent restored **local** copy of the database. Do not run migrations against the source database for this inventory.
2. Run `npm run test:inventory` first.
3. Supply a dedicated URL explicitly: `INVENTORY_DATABASE_URL='postgresql://READ_ONLY_USER:REDACTED@localhost:5432/usageflow_copy' npm run inventory:customer-model > inventory.json`. Do not commit the URL or report; the report contains organization IDs and operational counts.
4. For live verification later, use a database role with `SELECT` only, obtain the URL through your secret manager, and run during an agreed low-traffic window. The script never loads `.env` or falls back to `DATABASE_URL`.

The script opens a PostgreSQL `REPEATABLE READ READ ONLY` transaction, verifies read-only mode, sets query and lock timeouts, and rolls back. A separate connection option defaults the entire session to read only. It reports organization count; per-organization and total subscription, usage-event, and invoice counts; missing or blank identifiers; identifiers matching a current `User.id`; other nonblank unverified identifiers; and duplicate invoice period groups. It emits counts, not raw customer IDs or event payloads.

The categories do **not** prove a mapping. In particular, a nonblank event customer ID is unverified even when it resembles a plausible external ID. A subscription identifier matching `User.id` is a warning. No row is assigned to a new customer. Counts are a snapshot, not a reconciliation of invoice amounts or event quantities.

## Record the baseline

Save the JSON output outside the repository with the capture time, database environment, migration version, and operator. Compare this baseline with a second inventory after the eventual migration. If the source database is live, also collect an independent database backup and sender-side event counts before any cutover. Missing identifiers, duplicate invoice period groups, or changed counts require review; do not auto-map or delete those rows.
