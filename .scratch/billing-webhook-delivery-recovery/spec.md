# BillingRecord webhook delivery and recovery

Status: ready-for-agent

## Problem Statement

An Organization can durably finalize or revise a Customer BillingRecord in the disposable acceptance environment, but its committed outbound event has no reliable path to the Organization's receiver. A lost queue job, worker crash, failed endpoint, or secret change can leave an approved comparison calculation without a usable notification. Owners need to see what happened and safely replay a failed delivery. Integrators need an authenticated, stable event they can deduplicate. The owner finalization gate must stay closed for pilot traffic.

## Solution

Deliver the existing `invoice.finalized` and `invoice.revised` outbound events from their durable database rows to subscribed Organization endpoints. A recovering worker discovers committed work, sends at least once, records each attempt, retries within a fixed bound, and exposes terminal failures and owner initiated replay. Every attempt and replay keeps the original event ID and immutable billing payload. Sign the exact request body with a timestamp and an endpoint secret; receivers verify the signature within five minutes. Rotation accepts the previous secret for 24 hours. The feature remains exercisable with disposable local services while owner finalization and revision remain gated off for pilot traffic.

## User Stories

1. As an Organization owner, I want a committed finalization event delivered to my subscribed endpoint, so that my system can compare the approved BillingRecord.
2. As an Organization owner, I want a committed revision event delivered, so that my system sees each later approved correction.
3. As an integrator, I want each delivery to identify its event type and stable event ID, so that I can route and deduplicate it.
4. As an integrator, I want the BillingRecord version and Organization context in the immutable event body, so that I can associate the notification with the correct comparison calculation.
5. As an integrator, I want repeated attempts and manual replay to carry the same event ID and billing facts, so that retries cannot appear to be new approvals.
6. As an Organization owner, I want a committed event recovered after dispatch fails or a queue job disappears, so that a transient infrastructure fault does not silently lose it.
7. As an Organization owner, I want delivery recovered after a worker crash before or after an HTTP request, so that work eventually resumes without changing the billing event.
8. As an integrator, I want at least once delivery with documented duplicate handling, so that I can acknowledge a request safely even if its response is lost.
9. As an Organization owner, I want retries after timeouts, connection errors, and non-2xx responses, so that transient receiver failures can clear.
10. As an Organization owner, I want automatic retries to stop after a documented bound, so that a broken endpoint does not run forever.
11. As an Organization owner, I want every attempted send visible with its endpoint, time, outcome, response code or safe error, and duration, so that I can diagnose failures.
12. As an Organization owner, I want a terminal failure visible at the event and endpoint level, so that I know which notification needs attention.
13. As an Organization owner, I want to manually replay a terminally failed event to its selected endpoint, so that I can recover after fixing my receiver.
14. As an Organization owner, I want repeated replay requests to be idempotent, so that a double click does not create concurrent replay cycles.
15. As an Organization owner, I want replay attempts distinguishable from the original attempt cycle, so that the history remains understandable.
16. As an Organization owner, I want a successful endpoint left alone when another endpoint fails, so that replay does not duplicate work unnecessarily.
17. As an Organization owner, I want an event with no subscribed endpoint shown as having no target, so that it is not mistaken for a successful HTTP delivery.
18. As an integrator, I want the body bytes and timestamp authenticated together, so that altered content or stale requests fail verification.
19. As an integrator, I want a clear five-minute timestamp window and constant-time signature comparison, so that verification is predictable.
20. As an Organization owner, I want to rotate an endpoint secret with a 24-hour overlap, so that I can update my receiver without dropping notifications.
21. As an Organization owner, I want only current and unexpired previous secrets used during rotation, so that old secrets stop working on schedule.
22. As an Organization owner, I want the new secret exposed only to authorized endpoint managers, so that delivery logs and ordinary readers do not leak it.
23. As an Organization owner, I want endpoint selection and delivery history confined to my Organization, so that another tenant cannot receive or inspect my BillingRecord events.
24. As an Organization owner, I want replay and rotation authorized against my current membership, so that stale access cannot control delivery.
25. As an operator, I want recovery to work after Redis data loss using PostgreSQL state, so that the queue is not the sole record of pending delivery.
26. As an operator, I want concurrent workers to avoid simultaneous claims of the same pending attempt, so that normal recovery does not cause unnecessary duplicate requests.
27. As an operator, I want an uncertain result after an HTTP send treated as retryable, so that a response lost before recording cannot silently discard delivery.
28. As a pilot owner, I want the finalization gate kept closed, so that delivery verification does not enable approval in pilot traffic.
29. As an integrator, I want the event described as a BillingRecord comparison calculation, so that I do not treat it as a tax invoice, payment request, or charge authorization.

## Implementation Decisions

- Scope delivery, recovery, signing, replay, and rotation behavior in this feature to `invoice.finalized` and `invoice.revised` events linked to immutable BillingRecord versions. Preserve the existing `invoice.created` legacy path and other event types without silently changing their protocol.
- Use the committed `WebhookEvent` as the durable outbox. Finalization and revision already insert one event in the same PostgreSQL transaction as the version and current pointer; delivery must start only after commit and must never rewrite the event ID, type, billing payload, version reference, or Organization.
- Resolve subscribed active endpoints within the event's Organization and persist the selected targets or equivalent durable per-endpoint work before delivery. Endpoint changes after selection must not redirect an existing event to a newly added or foreign endpoint. Show a no-target outcome explicitly. An endpoint that becomes disabled may be skipped with a visible reason; it must not be counted as an HTTP success.
- Add a PostgreSQL-backed delivery lifecycle with due time, claim/lease, bounded attempt counter, replay cycle or equivalent durable state. Redis jobs are wakeups, not authoritative delivery state. A startup and periodic worker scan re-enqueues due or expired work in bounded batches. Use atomic claims so concurrent workers cannot normally send the same attempt; expired claims allow recovery after crashes. Accept that a crash after HTTP success and before recording it can send a duplicate.
- Count a network send as an attempt, persist its start and result, and retain safe response metadata without storing secret material or unbounded response bodies. Treat 2xx as success; timeout, connection failure, and all other HTTP statuses as failure. Use a five-second request timeout and five automatic attempts per endpoint per cycle, with exponential delays of 1, 2, 4, and 8 minutes after attempts one through four. A failed fifth attempt is terminal until manual replay. Recovery must reconstruct a missing retry wakeup from durable due state.
- Aggregate event status from its selected endpoint outcomes: pending while any target is due or in flight; delivered when all eligible targets succeed; failed when no target remains pending and at least one target is terminally failed. Preserve the endpoint level history so a mixed success and failure is visible. Do not infer delivery success from an empty target list.
- Provide an Organization-scoped owner action to replay a terminally failed event to a selected failed endpoint. Require current owner authorization and an idempotency key or equivalent guard. Replay starts a new bounded cycle with attempt history intact and does not create a new `WebhookEvent`; an in-flight or successful target cannot be replayed through this action. Audit actor, endpoint, event ID, reason, and replay time.
- Define the billing-event wire body as one deterministic JSON byte sequence containing the immutable event ID, type, creation time, and the stored billing payload. The sender signs those exact bytes and sends them unchanged for that attempt. A replay may use a new timestamp and signature but must preserve the event ID and billing facts; receiver deduplication keys on the event ID.
- For these two event types, use `X-UsageFlow-Timestamp` as Unix seconds and `X-UsageFlow-Signature: v1=<lowercase hex HMAC-SHA256>`. Compute HMAC over the UTF-8 bytes of `<timestamp>.<raw request body>` using the endpoint secret. Reject malformed timestamps or signatures, timestamps more than 300 seconds in the past or future, and mismatches; compare decoded digests in constant time. Document verification against raw bytes before JSON parsing, including a receiver example and duplicate-event behavior.
- This format is a deliberate change from the current legacy sender, which sends a bare hex `X-UsageFlow-Signature` equal to HMAC-SHA256 of `JSON.stringify(payload)` and has no timestamp. Do not claim that existing receivers can verify the new format unchanged. Document the event-specific protocol and migration guidance; do not alter legacy event signatures in this feature.
- Rotate each endpoint secret through an authorized owner action. Create a new current secret and retain the prior secret for verification during a 24-hour overlap from rotation time; do not retain older secrets as active. The sender signs new attempts with the current secret. Expose the new secret once to the authorized owner, never in logs or list responses, and audit rotation without secret values. After the overlap, previous-secret signatures fail verification. Store secret state durably and protect it at the application boundary.
- Keep Organization checks on event lookup, endpoint lookup, target creation, logs, replay, and rotation. Validate the event and endpoint belong to the same Organization before any send or replay. A queue payload is only an identifier, never authorization.
- Keep the production owner finalization and revision gate closed. This specification does not authorize pilot enablement; that requires a separate verified rollout decision.

## Testing Decisions

- Use one application-level seam, approved by the user: disposable PostgreSQL and local Redis, the real application and `worker/index.ts`, plus a loopback HTTP receiver. Reuse the Customer monthly draft acceptance harness for gated owner finalization and revision and the ledger worker recovery harness for worker start, stop, queue loss, and polling. The local receiver controls responses and captures exact request bytes and headers. No paid service is needed.
- Test observable owner actions, received HTTP requests, Organization-scoped delivery views, and durable event and attempt outcomes. Avoid asserting private helper calls or queue implementation details except when deliberately removing queued work to verify recovery.
- Finalize and revise through the existing nonproduction owner gate, then assert one committed event per version and delivery to subscribed endpoints. Kill or withhold the worker, remove Redis jobs, restart it, and observe recovery from PostgreSQL. Test a crash after a receiver accepts a request but before success is durably recorded; allow duplicate sends and require the same event ID.
- Have the receiver return 2xx, 4xx, 5xx, delay beyond timeout, and close connections. Verify the five-attempt bound, due intervals with a controlled clock or short test-only scheduling interval, visible per-attempt history, terminal failure, and no further automatic sends after terminal state.
- Replay a terminally failed endpoint through the authorized owner path. Assert the original event ID and billing facts, a new bounded cycle, preserved prior history, idempotent repeated replay, and no repeat to an already successful endpoint.
- Verify HMAC against the exact captured raw bytes and timestamp. Mutate body, timestamp, and signature independently; test both edges of the five-minute window and constant-time comparison behavior through acceptance or rejection. Rotate the secret, verify new signatures, acceptance of the immediately previous secret within 24 hours, and rejection after expiry. Check secret redaction from logs and ordinary endpoint views.
- Create two Organizations with independent Customers and endpoints. Verify target selection, receiver traffic, logs, replay, and rotation stay within the authorized Organization, including forged event and endpoint IDs and stale membership.
- Verify no-target events are visible without a false success; disabled targets and mixed endpoint outcomes remain explainable. Confirm legacy Invoice rows and legacy webhook behavior are unchanged and the owner finalization gate remains closed in production configuration.
- Existing prior art includes the Customer monthly draft acceptance suite, disposable PostgreSQL harness, ledger worker recovery integration, and webhook delivery log view.

## Out of Scope

- Creating implementation tickets or implementing code as part of this specification task.
- Enabling owner finalization or revision for pilot or production traffic.
- Delivering or changing the protocol of `invoice.created`, payment, subscription, or other legacy events.
- Tax invoices, payment requests, collection, charging, and automatic BillingRecord approval or revision.
- Historical Customer mapping, backfill, or inference from Subscription identifiers.
- External paid queues, hosted webhook testing services, or paid development infrastructure.

## Further Notes

- The event names retain the existing `invoice.*` vocabulary for compatibility, while the underlying object is a BillingRecord comparison calculation.
- The current delivery code has a five-attempt limit and exponential backoff but relies on Redis enqueue after a separate event write. It does not recover billing events committed by finalization or revision, does not timestamp signatures, and does not provide manual replay or rotation overlap.
- The existing webhook documentation describes a different four-attempt example. Update customer-facing documentation when this behavior is implemented, with clear event-specific scope.
