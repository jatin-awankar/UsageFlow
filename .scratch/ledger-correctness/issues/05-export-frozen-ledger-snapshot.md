# 05: Export a frozen Organization period snapshot

**What to build:** An authorized owner creates a UTC-period reconciliation export whose event rows, processing states, safe failure reasons, and grouped Customer/metric counts and quantities remain fixed across all pages.

**Blocked by:** 04: Recover and replay ledger processing after worker failure.

**Status:** ready-for-agent

- [ ] Create an export through the application API and page through it with a stable cursor. Include accepted event ID, safe key reference, receipt and occurrence times, external Customer ID, metric, quantity, and processing state.
- [ ] While paging, accept later events and let the worker change existing processing states. All pages and grouped counts and quantities from the first export still match its creation snapshot; a new export sees the changes.
- [ ] Tests verify owner authorization, Organization isolation, and exclusion of Customer names, secrets, and unnecessary personal data.
- [ ] Add snapshot storage additively. On application rollback, preserve created snapshots and their consistency; a cursor over mutable live UsageEvents is not an acceptable substitute.
- [ ] Keep the deployed Customer-linked ingestion gate off; the export does not enable pilot billing.
