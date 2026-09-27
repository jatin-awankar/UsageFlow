# Customer monthly draft BillingRecords

Status: ready-for-agent

## Problem Statement

An Organization can inspect accepted Customer usage and individual ratings, but cannot review a monthly calculation for one Customer. Owners need a trustworthy draft that explains every included amount, shows usage still awaiting processing or rating, and reconciles to the accepted ledger before any later finalization decision. Existing Subscription Invoices cannot represent this Customer calculation.

## Solution

Provide one recalculable draft BillingRecord per Organization, Customer, and UTC calendar month. Calculate line quantities and exact amounts solely from eligible rated ledger events in that month. Expose event and PriceVersion or approved pricing-gap correction provenance, alongside counts and quantities for all accepted eligible ledger events, including pending, failed, and `UNRATED` outcomes. Show late arrivals separately through the inclusive 72-hour close, including receipt times and their effect on the total. Retain draft calculation history so owners can explain changes between recalculations. After the window closes, mark a fully reconciled draft `READY_FOR_REVIEW`; unresolved events keep it visibly blocked. No calculation finalizes a record.

## User Stories

1. As an Organization owner, I want a draft for each Customer and UTC month, so that I can review that Customer's usage before a later billing decision.
2. As an owner, I want month boundaries shown in UTC, so that events at the boundary are assigned predictably.
3. As an owner, I want occurrence time to choose the month, so that delayed processing does not move usage to another period.
4. As an owner, I want late events accepted through the 72-hour close included on recalculation, so that the draft reflects the complete permitted ledger.
5. As an owner, I want the draft to show its calculation time and close time, so that I can tell whether more events may arrive.
6. As an owner, I want quantities and amounts grouped by metric and price basis, so that I can explain mixed prices within a month.
7. As an owner, I want each included source event ID and its PriceVersion ID or approved correction ID, so that I can trace every line to evidence.
8. As an owner, I want exact currency and amount calculations, so that rounding does not change individual rated outcomes.
9. As an owner, I want pending and processing events counted and shown, so that an incomplete worker run is not mistaken for a complete bill.
10. As an owner, I want failed ledger or rating work shown with safe reasons, so that I can arrange recovery before review.
11. As an owner, I want `UNRATED` events and their quantities shown without a zero amount, so that missing prices are clear.
12. As an owner, I want rated zero-price events counted as rated, so that a real zero is distinct from `UNRATED`.
13. As an owner, I want source event counts and quantities to reconcile by status, Customer, metric, and period, so that I can compare the draft with the ledger export.
14. As an owner, I want unresolved events to block readiness, so that a partial amount cannot appear complete.
15. As an owner, I want a draft to become ready for review only after close and full reconciliation, so that its state has a clear meaning.
16. As an owner, I want to recalculate a draft without creating duplicate billable lines, so that recovery and late arrivals are safe.
17. As an owner, I want the draft to remain editable by recalculation before finalization exists, so that I can inspect corrected rating outcomes.
18. As an owner, I want another Organization's Customers and drafts inaccessible, so that billing evidence stays tenant scoped.
19. As an owner, I want legacy Invoices and aggregate totals unchanged, so that draft creation does not alter the existing billing path.
20. As an operator, I want unmapped and ambiguous historical events excluded and reported separately, so that they are never silently assigned to a billed Customer.
21. As an integrator, I want an exact idempotent retry to leave draft counts unchanged, so that retransmission does not double bill.
22. As an owner, I want a draft clearly identified as a calculation rather than an invoice or payment request, so that review does not imply a charge.
23. As an owner, I want late-arriving events listed separately with receipt times, counts, and quantities, so that I can see what reached the ledger after the month ended.
24. As an owner, I want the change in rated total caused by late arrivals shown, so that I can explain an increased draft amount.
25. As an owner, I want prior calculation snapshots and their differences retained, so that I can explain every draft recalculation.
26. As an operator, I want unmapped legacy event counts and quantities reported for an Organization and period without Customer attribution, so that ambiguous history remains visible without contaminating a Customer draft.

## Implementation Decisions

- Key a draft uniquely by Organization, billed Customer, and UTC month start. Derive the end as the next UTC month start and select events with occurrence time in the half-open interval `[start, end)`. The close instant is `end + 72 hours`; a new event with receipt time at that instant is eligible under the ledger contract. Use server time for lifecycle state. Capture the calculation snapshot time consistently.
- Source set: accepted `LEDGER_ONLY` UsageEvents with a verified `billedCustomerId`, belonging to the same Organization and Customer, in the occurrence interval. Never infer Customer from raw `customerId`, `Subscription.externalCustomerId`, User IDs, or an Invoice. Legacy events remain on the legacy path even if later linked to a Customer. Preserve all legacy Invoices and their values.
- Include a monetary contribution only for a source event with its persisted RatedEvent outcome. Use the persisted event quantity, rating amount, currency, unit price, and immutable PriceVersion ID, or the explicit approved pricing-gap correction ID where that is the rating provenance. Do not recompute from today's price schedule, Subscription, Plan, or aggregate. Sum exact minor-unit or decimal values without binary floating point or an extra rounding pass; follow the existing money contract.
- Make the draft line and source evidence deterministic: order by metric, price basis, then event occurrence time and ID. Group only compatible currency, metric, and price basis. Retain or expose a stable source-event-to-line mapping and the source rating IDs. A correction-backed rating must be identified as such; do not invent a PriceVersion ID.
- Classify an accepted event as late-arriving when its `receivedAt` is after the UTC month end and no later than the inclusive 72-hour close. In a separate draft section, expose those events' IDs, occurrence and receipt times, metric, quantity, rating status, and amount if rated. Show their counts and quantities by metric and status and their exact rated monetary contribution. Also show the change from the previous calculation's total with added, removed, or newly rated source-event explanations; distinguish a late event's contribution from other changes so it is not falsely credited with every total change.
- Use a consistent PostgreSQL snapshot for source events, ratings, statuses, lines, and reconciliation totals. Store calculation time, period, currency, grouped quantities and amounts, source references, late-arrival detail, and a reconciliation summary together as an append-only draft calculation snapshot. The BillingRecord points to one current snapshot; recalculation atomically publishes a new snapshot and retains prior snapshots and source evidence for comparison. A no-change repeat may return the current snapshot. Concurrent recalculations must serialize or use equivalent conflict protection, and retries must not duplicate contributions. A failed recalculation leaves the prior current snapshot intact.
- Report unmapped and ambiguous legacy event counts and quantities by Organization and UTC period in a separate reconciliation section. Do not include them in any Customer draft's source set, totals, status partition, or monetary amount, even if a historical `LEGACY` event acquired a Customer link. Do not assign these events to a Customer by raw identifier or Subscription.
- Reconciliation begins with every eligible accepted source event, not just rated rows. Partition each source event exactly once into rated, ledger pending/processing, ledger failed, rating pending/retry, rating failed, or `UNRATED`, using durable evidence rather than inferring rating from `PROCESSED`. Expose counts and quantities by category and metric, plus total accepted and total rated. The accepted total must equal the sum of disjoint categories; monetary total must equal the sum of rated source amounts. Safe failure and `UNRATED` reasons are visible without inventing money.
- States: `OPEN` while server time is at or before the inclusive close instant; `BLOCKED` after close if any eligible event lacks a successful rating or reconciliation invariant fails; `READY_FOR_REVIEW` after close only when every eligible source event has one rating and counts and quantities reconcile. Recalculate state from current evidence each time; do not automatically finalize. Display that readiness is review eligibility, not owner approval.
- After the close, accepted events can still gain ratings through worker recovery or an approved pricing-gap correction; recalculation may move a blocked draft to ready. A repeated idempotent retry after close adds no source event. New acceptance after close remains governed by ledger rejection; draft calculation never changes ingestion rules.
- Provide an owner-authorized, Organization-scoped application path to request/recalculate and read a draft, including line evidence, late-arrival detail, calculation history and differences, unresolved-event detail, reconciliation summary, lifecycle state, period and close instants. Expose Organization/period unmapped legacy counts separately from Customer drafts. Avoid exposing raw idempotency keys or secrets. Draft creation must not emit finalization webhooks or alter Invoices.

## Testing Decisions

- Use the owner-approved single application-level integration seam on disposable PostgreSQL. Configure Customer, currency, and PriceVersions through the existing owner paths; accept events through `POST /api/track`; run the real ledger/rating workers; request/recalculate and read the draft through its owner-authorized application path; inspect persisted BillingRecord calculation snapshots and rating evidence. Create the ledger export and draft from the same stable source state, with ingestion and workers quiescent between captures, then compare eligible event IDs, counts, and quantities. An older frozen export is not expected to match a newer draft. Prior art is the ledger acceptance, ledger export, rating, unrated recovery, pricing-gap correction, and legacy billing regression suites. Assert observable behavior and durable records rather than private calculation helpers.
- Test UTC month boundaries, leap month, December to January, occurrence versus receipt time, exact inclusive 72-hour close and just after, late accepted events, out-of-order processing, and post-close idempotent retries. Use controlled server time in the isolated test harness.
- Test multiple Customers and Organizations with reused external IDs and metric keys. Confirm no cross-tenant read or aggregation and no inference from user-ID-shaped or unmapped legacy identifiers.
- Exercise persisted PriceVersion ratings and approved correction ratings, two prices for one metric within the month, exact sums at money limits, and true rated zero. Verify every line's source IDs, basis, quantity, currency, and amount.
- Pause or fail the worker to observe pending, processing, ledger failure, retryable rating failure, terminal rating failure, and `UNRATED`; assert disjoint counts and quantities, safe reasons, zero monetary contribution for unresolved events, and blocked readiness after close. Recover the worker or resolve a gap, recalculate, and assert the transition to ready only when all eligible events are rated.
- Recalculate an `OPEN` draft before and after a late accepted event. Assert its separate receipt time, count, quantity, rated contribution, changed total, and retained prior snapshot; distinguish later rating changes from new late-event contribution. Exercise concurrent requests and assert one current draft per key, no duplicated event contributions, consistent line/reconciliation snapshot, and preservation of the previous calculation if a new one fails.
- Seed a legacy Invoice, aggregate, and `LEGACY` UsageEvent, including a synthetic Customer link, and assert unchanged legacy amounts and exclusion from the draft. Verify unmapped legacy counts and quantities appear only at Organization/period level, with no inferred Customer. Keep the deployed Customer-linked ingestion gate off; enable it only in the disposable test harness.

## Out of Scope

- Owner finalization, immutable finalized revisions, adjustments after close, billing webhooks, payments, tax invoices, and payment requests.
- Historical Customer mapping or backfill, legacy Invoice migration, and automatic attribution of ambiguous records.
- Pilot enablement, production data migration, load certification, and changing the active Subscription ingestion prerequisite.
- New price publishing rules, repricing existing rated outcomes, currency conversion, discounts, taxes, proration, and tiered pricing.

## Further Notes

- `BillingRecord` in the domain glossary is an Organization calculation for a Customer and period, distinct from the existing Subscription `Invoice`. This spec introduces only the draft stage.
- The current schema has UsageEvent, RatedEvent, RatingFailure, UnratedEvent, RatingRetry, and legacy Invoice, but no BillingRecord. `RatedEvent.priceVersionId` may be null for an approved pricing-gap correction; preserve its correction provenance.
- The accepted event ledger and frozen ledger export are reconciliation references. A draft is a recalculable current view, so its totals may differ from an older frozen export. Compare only captures made from a stable, unchanged source state.
