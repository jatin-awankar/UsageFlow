# Customer usage ledger correctness

**Status:** ready-for-agent

## Problem Statement

An Organization integrating with UsageFlow cannot yet rely on `POST /api/track` to tell whether a retry was accepted once, rejected as a conflicting use of an idempotency key, or committed but left unprocessed after a queue failure. The current route permits a missing key, treats any unique-key collision as success without comparing contents, returns no event ID, and writes the UsageEvent before enqueueing work. The database key is globally unique rather than Organization-scoped. The pilot needs a durable, explainable event ledger before Customer usage can enter a new rating pipeline.

## Solution

An Organization sends a Customer's usage through its API key with a required idempotency key. For a valid request, UsageFlow commits one immutable UsageEvent and its processing intent atomically, then returns the stable event ID and acceptance result. Retrying the same Organization/key with identical canonical billable contents returns that original result. Reusing the key with different contents returns a conflict and inserts nothing. A worker can be restarted and replay pending work from PostgreSQL without losing or double-processing accepted events. An authorized owner can inspect and export the period's ledger with stable pagination and reconciliation totals, including processing states. Customer-linked events remain outside legacy aggregation and billing.

## User Stories

1. As an integrator, I want an accepted response to include the event ID, so that I can reconcile my send log with UsageFlow.
2. As an integrator, I want an identical retry to return the original event ID and acceptance result, so that network retries do not add usage.
3. As an integrator, I want a changed request using an existing key to return a conflict, so that accidental key reuse cannot silently hide usage.
4. As an integrator, I want concurrent retries to behave like sequential retries, so that request races cannot create duplicate events.
5. As an integrator, I want a clear rejection when the key is absent, the event is outside the permitted occurrence window, or its timestamp is implausibly in the future, so that I can correct the request.
6. As an owner, I want a committed event visible immediately with its receipt and occurrence times, even while processing is delayed, so that I can investigate a backlog.
7. As an owner, I want processing states and specific failure reasons in the ledger, so that I can identify awaiting, failed, unrated, rated, and explicitly excluded events as those later capabilities are added.
8. As an owner, I want a stable paginated period export and counts and quantity totals by Customer and metric, so that I can compare it with my retained send log without skipped or repeated rows.
9. As an operator, I want pending work reconstructable from committed PostgreSQL rows after Redis or worker failure, so that queue loss does not lose accepted usage.
10. As an operator, I want reprocessing to be idempotent, so that a crash or duplicate job cannot double-count usage.
11. As an owner, I want Customer-linked events to remain out of legacy aggregates and invoices even after another event triggers aggregation, so that the new ledger does not silently change existing billing outputs.

## Implementation Decisions

- The API key determines the Organization. An idempotency key is required for new Customer-linked events and unique within that Organization across all usage events. Keep the key, fingerprint, and original acceptance result for the 12-month raw-event retention period. Do not weaken existing legacy records or infer a Customer from their identifier.
- The fingerprint covers the canonical billable fields: submitted external customer ID, metric, positive integer quantity, and occurrence instant. Define and document canonicalization before implementing the constraint. Equivalent timestamp representations of the same UTC instant may normalize together, but precision or input transformations must not collapse materially different events. Metadata does not change a billable event; document whether it is stored only on first acceptance. A retry must not mutate the original record.
- Enforce the Organization/key claim in PostgreSQL and resolve concurrent insert races transactionally. Compare the stored fingerprint on a conflict. Return the original event ID and acceptance result only for an exact match; otherwise return a distinct conflict response. A response must never acknowledge an uncommitted event.
- Store immutable event ID, Organization, resolved Customer, metric, quantity, occurrence time, receipt time, key, fingerprint, and processing state. Preserve existing raw identifier and Subscription columns for compatibility. Historical rows retain their existing billing treatment if a Customer link is later added.
- Apply UTC occurrence time to the calendar-month period. Accept arrivals only through 72 hours after that month ends and reject events outside the pilot's permitted historical window. Define a documented, testable future-skew limit before implementation; do not silently substitute receipt time for an invalid occurrence time.
- Commit the event and durable processing intent in one PostgreSQL transaction. Redis/BullMQ is a dispatch accelerator, not the only record of pending work. Recovery scans or re-enqueues committed pending rows. A queue outage after commit must not make the API claim the event was rejected; the response and ledger must agree.
- Processing transitions and derived aggregates must be safe under retry and concurrent workers. This stage establishes the ledger and processing contract; price rating and Customer BillingRecord calculation remain later stages. New Customer-linked rows remain `LEDGER_ONLY` and do not enter the legacy Subscription aggregate or invoice calculation.
- Provide an authorized, Organization-scoped ledger API or export for a UTC period. Include event ID, safe key reference, occurrence and receipt times, external Customer ID, metric, quantity, and processing state; omit Customer names and secrets. Use a snapshot boundary plus stable ordering/cursor so concurrent arrivals cannot cause skipped or repeated rows. Return counts and quantity totals by Customer and metric for the same snapshot.
- The retention and retry contract must tell integrators to retain and replay original keys, and that keys and fingerprints remain available for the full 12-month raw-event period. Purging requires a later tested retention operation that cannot recreate old-period usage.
- Keep the deployed Customer-linked ingestion gate off. Completing this spec alone does not authorize pilot traffic or remove the existing active Organization Subscription prerequisite. Replacing that prerequisite belongs with the Customer billing design.

## Testing Decisions

- The primary seam is application-level integration: call `POST /api/track` with Organization-scoped API keys against disposable PostgreSQL, then inspect committed ledger rows, responses, processing state, and reconciliation API output. Exercise real queue/worker startup, shutdown, and recovery in this suite. The existing Customer ingestion browser/API/PostgreSQL suite provides prior art; synthetic SQL tests support constraints but do not prove API behavior.
- Assert required-key rejection inserts no UsageEvent; exact sequential and concurrent retries return one stable event ID; changed Customer, metric, quantity, or occurrence time with the same key returns a conflict and no extra event; the same key can be used independently by two Organizations.
- Inject a failure between commit and dispatch, restart the worker or Redis, and assert the accepted event remains visible and is processed exactly once. Also test a crash during processing followed by replay; reconcile source events to derived counts.
- Test UTC month boundaries, out-of-order arrivals, the 72-hour close, the chosen future-skew boundary, and invalid quantities. Rejected requests insert no UsageEvent.
- Export multiple pages while later events arrive; assert the initial snapshot has no missing or duplicate IDs and that its grouped counts and quantities equal direct read-only database counts. Test Organization isolation and absence of unnecessary personal data.
- Trigger legacy aggregation after a new Customer-linked event and verify both the recomputed legacy aggregate and recorded legacy invoice amount remain unchanged. Link a historical `LEGACY` event to a Customer and verify that its legacy treatment and aggregate remain unchanged.
- Test only observable behavior and persisted results; do not assert private helper calls or queue implementation details.

## Out of Scope

- PriceVersion creation, rating logic, Customer aggregates, draft or finalized BillingRecords, adjustments, and billing webhooks.
- Historical Customer mapping or backfill, invoice attribution, changes to existing legacy event identity, and enabling pilot ingestion.
- Production deployment, a claimed recovery guarantee, load certification, and automated retention deletion. Those require later restore, replay, and capacity drills.

## Further Notes

- Repository inspection used the merged Customer ingestion branch and its application-level PostgreSQL test. Recheck the current branch before implementing tickets.
- Today the Customer route stores a `LEDGER_ONLY` event but provides no stable ID in its response. Queueing occurs after commit, and a failed queue call produces a 500 despite the committed row. These observations are code behavior, not pilot guarantees.
- The future-skew threshold is a deliberate open value for ticket planning. It must be fixed in the API contract and boundary tests before implementation.
