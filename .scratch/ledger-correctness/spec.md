# Customer usage ledger correctness

**Status:** ready-for-agent

## Problem Statement

An Organization integrating with UsageFlow cannot yet rely on `POST /api/track` to tell whether a retry was accepted once, rejected as a conflicting use of an idempotency key, or committed but left unprocessed after a queue failure. The current route permits a missing key, treats any unique-key collision as success without comparing contents, returns no event ID, and writes the UsageEvent before enqueueing work. The database key is globally unique rather than Organization-scoped. The pilot needs a durable, explainable event ledger before Customer usage can enter a new rating pipeline.

## Solution

An Organization sends a Customer's usage through its API key with a required idempotency key and explicit occurrence time. For a valid new request, UsageFlow commits one immutable UsageEvent and its processing intent atomically, then returns the stable event ID and acceptance result. After API-key authentication, an existing Organization/key is compared with the submitted canonical billable contents before current Customer, Subscription, or time-window checks: an identical retry returns the original result, including after the late-arrival window closes; a changed request conflicts and inserts nothing. A worker can be restarted and replay pending ledger work from PostgreSQL without losing or double-processing accepted events. An authorized owner can export an immutable period snapshot whose pages, processing states, and reconciliation totals agree. Customer-linked events remain outside legacy aggregation and billing.

## User Stories

1. As an integrator, I want an accepted response to include the event ID, so that I can reconcile my send log with UsageFlow.
2. As an integrator, I want an identical retry to return the original event ID and acceptance result, so that network retries do not add usage.
3. As an integrator, I want a changed request using an existing key to return a conflict, so that accidental key reuse cannot silently hide usage.
4. As an integrator, I want concurrent retries to behave like sequential retries, so that request races cannot create duplicate events.
5. As an integrator, I want a clear rejection when the key or occurrence time is absent, a new event is outside the permitted occurrence window, or its timestamp exceeds the future limit, so that I can correct the request.
6. As an owner, I want a committed event visible immediately with its receipt and occurrence times, even while processing is delayed, so that I can investigate a backlog.
7. As an owner, I want ledger processing states and failure reasons distinct from billing treatment, so that I can identify pending or failed reconciliation work without mistaking an event for rated usage.
8. As an owner, I want a stable paginated period export with frozen rows, states, and counts and quantity totals by Customer and metric, so that I can compare it with my retained send log without skipped or repeated rows.
9. As an operator, I want pending work reconstructable from committed PostgreSQL rows after Redis or worker failure, so that queue loss does not lose accepted usage.
10. As an operator, I want reprocessing to be idempotent, so that a crash or duplicate job cannot double-count usage.
11. As an owner, I want Customer-linked events to remain out of legacy aggregates and invoices even after another event triggers aggregation, so that the new ledger does not silently change existing billing outputs.
12. As an integrator, I want an identical retry after the 72-hour close to return its original acceptance, so that a delayed network retry is not mistaken for a new late event.
13. As an integrator, I want an identical retry to work after its Customer is deactivated or its Subscription changes, so that a past acceptance remains discoverable.

## Implementation Decisions

- The API key determines the Organization. Require a nonblank idempotency key for new Customer-linked events and enforce uniqueness on Organization plus key. Preserve existing legacy records and their billing treatment; do not infer a Customer from their identifiers. Keep the key, fingerprint, and original acceptance result for the stated 12-month raw-event retention period.
- Require an explicit occurrence timestamp for new Customer-linked events; never default it to receipt time. The fingerprint covers the canonical billable fields: submitted external customer ID, normalized metric, positive integer quantity, and UTC occurrence instant. Define and document canonicalization before implementing the constraint. Equivalent timestamp representations of the same instant may normalize together, but precision or input transformations must not collapse materially different events. Metadata is stored only on first acceptance, does not affect the fingerprint, and is never changed by a retry.
- After API-key authentication and parsing enough of the request to identify and compare the key and canonical billable contents, look up an existing Organization/key before applying current Customer or Subscription eligibility, late-arrival, historical-window, or future-time rules. Return its stored event ID and original acceptance result for an exact match even if those conditions changed; return a distinct conflict for changed contents. Apply eligibility and time rules only to a new key. Invalid or unparseable billable contents cannot match an existing event.
- Enforce the Organization/key claim in PostgreSQL and resolve concurrent insert races transactionally. Compare the stored fingerprint on a conflict. Return the original event ID and acceptance result only for an exact match; otherwise return a distinct conflict response. A response must never acknowledge an uncommitted event.
- Store immutable event ID, Organization, resolved Customer, metric, quantity, occurrence time, receipt time, key, fingerprint, and processing state. Preserve existing raw identifier and Subscription columns for compatibility. Historical rows retain their existing billing treatment if a Customer link is later added.
- Apply UTC occurrence time to the calendar-month period. For new events, accept arrivals through 72 hours after that month ends, inclusive, and reject events outside the pilot's permitted historical window. Reject a new occurrence instant more than five minutes after the server's receipt instant; exactly five minutes is accepted. Use one captured receipt instant for validation and persistence. Never substitute receipt time for an absent or invalid occurrence time.
- Commit the event and durable processing intent in one PostgreSQL transaction. Redis/BullMQ is a dispatch accelerator, not the only record of pending work. Recovery scans or re-enqueues committed pending rows. A queue outage after commit must not make the API claim the event was rejected; the response and ledger must agree.
- Use `PENDING`, `PROCESSING`, `PROCESSED`, and `FAILED` for ledger processing. `PROCESSED` means the worker has completed the ledger-stage reconciliation projection for that event and durably recorded completion exactly once. Merely inserting the event or dispatching a job leaves it `PENDING`. A leased or interrupted `PROCESSING` event must be recoverable; `FAILED` retains a reviewable reason and can be retried without double-counting. `PROCESSED` does not mean rated, priced, billed, or included in a Customer aggregate. Billing treatment is independent: new Customer-linked events remain `LEDGER_ONLY` in every processing state and never enter the legacy Subscription aggregate or invoice calculation.
- Provide an authorized, Organization-scoped ledger export for a UTC period. Include event ID, safe key reference, occurrence and receipt times, external Customer ID, metric, quantity, processing state, and safe failure reason; omit Customer names and secrets. At export creation, use one consistent PostgreSQL read snapshot to capture the selected event rows **with their then-current states** and grouped counts and quantity totals by Customer and metric. Persist or otherwise hold that immutable export snapshot for all pages; a cursor over live UsageEvents is insufficient. Stable ordering and cursors page only within that snapshot. Later arrivals and processing transitions do not alter any page or totals in the created export; a new export sees newer state.
- The retention and retry contract must tell integrators to retain and replay original keys; keys, fingerprints, and original acceptance results remain available for the full 12-month raw-event period. Retry guarantees end after lawful purge. A later tested retention operation must prevent a purged key from recreating old-period usage.
- Keep the deployed Customer-linked ingestion gate off. Completing this spec alone does not authorize pilot traffic or remove the existing active Organization Subscription prerequisite. Replacing that prerequisite belongs with the Customer billing design.

## Testing Decisions

- The primary seam is application-level integration: call `POST /api/track` with Organization-scoped API keys against disposable PostgreSQL, then inspect committed ledger rows, responses, processing state, and reconciliation API output. Exercise real queue/worker startup, shutdown, and recovery in this suite. The existing Customer ingestion browser/API/PostgreSQL suite provides prior art; synthetic SQL tests support constraints but do not prove API behavior.
- Assert missing key or timestamp inserts no UsageEvent; exact sequential and concurrent retries return one stable event ID and original result; changed Customer, metric, quantity, or occurrence instant with the same key returns a conflict and no extra event; the same key can be used independently by two Organizations. Confirm metadata changes do not mutate the accepted event.
- Accept an event before the 72-hour close, then retry it after close and after Customer deactivation or Subscription change; assert the original result. Assert a new key after close is rejected without insertion. Exercise a changed-payload retry after those changes to confirm it conflicts before current eligibility or time checks.
- Inject a failure between commit and dispatch, restart the worker or Redis, and assert the accepted event remains visible and its ledger-stage projection completes exactly once. Also test a crash during `PROCESSING` followed by replay; reconcile source events to projected counts. Assert neither acceptance nor queue dispatch alone marks an event `PROCESSED`, and that `LEDGER_ONLY` remains independent of processing state.
- Test UTC month boundaries, out-of-order arrivals, the inclusive 72-hour close, the inclusive five-minute future boundary and just beyond it, and invalid quantities. Rejected new requests insert no UsageEvent.
- Export multiple pages while later events arrive and existing events change processing state; assert the initial export's event set, states, failure reasons, grouped counts, and quantities remain fixed and agree with the database snapshot captured at export creation. A subsequent export should reflect the changes. Test Organization isolation and absence of unnecessary personal data.
- Trigger legacy aggregation after a new Customer-linked event and verify both the recomputed legacy aggregate and recorded legacy invoice amount remain unchanged. Link a historical `LEGACY` event to a Customer and verify that its legacy treatment and aggregate remain unchanged.
- Test only observable behavior and persisted results; do not assert private helper calls or queue implementation details.

## Out of Scope

- PriceVersion creation, rating logic, Customer aggregates, draft or finalized BillingRecords, adjustments, and billing webhooks.
- Historical Customer mapping or backfill, invoice attribution, changes to existing legacy event identity, and enabling pilot ingestion.
- Production deployment, a claimed recovery guarantee, load certification, and automated retention deletion. Those require later restore, replay, and capacity drills.

## Further Notes

- Repository inspection used the merged Customer ingestion branch and its application-level PostgreSQL test. Recheck the current branch before implementing tickets.
- Today the Customer route stores a `LEDGER_ONLY` event but provides no stable ID in its response. Queueing occurs after commit, and a failed queue call produces a 500 despite the committed row. These observations are code behavior, not pilot guarantees.
- The owner approved the five-minute future-skew limit and its inclusive boundary for this spec. Implementation must reflect both in the API contract and boundary tests.
