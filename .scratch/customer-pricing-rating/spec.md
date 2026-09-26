# Customer pricing and event rating

Status: ready-for-agent

## Problem Statement

An Organization can accept a Customer's UsageEvent into the reconciliation ledger, but cannot state its Customer price for a metric or tell what that event is worth. Existing Plan and PlanMetric prices belong to legacy Subscription billing, have no effective-time history or explicit currency, and must not be used to silently value Customer events. An accepted event without a price needs an honest, reviewable outcome rather than a zero-valued calculation.

## Solution

An Organization sets an explicit currency and publishes one fixed unit price per metric as immutable UTC-effective PriceVersions. Later ordinary price changes are scheduled for the future. Each Customer-linked, ledger-only UsageEvent is rated using the version applicable at its occurrence instant, yielding a persisted, traceable monetary result. If no version applies, the accepted event remains visible as `UNRATED` with a safe reason and no monetary amount. An owner may review and explicitly approve a documented pricing-gap correction for an interval with no applicable published price; that exception can rate only its enumerated `UNRATED` events. Existing Plan, aggregate, and Invoice behavior is preserved. Customer-linked ingestion remains gated off.

## User Stories

1. As an Organization owner, I want to set an explicit billing currency, so that a unit price and event amount have an unambiguous denomination.
2. As an Organization owner, I want one fixed unit price for each metric at a given occurrence time, so that rating is predictable.
3. As an Organization owner, I want to see a metric's price history and scheduled versions in UTC, so that I can explain a calculation.
4. As an Organization owner, I want to schedule a price change for a future instant, so that usage on either side of that instant receives the intended price.
5. As an Organization owner, I want the first price to start at a stated UTC instant, so that earlier accepted events remain visibly unpriced.
6. As an Organization owner, I want published PriceVersions to remain immutable, so that a later edit cannot rewrite the basis of an earlier rating.
7. As an Organization owner, I want duplicate effective instants and conflicting price schedules rejected, so that an event has at most one applicable published price.
8. As an Organization owner, I want pricing operations scoped to my Organization and authorized role, so that another Organization's prices cannot be read or changed through my account.
9. As an Organization owner, I want a clear validation error for invalid currency, price, metric, or effective time, so that I can correct the configuration.
10. As an Organization owner, I want rating to use an event's occurrence time instead of receipt or processing time, so that late and out-of-order events receive the right price.
11. As an Organization owner, I want an event's rated amount, currency, unit price, and source PriceVersion or approved correction visible, so that I can reconcile the result.
12. As an Organization owner, I want an accepted event without an applicable price shown as `UNRATED` with a reason, so that it cannot be mistaken for zero-cost usage.
13. As an Organization owner, I want ledger processing state distinct from rating state, so that `PROCESSED` does not imply that an event was priced.
14. As an Organization owner, I want repeated worker delivery to retain one rating per event, so that retries cannot double-count or change a result.
15. As an Organization owner, I want a reviewed correction to resolve eligible `UNRATED` events in a price-free interval, so that gaps are resolvable without losing events.
16. As an Organization owner, I want a preview of a historical pricing gap and its affected event IDs before approving a correction, so that I can review its scope.
17. As an Organization owner, I want the gap correction to record the actor, reason, evidence, affected interval, and exact `UNRATED` event IDs, so that the exception is auditable.
18. As an Organization owner, I want a gap correction to rate only those reviewed events, so that it cannot silently alter other usage.
19. As an Organization owner, I want correction approval rejected if a published price applies or an affected event is already rated, so that the exception cannot serve as a retroactive price edit.
20. As an Organization owner, I want events outside the correction's Organization, metric, Customer scope, or interval excluded, so that the exception cannot cross account boundaries.
21. As an Organization owner, I want legacy Plans, AggregatedUsage, and Invoices to retain their existing values, so that Customer rating cannot rewrite historical billing.
22. As an operator, I want a recoverable persisted rating outcome for each eligible ledger-only event, so that a worker interruption does not hide unpriced or unrated usage.
23. As an Organization owner, I want the ingestion gate to stay off while this feature is built, so that rating alone does not enable pilot traffic before later billing work.

## Implementation Decisions

- Pricing is Organization-scoped and metric-specific. The Organization has one explicit ISO 4217 currency for this first pricing model; every PriceVersion and rated outcome records that currency. Reject a different currency for a metric rather than mixing denominations. Define a deliberate currency-setting and currency-change policy before implementation: after any published PriceVersion, a currency change requires a separate migration or later design, not an in-place update.
- A PriceVersion contains an immutable metric, currency, exact nonnegative fixed unit price, UTC `effectiveFrom`, creator, and creation time. Monetary storage and multiplication use exact decimal or integer arithmetic with a documented precision, scale, and rounding rule; binary floating point is not a money representation. Zero is a valid explicitly published price and remains distinguishable from `UNRATED`.
- Published versions for a metric are ordered by `effectiveFrom`; each applies on the half-open interval from its start, inclusive, to the next version's start, exclusive. Enforce uniqueness of Organization, metric, and effective instant in PostgreSQL. The version and its source fields cannot be updated or deleted, including after it has been superseded. A scheduled version is already published and immutable; cancellation or replacement is a later policy, not a silent mutation.
- Ordinary new PriceVersions must have an effective instant strictly later than the server's current instant plus the ledger's five-minute future-occurrence allowance. This prevents a new scheduled version from changing the applicable price of an already accepted future-dated event. Creation must also reject any effective instant that would create a new applicable price for an already rated event. Use transactional serialization or equivalent database coordination for schedule creation and rating so a race cannot evade that rule.
- Pricing is configured through an owner-authorized application path with Organization-scoped reads and writes. Do not derive prices from Plan, PlanMetric, Subscription, or `Subscription.externalCustomerId`. Keep the existing active-Subscription ingestion prerequisite and Customer-linked ingestion gate unchanged in this feature.
- Rate only accepted `LEDGER_ONLY` events with a resolved billed Customer and valid metric. The event's immutable `timestamp` is its occurrence instant. Its `receivedAt`, worker execution time, and Subscription period do not select the price. The source event remains immutable; rating is a separate persisted outcome with a unique event reference, Organization and Customer identity, status, and provenance.
- A rated outcome stores quantity, selected PriceVersion ID, unit price, currency, exact extended amount, and rating time. It is immutable once recorded. No price, including a later ordinary scheduled version, silently reprices an already rated event. Repeated jobs return the existing result. Rating is never an addition to legacy AggregatedUsage or Invoice.
- A missing applicable price produces `UNRATED`, a stable machine-readable reason such as `NO_APPLICABLE_PRICE`, and a null monetary amount and null PriceVersion reference. Do not store a zero amount or treat the event as zero-valued. Preserve the event in ledger reads and expose its rating state and reason in an owner-facing reconciliation view or API. Ledger `PENDING`/`PROCESSING`/`PROCESSED`/`FAILED` remains independent of rating status.
- Rating work is durable and recoverable from PostgreSQL-backed accepted events, not dependent solely on a successful queue dispatch. The rating stage may follow successful ledger projection but must not reinterpret ledger `PROCESSED` as rated. A missing-price outcome is a completed rating attempt that remains eligible for an explicit, safely scoped later resolution; transient failures are separately retryable and must not be mislabeled `UNRATED` for missing price.
- A pricing-gap correction is an explicit exception, separate from the published PriceVersion schedule. An owner reviews a preview and approves a proposed unit price and currency for one Organization, metric, Customer scope, and half-open UTC interval where **no published price applies**. Store its actor, review/approval time, reason, evidence reference or retained evidence, interval, exact affected `UNRATED` event IDs, and resulting rating IDs. The supplied IDs must equal the reviewed target set at approval; do not silently expand it to later events.
- Approve and apply a gap correction atomically after rechecking every enumerated event: same Organization and intended Customer scope, same metric, occurrence within the interval, `LEDGER_ONLY`, `UNRATED` for `NO_APPLICABLE_PRICE`, and no existing rating. Recheck that no published PriceVersion applies anywhere in the requested interval. Reject the whole action if any guard fails or the preview is stale. The correction may create ratings only for those IDs, with correction provenance and the approved unit price. It cannot insert or change a published PriceVersion, alter an already rated outcome, affect nonenumerated or future events, or touch legacy Plans, aggregates, or Invoices. Corrections themselves are immutable and auditable; additional gaps require another reviewed action.
- Preserve legacy billing treatment and data. Existing Plan and PlanMetric prices, AggregatedUsage, and Invoices continue on their current path. Historical events with ambiguous or user-ID-shaped Customer identifiers are not automatically linked or rated. Any production backfill needs the restored-copy inventory and reconciliation gate described in the Customer-model guidance; this feature performs none.

## Testing Decisions

- Use one primary application-level seam: configure currency and PriceVersions through the owner-facing application path, send Customer events through `POST /api/track`, run the real ledger/rating worker, and inspect responses plus persisted PostgreSQL rating outcomes. The disposable PostgreSQL API/worker suites for ledger acceptance, recovery, and legacy billing regression are prior art. Tests assert externally visible behavior and durable results, not private helper calls.
- Exercise Organization authorization and isolation, including identical metric keys in different Organizations; Customer isolation, including the same external Customer ID in different Organizations; and rejection of an event ID from another Organization or outside the correction's Customer scope.
- Test the exact effective instant and the instants immediately before and after it, late and out-of-order receipt, UTC month boundaries, multiple scheduled versions, duplicate starts, invalid currency and price, and the future scheduling guard. Check that a zero-price published version yields a genuine rated zero while a missing price yields `UNRATED`, a reason, and no amount.
- Test sequential and concurrent rating/replay, worker interruption and recovery, and a schedule/rating race. Assert one persisted rating per event, stable provenance and amount, and no silent repricing.
- In the same suite, preview and approve a correction for a genuine price-free interval and exact `UNRATED` IDs. Assert actor, reason, evidence, interval, Customer scope, and affected IDs are retained; only those IDs become rated with correction provenance. Reject a correction that overlaps a published price, includes an already rated or wrong-Customer/Organization/metric/out-of-interval event, or has stale or omitted target IDs. Verify rejection is atomic and leaves all ratings and published versions unchanged.
- Seed a legacy Plan, aggregate, and Invoice; exercise normal rating and a gap correction; assert their recorded amounts and rows stay unchanged. Link a synthetic historical `LEGACY` event to a Customer in the disposable database and verify that mapping alone does not make it eligible for rating or change legacy treatment.
- Keep the Customer-linked ingestion gate off in default test configuration; enable it only within the isolated test harness to exercise the future pipeline. No production database, live backfill, or pilot enablement is involved.

## Out of Scope

- Draft BillingRecords, Customer period aggregation, finalization, revisions, invoice generation, and billing webhooks.
- Historical Customer mapping, pricing backfill, retroactive published-price edits, repricing rated events, and changes to legacy Plans, aggregates, or Invoices.
- Pilot enablement, removal of the active-Subscription ingestion prerequisite, currency conversion, tiered or volume pricing, discounts, taxes, proration, and price-schedule cancellation.
- Production data migration, load certification, and retention deletion.

## Further Notes

- `UsageEvent.processingState = PROCESSED` currently means the ledger projection completed; it is not rating evidence. The worker currently writes `LedgerEventProjection` and the legacy worker separately computes Subscription aggregates and Invoices.
- The pilot specification calls for one fixed unit price per metric with explicit Organization currency and occurrence-time rating. This spec establishes that calculation without authorizing a Customer BillingRecord or tax invoice.
- The exact money precision and rounding convention must be recorded in the implementation contract before accepting prices; tests should pin it at currency boundaries and for large valid quantities.
