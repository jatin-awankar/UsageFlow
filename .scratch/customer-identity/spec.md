# Customer identity and tenant-safe usage ingestion

Status: ready-for-agent

## Problem Statement

An Organization owner cannot yet create a billed Customer as a distinct party. Usage ingestion accepts free-form, optional customer text and can record use without proving that the Customer exists, is active, or belongs to the API key's Organization. This makes new usage hard to attribute safely while legacy identifiers remain ambiguous.

## Solution

An owner creates a Customer with an immutable external customer ID unique within that Organization. New usage requests supply that external ID. UsageFlow derives the Organization from the API key, resolves an existing active Customer in that Organization, and accepts usage only when that resolution succeeds **and the Organization has an active subscription**. Rejected requests create no UsageEvent. Newly accepted Customer-linked events remain ledger-only and do not contribute to legacy subscription billing. Historical events retain their existing legacy billing treatment if a Customer link is added later. Existing raw identifier columns and ambiguous legacy records remain intact and unmapped.

## User Stories

1. As an Organization owner, I want to create a Customer in my Organization, so that new usage has a billed party.
2. As an Organization owner, I want to provide the Customer's external customer ID, so that my system can send its existing stable identifier.
3. As an Organization owner, I want the external ID validated as nonblank and free of surrounding whitespace, so that accidental variants do not create different Customers.
4. As an Organization owner, I want a duplicate external ID in my Organization rejected, so that an event has one unambiguous Customer.
5. As an Organization owner, I want another Organization to be able to use the same external ID, so that tenant identifiers remain independent.
6. As a User who owns two Organizations, I want Customer creation scoped to the Organization I selected, so that one membership never grants access to the other Organization's records by accident.
7. As a non-owner User, I want Customer creation denied by the server, so that billing identities remain owner-controlled.
8. As an Organization owner, I want a Customer's external ID and Organization immutable, so that historical usage cannot silently point to a different party.
9. As an API integrator, I want to send the external customer ID in a usage request, so that UsageFlow can resolve my billed Customer.
10. As an API integrator, I want a request for an active Customer in my API key's Organization accepted, so that its UsageEvent is attributed to the intended Customer.
11. As an API integrator, I want an unknown external ID rejected with a clear validation response, so that I can create or correct the Customer before retrying.
12. As an API integrator, I want an inactive Customer ID rejected, so that retired accounts cannot accrue new usage.
13. As an API integrator, I want an ID belonging only to another Organization rejected, so that possession of an API key cannot cross tenant boundaries.
14. As an API integrator, I want an ID shared by two Organizations resolved only within my API key's Organization, so that identical text never crosses tenants.
15. As an Organization owner, I want rejected requests to leave the usage ledger unchanged, so that failed integrations do not affect totals.
16. As an Organization owner, I want the original external ID retained on accepted new events, so that source events remain traceable alongside the resolved Customer link.
17. As an Organization owner, I want ambiguous legacy events to remain visible but unmapped, so that historical identities are not guessed.
18. As an API integrator, I want Customer creation to leave the active-subscription prerequisite unchanged, so that setup does not misleadingly imply ingestion is ready.
19. As an Organization owner, I want new Customer-linked usage isolated from legacy subscription billing outputs, so that a raw accepted event is not mistaken for a rated Customer calculation.
20. As an Organization owner, I want a later Customer mapping on a historical UsageEvent to leave its legacy billing treatment unchanged, so that reconciliation cannot silently remove usage from an aggregate or alter a recorded invoice.

## Implementation Decisions

- Add a Customer identity with Organization ownership, immutable external ID, active state, and a unique constraint on Organization plus external ID. Different Organizations may use identical external IDs.
- Add a nullable, Organization-consistent Customer reference to existing UsageEvents. The nullable shape preserves legacy rows; new accepted UsageEvents must have a resolved Customer reference. Customer links for subscriptions and invoices remain later work.
- Preserve the existing raw event customer identifier and subscription external identifier columns. Store the submitted external ID as raw event evidence; never reinterpret a user ID or arbitrary legacy value as a billed Customer.
- Use the existing owner-facing application pattern for Customer creation. Authenticate the User and check OWNER membership for the selected Organization on the server. Return a clear duplicate or validation error without creating a Customer.
- Establish billing treatment independently of the nullable Customer link **before** Customer-linked API ingestion. Existing UsageEvents retain legacy treatment by default. New Customer-linked events are explicitly ledger-only. Adding a Customer link to a historical event must not change that event's treatment. The legacy aggregator includes legacy-treated events even if mapped, and excludes ledger-only events even if it runs later for another event on the same subscription. Existing recorded invoice amounts must not change because a historical event gains a Customer link.
- Resolve ingestion by first authenticating the API key, then finding an active Customer by that key's Organization and the submitted external ID. Ignore any caller-supplied Organization claim. The accepted event stores a Customer reference from that lookup; a tenant-consistent database foreign key is the final guard.
- Require an external customer ID on new usage requests. Missing, blank, unknown, inactive, and cross-Organization-only IDs receive a client validation response and commit no UsageEvent. Unknown, inactive, and cross-Organization-only IDs may share the same outward error to avoid disclosing another Organization's Customers.
- Keep an active Organization subscription as a prerequisite for ingestion, using the current `403 No active subscription` response. Customer creation alone does not make an Organization ingest-ready. Retain the subscription ID on accepted UsageEvents only for compatibility with the current schema; the subscription's user-ID-shaped external identifier is not a basis for Customer resolution.
- Do not enqueue legacy aggregation because of a newly accepted ledger-only event. The legacy invoice path consumes aggregates derived only from legacy-treated events. Do not display ledger-only events as rated or included in a Customer BillingRecord. Keep the deployed Customer-linked ingestion feature gate off by default. Pilot enablement belongs to the later Customer rating and BillingRecord work, once its full blockers are known.
- Treat the additive schema proposal as design evidence, not an already-applied production migration. Any production migration plan must preserve rows and pass the restored-copy inventory gate before a data-dependent backfill.

## Testing Decisions

- The primary seam is application-level integration: create Customers through the owner-facing path, send `POST /api/track` with Organization-scoped API keys, and inspect responses and committed UsageEvents in a disposable PostgreSQL database. Test observable behavior rather than mocking the Customer lookup or asserting internal function calls.
- Exercise one User owning two Organizations, identical external IDs across Organizations, duplicate ID within one Organization, and a non-owner creation attempt.
- Exercise active, unknown, inactive, cross-Organization-only, missing, and blank customer IDs. For every rejected ingestion request, assert both its response and absence of a new UsageEvent. For accepted requests, assert the stored Customer belongs to the API key's Organization and the raw external ID is retained.
- Exercise an active Customer in an Organization without an active subscription: assert the existing prerequisite response and no UsageEvent. Creating the Customer must not change this result.
- Before testing Customer-linked API ingestion, seed a synthetic historical legacy-treated event, aggregate it, and record its invoice amount. Add a Customer link to that test event, rerun aggregation, and assert its quantity and the recorded invoice amount remain unchanged. Trigger aggregation later with another legacy-treated event and assert the mapped historical event still contributes. This synthetic test is not a production backfill.
- For a newly accepted Customer-linked event, assert its raw ledger row, retained subscription ID, and explicit ledger-only treatment. Run the legacy worker path, including aggregation triggered later by another legacy-treated event for the same subscription. Assert the ledger-only event contributes nothing to `AggregatedUsage` or a legacy invoice amount, while legacy-treated events still contribute. Assert that no Customer BillingRecord is presented as calculated by this feature.
- Keep the existing synthetic PostgreSQL schema tests as supporting evidence for uniqueness, immutability, nullable legacy links, and compound tenant foreign keys. Their broader subscription and invoice probes are outside this feature. They do not prove HTTP or authorization behavior.
- Use synthetic data and a disposable database. No live database, legacy backfill, or historical invoice attribution is part of these tests.

## Out of Scope

- Event idempotency semantics and recovery; pricing and PriceVersion behavior; Customer invoice calculation, BillingRecord finalization or revisions; webhook redesign. The exclusion guard above is limited to preventing new Customer-linked events from entering existing legacy billing outputs.
- Inventory-driven classification, mapping or backfilling existing usage or subscriptions, assigning historical invoices to Customers, and changing legacy raw identifiers. A synthetic Customer-link update in a disposable database is only a regression test for billing treatment.
- Customer deactivation UI, a management API, bulk import, self-service external ID aliases, or live deployment. An inactive Customer is created as a test fixture for this feature.

## Further Notes

- The current code has no Customer model. Subscription creation writes a User ID into its external customer field; ingestion accepts optional free-form customer text; invoices are subscription-scoped. These are known conflicts, not evidence of a historical Customer mapping.
- Restored-copy inventory and reconciliation must determine per-Organization identifier categories, independently evidenced mappings, ambiguous subscriptions, invoice attribution, duplicate periods, and cross-Organization inconsistencies before any backfill decision. Until then, ambiguous records remain unmapped and excluded from new Customer-based calculations. Do not size or publish a historical backfill implementation ticket until those counts and the Customer billing design are available.
