# 04: Ingest usage for an active Customer

**What to build:** `POST /api/track` accepts new usage only when the API key's Organization has an active Subscription and an existing active Customer matching the submitted external customer ID. Accepted events retain the raw ID and resolved Customer link, but remain ledger-only until the later Customer billing pipeline is ready.

**Blocked by:** 02: Owner creates a Customer; 03: Protect legacy billing treatment.

**Status:** ready-for-agent

- [ ] The Organization is derived from the API key; an ID belonging only to another Organization cannot be resolved, while identical IDs in two Organizations resolve to their separate Customers.
- [ ] Active Customer plus active Organization Subscription succeeds and stores the Customer link, raw external ID, and compatibility Subscription ID.
- [ ] Missing, blank, unknown, inactive, and cross-Organization-only IDs return a client validation response. Each rejected request is asserted to insert **no UsageEvent**.
- [ ] Creating a Customer without an active Organization Subscription leaves ingestion blocked with the existing `403 No active subscription` response and no UsageEvent.
- [ ] The primary tests exercise the owner-facing creation path, `POST /api/track`, Organization-scoped API keys, and committed rows in a disposable PostgreSQL database. Synthetic SQL constraint tests remain supporting evidence only.
- [ ] Customer-linked ingestion is behind a deployed feature gate that defaults **off**. This ticket does not enable pilot traffic, rate usage, produce a BillingRecord, or change legacy identifiers.
