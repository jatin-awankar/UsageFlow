# Showcase simulation: backend source verification

Inspected 2026-10-03 at baseline commit `fe6d3aee6c6726422f21c1fbd9dd02367275892d`. Read-only source assessment before fixture definition, not a production or integration test. [Approved showcase brief](../.scratch/public-showcase/spec.md).

## Quantity and acceptance

- [Ingestion validators](../lib/validators.ts) require positive integer `amount`; Customer-linked input requires an external customer ID and occurrence timestamp with at most millisecond precision. **Discrepancy:** the ingestion validator has no explicit 1,000,000,000 maximum, whereas [rateMoney](../lib/money-contract.ts) enforces 1 through 1,000,000,000 inclusive. Do not claim the API explicitly rejects every value above that rating cap. The proposed showcase input range is the supported rating range, labeled accurately; do not modify the backend to resolve this during research.
- [Track route](../app/api/track/route.ts) authenticates the organization’s API key, normalizes the metric, requires an idempotency key for Customer-linked ingestion, resolves an active existing customer and metric, and still requires an active organization Subscription. The demo represents preconfigured valid prerequisites; it does not redefine or expose setup.
- Identical organization/key billable fingerprints return the original `eventId` and `acceptance: ACCEPTED` before current customer/subscription/time-window checks. Changed billable fields conflict. Acceptance commits a `LEDGER_ONLY` event with `PENDING` processing and durable processing intent. Accepted does not mean processed or rated.

## Exact money and price applicability

- [rateMoney](../lib/money-contract.ts): unit price is a nonnegative plain decimal, at most six integer and six fractional digits, maximum `999999.999999`; no exponent or sign. Integer micro-units and BigInt multiplication; half-up rounding once per event after multiplication to the currency scale pinned in [currency-scales.ts](../lib/currency-scales.ts). Maximum extended amount is `999999999999999` minor units; overflow is rejected. Money remains exact strings/integers, never floating-point arithmetic.
- [Rating worker](../worker/processors/rateCustomerEvent.ts) selects the latest PriceVersion with `effectiveFrom <= event.timestamp`, within the organization/metric. It requires processed ledger-only Customer usage. An existing persisted rating is not recalculated. Missing price is `UNRATED / NO_APPLICABLE_PRICE`, not zero; true zero-priced usage can be rated.
- [Persisted amount helpers](../lib/persisted-rated-amount.ts) serialize rated amounts to **three decimal places** (`Decimal(18,3)` storage). This is distinct from currency rounding. Monthly lines sum the individually rounded persisted event amounts exactly with BigInt; never multiply the aggregate quantity and round again. Preserve exact three-place payload/storage representations while currency display may use its appropriate scale.
- Future fixture review must demonstrate the editable quantity’s full permitted range does not overflow at the selected price and that seeded plus visitor event amounts reconcile. No fixture values are defined here.

## Calendar and lifecycle

- [Month and calculation](../lib/billing-record-calculation.ts): period is `[UTC month start, next UTC month start)` selected by occurrence time. Close is next month start plus 72 hours. Draft remains `OPEN` at the exact close; after close it is `READY_FOR_REVIEW` only when all eligible events are rated and reconciliation is balanced, otherwise `BLOCKED`.
- [Track route](../app/api/track/route.ts): new events received at close are allowed; after close rejected. Occurrence more than five minutes ahead of receipt is rejected. Exact retries can still return their original result after close.
- [Finalization](../lib/billing-record-finalization.ts) requires current owner authority and fresh resolved evidence, scenario time strictly after close, reconciled currency/amount/counts/quantities, and no existing final version for a new request. A request binding makes an identical finalization request idempotent. Finalization atomically creates a frozen version, current pointer, and `invoice.finalized` event. `READY_FOR_REVIEW` is not approval. Finalized UI presentation corresponds to the version/current pointer, not an invented draft status.
- Processing states (`PENDING`, `PROCESSING`, `PROCESSED`, `FAILED`) are separate from rating outcomes. Draft reconciliation distinguishes `LEDGER_PENDING`, `LEDGER_PROCESSING`, `LEDGER_FAILED`, `RATING_PENDING`, `RATING_RETRY`, `RATING_FAILED`, `UNRATED`, and `RATED`. The happy-path showcase must not flatten these into a misleading universal “complete.”

## Delivery and production boundary

- [Billing status](../lib/webhooks/billing-status.ts) distinguishes `PENDING`, `MIXED`, `FAILED`, `DELIVERED`, and `NO_TARGET`; [endpoint outcome](../lib/webhooks/billing-outcome.ts) distinguishes pending, delivered, failed, and disabled. No endpoint does not mean successful delivery. The first demo uses one synthetic successful target and preserves the BillingRecord/version/event linkage.
- The backend event name remains `invoice.finalized`, although the product object is a BillingRecord comparison calculation, not a tax invoice or payment request. Preserve the real name in technical payload details with a short explanation.
- Keep [readiness evidence](billing-webhook-readiness.md) and [representative operations limitations](representative-operations-evidence-2026-10-02.md) intact. Simulated delivery is not an HTTP request, signature verification, load measurement, or proof that deployed gates can open.

## Follow-up before fixtures

Recheck these sources if backend code changes. Record an exact fixture manifest with quantity, price, event-level rounded amounts, persisted representations, IDs, timestamps, close instant, and finalization time; verify it against the shared pure contract where possible. Resolve how the UI describes the rating quantity cap without claiming absent ingestion validation. This is a fixture/implementation prerequisite, not a blocker for visual research.
