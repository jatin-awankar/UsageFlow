# Customer BillingRecord owner finalization and revisions

Status: ready-for-agent

## Problem Statement

An Organization owner can review a monthly Customer BillingRecord draft, but cannot explicitly approve a complete calculation or correct it with an auditable later version. A stored `READY_FOR_REVIEW` snapshot may become stale while ledger or rating work changes. Finalization must reflect current evidence and leave a durable outbound fact without turning a comparison calculation into a tax invoice or payment request.

## Solution

After the inclusive 72-hour close, an Organization owner explicitly finalizes a BillingRecord only when a fresh, transactionally consistent readiness check finds every eligible accepted event rated, no unresolved worker failure, and all source, line, quantity, currency, and amount reconciliation valid. Finalization freezes an immutable version of the reviewed lines and amounts. An owner can later apply an audited adjustment through a linked revision, preserving every earlier final version and one current version. Each successful finalization or revision atomically records a stable `invoice.finalized` or `invoice.revised` outbound event. Legacy Invoices remain untouched.

## User Stories

1. As an Organization owner, I want to finalize a reviewed BillingRecord after close, so that the comparison amount has an explicit approval point.
2. As an owner, I want the close instant shown with the action, so that I cannot approve while late acceptance remains open.
3. As an owner, I want finalization to recheck current ledger and rating evidence, so that an old ready view cannot approve incomplete work.
4. As an owner, I want unresolved events and failed workers to block approval with safe details, so that recovery can happen first.
5. As an owner, I want counts, quantities, lines, and amounts reconciled at approval, so that the frozen version is explainable.
6. As an owner, I want concurrent clicks and request retries to return one final version, so that I do not create duplicate approvals or events.
7. As an owner, I want finalized lines and amounts frozen, so that later calculations cannot silently change an approved version.
8. As an owner, I want later corrections entered as audited adjustments, so that I can explain a change after close.
9. As an owner, I want each revision linked to the version it replaces, so that I can follow the full sequence.
10. As an owner, I want the actor, reason, evidence, and previous and revised amounts recorded, so that each correction can be reviewed.
11. As an owner, I want exactly one current final version, so that downstream comparison uses an unambiguous result.
12. As an owner, I want every prior final version readable, so that I can reproduce what was previously approved.
13. As an owner, I want a repeated revision request to return its original result, so that network retries cannot apply an adjustment twice.
14. As an owner, I want conflicting or stale revision requests rejected, so that concurrent corrections do not overwrite each other.
15. As an owner, I want a durable event for each successful approval or revision, so that later delivery can recover after a crash.
16. As an integrator, I want each outbound event to have a stable ID and version reference, so that I can deduplicate delivery.
17. As an owner, I want the record labeled as a comparison calculation, so that approval is not presented as a tax invoice, payment request, or authorization to charge.
18. As an operator, I want legacy Invoices unchanged, so that the Customer flow cannot rewrite Subscription billing history.
19. As an owner, I want other Organizations' records inaccessible, so that billing evidence stays tenant scoped.
20. As an operator, I want a failed transaction to leave no partial version, pointer change, or event, so that retries are safe.
21. As an owner, I want a retry of my original finalization to return its original version even after a revision, so that a delayed response cannot change the current revised result.
22. As a pilot owner, I want finalization enabled only when webhook delivery and recovery are available, so that a finalized record's durable event can reach my integration.

## Implementation Decisions

- Extend the existing Organization-scoped owner BillingRecord application path with explicit finalization and revision actions. Require current owner membership on each write; use server time, not a client supplied approval time. Finalization requires time strictly after the inclusive close instant.
- Finalization operates on the unique Organization, billed Customer, and UTC period BillingRecord. Under one PostgreSQL transaction and serialization guard, refresh or re-evaluate the eligible `LEDGER_ONLY` Customer event set and persisted rating outcomes rather than trusting `READY_FOR_REVIEW` from a prior response. Check ledger pending, processing, and failed states; rating pending, retry, failed, and `UNRATED` states; each event's single rated contribution; counts and quantities; rated source to line totals; exact currency and amount reconciliation. A stale ready snapshot cannot authorize finalization. If blocked, return a safe conflict with current blocking evidence and leave no final version or outbound event.
- Reuse the draft's occurrence-time month, verified Customer selection, persisted rating provenance, deterministic grouping, and exact money contract. No Customer inference from raw identifiers, Users, Subscriptions, or legacy Invoices. The final version captures the complete approved source, line, reconciliation, and amount evidence, with the approver and finalization time. Freeze it at the database boundary; no recalculation or draft publication may mutate or replace its monetary content.
- Model final versions as append-only, linked versions belonging to one BillingRecord, with a database-enforced current-version pointer or equivalent uniqueness. Keep every prior version. The first final version has no predecessor; each revision refers to the exact prior current version. A compare-and-swap or serialized transaction prevents two current versions under concurrent actions.
- A post-close correction is an explicit, owner-authorized adjustment request with a reason and durable evidence reference. Store the adjustment, actor, request identity, time, prior version, previous amount, signed delta, revised amount, currency, affected lines or source references, and explanation. Validate exact arithmetic and reconciliation of revised lines and totals; reject unsupported currency changes, ambiguous evidence, or silent repricing. Preserve the prior version and its lines without modification. The new linked version becomes current only in the same transaction that records its audit evidence.
- Define stable idempotency for finalization and revision requests: a repeated request identity with identical billable fields returns that request's original version and event, regardless of the record's later current version; reuse with conflicting fields is rejected. A retry of the original finalization after a revision returns the initial finalized version and event without changing the current revised version. Concurrent first-time finalization clicks still create only one initial version. A stale expected version is a conflict and cannot apply an adjustment to a newer version.
- Atomically insert one stable outbound event with each new final version: `invoice.finalized` for the first version, `invoice.revised` for each revision. Include Organization, BillingRecord, Customer, period, version and predecessor IDs, currency, exact previous and current amounts, and adjustment identity where applicable. Event ID and payload are fixed after commit; a retry never inserts a duplicate. Use a durable database outbox or transactional event record. Do not call the existing helper that queues HTTP delivery outside this transaction.
- Preserve the legacy Invoice schema, rows, amounts, and `invoice.created` behavior. Present final versions as BillingRecord comparison calculations, not tax invoices, payment requests, or permission to charge.
- Gate owner finalization and revision off for pilot traffic until the later webhook delivery path can send and recover these durable outbound events. The outbox schema and writes may ship first; enabling the owner actions requires a verified delivery and recovery path. Keep the disposable acceptance harness able to exercise the gated actions.
- Add additive schema constraints and immutability protection for finalized versions, current-version linkage, adjustment audit data, and event uniqueness. A rollback of application behavior retains finalized versions, source evidence, adjustments, audit records, outbound events, and legacy Invoices; destructive schema removal requires separate review.

## Testing Decisions

- Prefer one application-level owner path on disposable PostgreSQL, extending the existing Customer monthly draft harness. Configure Customer, currency, and prices through owner paths; ingest through the real ledger endpoint; run real ledger and rating workers; request, read, finalize, and revise through owner-authorized actions. Inspect persisted versions, pointers, audit evidence, and outbound event rows. Assert externally observable behavior and durable state, not private helper calls. Prior art is the draft readiness and concurrent recalculation suite, ledger and rating recovery suites, and legacy Invoice regression suite.
- Use controlled server time to test at the inclusive close and just after. Exercise a ready view made stale by an unresolved eligible event, ledger failure, rating failure or retry, `UNRATED`, and reconciliation mismatch. Finalization must re-evaluate in its transaction and reject each case without version or event; recovery and a fresh finalization may succeed.
- Send concurrent owner finalization requests and repeat them after response loss. Assert one initial final version, one current pointer, one `invoice.finalized` event, and identical stable IDs on retries. Send concurrent revisions based on the same predecessor; exactly one succeeds and the other sees a conflict or returns its own already committed result.
- After a successful revision, retry the original finalization request identity. Assert it returns the original finalized version and `invoice.finalized` event while the revised version remains current, with no new version, adjustment, or outbound event.
- Inject a crash or error before transaction commit at version insertion, current-pointer advancement, and outbound event insertion. Verify atomic rollback and safe retry. Simulate a crash after commit but before response; retry must return the committed version and event without duplication.
- Verify frozen line and amount evidence remains unchanged after later worker recovery, draft recalculation attempts, and revisions. Verify every prior final version, adjustment reason and evidence, actor, previous and revised exact amounts, current-version uniqueness, and tenant authorization. Seed a legacy Invoice and assert its values remain unchanged.
- Verify the pilot gate rejects owner finalization and revision while webhook delivery and recovery are unavailable, leaving no version or outbound event. Exercise successful actions only with the gate enabled in the disposable harness; the later webhook work must verify delivery and recovery before pilot enablement.

## Out of Scope

- HTTP webhook delivery, endpoint selection, signatures, retry scheduling, terminal failures, replay, and secret rotation; those belong to the later webhook spec.
- Tax invoices, payment requests, collection, charging, discounts, taxes, currency conversion, and automatic correction or finalization.
- Historical Customer mapping or backfill, repricing persisted ratings, changes to legacy Invoice generation, and pilot production enablement.
- Implementation tickets and code changes.
- Implementing or enabling webhook delivery and recovery in pilot traffic; the gate remains closed until that later path is ready.

## Further Notes

- The pilot calls these outbound events `invoice.finalized` and `invoice.revised` even though the domain object is BillingRecord and remains a comparison calculation.
- The existing draft uses append-only calculation snapshots and a current pointer. Its current `READY_FOR_REVIEW` value is a review hint, not finalization authorization.
- The current webhook helper writes and enqueues outside the BillingRecord transaction. The finalization design needs a transactional durable event write and leaves dispatch to the webhook follow-up.
