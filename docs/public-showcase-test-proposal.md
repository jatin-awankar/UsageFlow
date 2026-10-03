# Three-page showcase: proposed acceptance approach

Status: approved by the user, 2026-10-04. This document retains the proposal reviewed in conversation; wording such as “propose” below records that review stage. The [published complete specification](../.scratch/public-showcase/spec.md) is authoritative. This is not an implementation ticket or a record of executed acceptance tests.

Inputs: [approved brief](../.scratch/public-showcase/spec.md), [backend contract verification](public-showcase-contract-verification.md), and [approved direction/reuse assessment](public-showcase-direction-decision.md).

## One primary acceptance boundary

Use the repository's existing Playwright runner against the built, locally served three-page showcase. Interact through links, labels, buttons, keyboard actions, and visible evidence; assert rendered behavior, not component trees, hooks, private state, or reducer functions. Default to roles and accessible names. Inspect browser network requests to establish that the demonstration performs no ingestion/finalization/API/webhook writes.

The suite needs no PostgreSQL, Redis, API keys, worker, production credentials, or receiver. Existing [monthly draft tests](../tests/customer-month-draft.spec.ts) provide behavioral examples for close boundaries, idempotency, and immutable evidence, but their database/worker harness is not the showcase acceptance boundary. Existing [price UI tests](../tests/first-price.spec.ts) provide Playwright role/label interaction patterns. The [money-contract tests](../tests/money-contract.test.ts) remain independent arithmetic prior art; browser expected amounts should be fixed hand-audited values, not computed by the same function as the app under test.

For otherwise unreachable boundary cases, propose one narrowly scoped **test-run initial scenario configuration**, selected when starting the isolated test build. It seeds the fixture/clock before the page loads; assertions and all subsequent transitions still use the browser UI. This permits exact-close, unresolved, and rounding-sensitive inputs without adding a public sandbox/debug route, exposing fixture overrides in a deployed build, calling private state setters, or changing the backend. Check the normal release build separately to ensure no test controls are exposed.

## Full three-page coverage

1. **Landing and navigation:** open a fresh browser context with no auth; confirm the product promise, synthetic/local label, and primary demo entry. Reach the demo and evidence page through ordinary navigation; browser Back/Forward and chapter/detail inspection retain current run progress. Direct URLs render usable initial states. No auth/database dependency or production-readiness claim is introduced.
2. **Complete journey:** accept a prepared event, observe pending/unrated evidence, simulate processing/rating, inspect price provenance and monthly contribution, review reconciled draft, explicitly advance scenario time, finalize once as the simulated owner, and inspect the linked `invoice.finalized` payload and successful simulated endpoint attempt. Every step carries the same source/version references. A ready draft is not already approved; a delivered notification is not payment collection. Finish with exploratory pilot contact and implementation links.
3. **Evidence page:** explain Organization/Customer and BillingRecord semantics, link traceable source and readiness evidence, and distinguish local synthetic checks from unverified production operation. Verify the intended source URLs and contact destination once supplied. Neither broken placeholder links nor an onboarding-available claim should ship.

## Calculation and retry cases

- Default INR `0.0025` × 1,250 = exact `3.125`, rounded half-up once to **3.13**; persisted representation **3.130**; baseline **25.000** plus event = **28.130**, displayed **28.13**. Check the source row, line total, final version, and webhook amount agree.
- Edit to 1,500 before acceptance: contribution **3.75**, final total **28.75**. One call yields a valid rated **0.00**, distinguishable from “not rated.” Two calls yield **0.01**, exercising the half-paise boundary.
- Include a test-only rounding-sensitive baseline: 6,001 calls rate to **15.00** and 4,001 to **10.00**; add one call rated **0.00**. Correct per-event sum is **25.00**; incorrectly multiplying aggregate 10,003 calls and rounding would produce **25.01**. This test dataset does not add a public scenario or change the primary 6,000/4,000 baseline.
- Verify missing/zero/negative/fractional values give accessible feedback without accepting an event. Proposed showcase control range remains **1–10,000**, explicitly described as a demo range, not an API constraint. Check both ends and an out-of-range value. The rating maximum must never be described as an enforced ingestion maximum.
- Identical retries before rating, after rating, and after the close return the original ID; source count, quantities, amount, and final version are unchanged. Repeat clicks must not create duplicate accepted events. Accepted billable fields cannot be edited; reset is the path to a different experiment.

## Time, finalization, and delivery cases

- Month is `[2026-09-01T00:00:00.000Z, 2026-10-01T00:00:00.000Z)` in UTC. A boundary fixture has events immediately before and at the next month start; the latter is excluded from September's record. Receipt time must not move an event to another occurrence month.
- At close minus 1 ms and exactly `2026-10-04T00:00:00.000Z`, the draft is OPEN and finalization unavailable. At close plus 1 ms, fully reconciled rated evidence permits review and explicit finalization. An accepted-but-unrated initial scenario remains blocked after close; inspecting or advancing time alone must not invent a rating.
- Advancing scenario time is explicitly labeled and does not depend on the visitor's timezone or wall clock. Repeat boundary checks under two browser timezones. No real wait of 72 hours is necessary.
- Before finalization there is no finalized version or outbound event. Finalization freezes one version and exposes one stable event identity. Repeated activation cannot create another version/event or alter approved amounts. Navigating back cannot silently mutate the frozen result.
- Show delivery only after finalization, through one synthetic selected target and a distinct successful attempt. The payload's BillingRecord/version/amount references match the frozen record. No target is not treated as delivered. Failure/replay remains outside the public story; do not broaden this suite into worker reliability testing.

## Session, reset, and recovery cases

- Open two independent browser contexts **and two tabs in one context**. Accept/rate/finalize/reset in one; the other retains its own baseline. Shared deterministic fixture IDs do not imply shared mutable state.
- **Proposed session policy:** in-memory, per-tab run; application navigation and evidence inspection preserve progress, while reload/closing the tab starts fresh, as in the prototype. Make this behavior clear in the demo. No localStorage persistence or cross-tab synchronization. This proposal requires approval as part of the testing checkpoint.
- Reset confirmation cancellation preserves everything. Confirmed reset clears accepted visitor usage, retry history, draft/finalization/delivery evidence, and scenario clock, restores the initial quantity and baseline, and restores usable focus. Reset affects no other tab.
- Test initial loading and not-yet-created states. Simulate a narrowly scoped initialization or recoverable action failure through the test-run configuration; preserve prior valid evidence, present an accessible recovery action, and verify retry/reset. Do not add a public fault-injection UI or fictitious backend outage story.
- Record outbound requests during the journey: no track/finalization API call, receiver POST, paid service, or secret use. Ordinary static assets/page navigation are allowed. This proves the observed browser behavior, not production infrastructure readiness.

## Keyboard, responsive, and visual checks

- Complete the full journey using keyboard only: skip link, quantity, validation, acceptance, retry, chapters, optional evidence disclosure, time transition, finalization, payload inspection, reset, and completion CTA. Verify focus visibility, logical order, disclosure state, dialog containment/Escape/restoration, and no obscured focused action. Significant updates must be available through accessible status messages.
- Check 360px, 768px, and 1440px layouts, plus zoom/reflow. No page-level horizontal overflow. All evidence remains available as readable text; technical payloads may use a contained scroller with an accessible label. The mobile inspector follows reading order and does not overlay actions. State is not communicated by color alone.
- Emulate reduced-motion preference in browser checks; transitions must preserve content and action availability. Add manual screen-reader, contrast, zoom, focus, and mobile touch-target checks. Automated accessibility checks are supporting evidence only; known limitations must be recorded against the WCAG 2.2 AA target.
- Use a small set of stable screenshots for human review of the chosen layout (landing, rated calculation/inspector, final record/delivery, evidence page at desktop/mobile). Avoid fragile pixel assertions for animation or entire-page snapshots as a substitute for behavioral checks.
- Proposed runtime matrix: main behavioral suite in Chromium; full happy-path, keyboard, and responsive smoke in Firefox and WebKit. Record unavailable browsers or platform limitations rather than claiming they passed.

## Release evidence and pending decisions

Record automated results and manual findings separately. The **four of five first-time evaluators completing unassisted within five minutes** criterion remains a usability validation target. Record actual individual completion, elapsed time, assistance, comprehension, and obstacles. No participant results exist yet. Accessibility conformance is not established by the prototype or this proposal.

The primary browser boundary, restricted test-run fixture/clock configuration, and per-tab reload behavior were approved before the complete specification was published using the `to-spec` template. Contact destination remains a release prerequisite. Implementation tickets and code changes remain out of scope for this checkpoint.

## Approval record

- 2026-10-04: User approved test-only fixtures/scenario clocks with actions and assertions through the rendered UI. Test controls must be unavailable in the published showcase except for the designed scenario-time transition.
- In-app navigation preserves progress; reload starts fresh; contexts and tabs remain independent. Explain this briefly in the demo.
- Currency expectations must be independently specified amounts, never generated by the implementation calculation helper. Explicitly verify finalization remains blocked exactly at close.
- Publish the complete three-page specification as `ready-for-agent`, retain human usability/full accessibility assessment as pending until performed, and show the specification before running `to-tickets`.
