# UsageFlow first public showcase

Status: ready-for-agent

Published 2026-10-04 after user approval of the release boundary, Annotated Ledger direction, and browser-level testing approach. This specification replaces the earlier planning brief at this location while retaining its decision history below. The user has subsequently reviewed this specification and approved publication of implementation tickets 02–09. Ticket publication does not authorize implementation, backend integration, or deployment in this session.

## Problem Statement

Technical SaaS founders and engineering leads cannot yet independently follow UsageFlow's Customer billing model from accepted usage to an explainable monthly calculation and notification. The existing public landing page directs visitors into authentication and includes legacy terminology and readiness claims. Existing dashboard, analytics, billing, and invoice views largely represent the legacy Subscription/Invoice path. Basic Customer, PriceVersion, and webhook UI exists, but it does not provide a connected public journey through Customer usage and BillingRecords.

The first public showcase must make the product's value understandable without assistance, credentials, live customer data, or hosting/API spending. Recruiters and hiring managers are a secondary audience who should be able to inspect implementation evidence. A polished synthetic demonstration must not imply production readiness, a tax invoice, payment collection, or authorization to open deployed pilot gates.

## Solution

Deliver exactly three public, authentication-free pages: **Landing**, **Demo workspace**, and **How it works & evidence**. Use the approved **Annotated Ledger** direction: editorial typography, chapter progression, ruled calculations, and concise annotations. Borrow Signal Desk's compact evidence presentation only where it improves traceability within that layout and remains readable on mobile.

A visitor follows a guided 3–5 minute story for one synthetic Organization, Customer, metric, currency, and month. They edit a quantity, accept an immutable UsageEvent, optionally retry the same event, inspect occurrence-time pricing and its monthly contribution, review reconciliation, explicitly advance scenario time beyond the inclusive 72-hour close, simulate owner finalization, and inspect a successful simulated webhook delivery. The complete showcase replaces the prototype's finalization/delivery previews with these working local interactions.

All run state is in memory in the current tab. In-app navigation preserves progress; reload starts a fresh run; contexts and tabs are independent. Clearly label synthetic data and simulated actions. Reuse existing backend contracts without connecting the showcase to production APIs, workers, or a database. End with **Discuss a pilot**, described as exploratory and subject to readiness review, and **Inspect the implementation**.

## User Stories

1. As a first-time visitor, I want to understand what UsageFlow calculates, so that I can judge its relevance to my SaaS business.
2. As a technical founder, I want to enter a useful demo without signing up, so that I can evaluate the product immediately.
3. As a visitor, I want synthetic data and simulated actions clearly identified, so that I do not mistake the showcase for a live billing system.
4. As an engineering lead, I want to follow one Customer's usage through the complete workflow, so that I can understand the relationship between each result.
5. As a visitor, I want the Organization and Customer distinguished, so that I know whose usage is being calculated and who operates the account.
6. As a visitor, I want to edit a modest whole-number quantity before acceptance, so that I can explore its monetary effect.
7. As a visitor, I want clear validation and an accurately described demo range, so that invalid input is understandable without misstating API limits.
8. As a visitor, I want acceptance to return a stable event identity, so that I can trace the same event afterward.
9. As a visitor, I want accepted fields to become immutable, so that later evidence continues to describe what was originally accepted.
10. As an integrator, I want an identical retry to return the original event, so that I can see why retransmission does not double count usage.
11. As a visitor, I want acceptance, ledger processing, and rating distinguished, so that I do not mistake accepted usage for a completed calculation.
12. As a visitor, I want to inspect the occurrence timestamp and effective PriceVersion, so that I understand why that price applies.
13. As a visitor, I want to see quantity, unit price, rounding, and rated contribution together, so that I can explain the amount.
14. As an engineering lead, I want exact amounts and source references available, so that I can reconcile what the UI displays with the technical evidence.
15. As a visitor, I want a rated zero distinguished from an unresolved rating, so that a small legitimate amount is not shown as missing work.
16. As a visitor, I want to see the event alongside earlier synthetic usage, so that I understand its contribution to the monthly total.
17. As a visitor, I want accepted and rated counts and quantities reconciled, so that I know whether the monthly calculation is complete.
18. As a visitor, I want the UTC month boundaries and close instant displayed, so that I understand which period contains the event.
19. As a visitor, I want scenario-time advancement explicitly explained, so that I understand the late window without waiting in real time.
20. As a visitor, I want finalization blocked through the exact close instant, so that the demo preserves the actual timing rule.
21. As a visitor, I want unresolved usage to block readiness after close, so that incomplete work cannot appear approved.
22. As a simulated owner, I want to review and explicitly finalize a ready calculation, so that approval is distinct from readiness.
23. As a visitor, I want the finalized version frozen and linked to its sources, so that its amount cannot silently change when I revisit earlier chapters.
24. As a visitor, I want repeated activation of finalization to preserve one result, so that duplicate clicks do not create duplicate versions or notifications.
25. As an integrator, I want to inspect the finalized BillingRecord's webhook event and payload, so that I understand the integration output.
26. As a visitor, I want a visible selected endpoint and successful simulated attempt, so that delivery means an outcome rather than merely the existence of an event.
27. As a visitor, I want the BillingRecord described as a comparison calculation, so that I do not infer a tax invoice, payment request, or charge.
28. As a visitor, I want to move among chapters and the evidence page without losing progress, so that I can investigate details at my own pace.
29. As a visitor, I want a short explanation that reload starts fresh, so that the session behavior is predictable.
30. As a visitor, I want independent tabs and sessions, so that another visitor's actions cannot affect my run.
31. As a visitor, I want a visible reset with clear consequences, so that I can try a different quantity without uncertainty.
32. As a visitor, I want cancelling reset to preserve my run, so that I can return to the current evidence safely.
33. As a visitor, I want truthful loading, not-yet-created, and recoverable-error states, so that missing output is not mistaken for a successful calculation.
34. As a keyboard user, I want logical focus and operable controls throughout, so that I can complete the story without a pointer.
35. As a screen-reader user, I want semantic content and meaningful outcome announcements, so that I can follow the same evidence and transitions.
36. As a mobile visitor, I want a readable single-column sequence and accessible evidence, so that technical detail does not obstruct the next action.
37. As a visitor who prefers reduced motion, I want all information and actions available without animation, so that motion is not required to understand the story.
38. As an engineering lead, I want source and verification links with clear limitations, so that I can assess claims beyond the visual demonstration.
39. As a potential pilot participant, I want a simple contact link that explains readiness review, so that I know the next step is an exploratory discussion.
40. As the project owner, I want a finite, zero-spend showcase with preserved readiness evidence and closed pilot gates, so that public presentation does not silently expand operational scope.
41. As the project owner, I want actual usability results and documented accessibility findings, so that release claims reflect performed evaluation rather than assumptions.

## Implementation Decisions

### Page inventory and navigation

- **Landing:** lead with the product outcome and a legible worked example, the synthetic/local/no-signup boundary, and Explore the demo. Explain acceptance, price provenance, and accountable delivery in a short editorial sequence. Link How it works & evidence and the implementation. Avoid generic dashboard metrics, unsupported latency/capacity claims, and claims that production onboarding is available.
- **Demo workspace:** preserve Annotated Ledger's four chapters: Accept usage; Inspect pricing; Monthly record; Webhook delivery. Earlier chapters remain inspectable after advancement. A chapter can explain an unavailable next result, but its mutation actions remain guarded by prerequisites. Keep a visible reset and a concise persistent Customer/month context. Do not add standalone customer, pricing, billing-admin, or webhook-management pages.
- **How it works & evidence:** explain the domain parties and calculation pipeline; distinguish the real backend's acceptance/processing/rating/finalization/delivery responsibilities from the local simulation. Present source and verification references with dates, environments, and limitations. Preserve existing local/synthetic evidence and outstanding production rollout gates without implying that the showcase closes them. Provide a return to the current demo and the two completion links.
- Provide ordinary, accessible navigation and direct-entry support for all three pages. In-app navigation, chapter changes, details, and Back/Forward within the live app retain the current run. A fresh page load, including reload or a new tab, initializes baseline data.
- Completion prioritizes Discuss a pilot, with exploratory/readiness-review wording; Inspect the implementation is secondary. Use a simple contact link. The owner must supply its destination before release; no placeholder or assumed contact address may ship.

### Approved design and bounded refinements

- Preserve editorial composition, chapter progression, generous hierarchy, paper/ink surfaces, ruled monetary evidence, and adjacent annotations. Fraunces headings and Inter body/data are the selected direction's starting typography; refine sizes, contrast-tested accents, spacing, and mobile wrapping without reopening the visual direction.
- Incorporate an evidence summary into the existing margin only if it improves source tracing: selected event ID, processing/rating labels, PriceVersion, and contribution. Longer details use explicit disclosure. Avoid a third column, competing duplicate totals, or a new operational console.
- On mobile, evidence follows the relevant calculation in reading order. No fixed inspector overlay or miniature desktop split panes. Core event identity and contribution must be readable without opening raw JSON. The next action must remain findable and unobscured.
- Reuse the existing Tailwind styling foundation, Radix for needed interaction primitives, and a small Lucide subset. Do not introduce an additional component kit, full template, theme switch, or animation framework. Use Recharts only if a quantitative chart materially improves understanding; a ruled calculation and source list are sufficient for this release.
- Motion explains a user-triggered transition or highlights a newly included contribution. No money-counting animation, scroll hijacking, ambient telemetry, or artificial delays for atmosphere. Reduced-motion presentation preserves the same information and controls.
- Self-host only needed, licensed fonts and preserve required notices. The multi-direction prototype font bundle is not a production asset budget. Reference websites provide inspiration, not permission to copy their branding/assets.

### Application boundary, session, and prototype reuse

- Build a public frontend experience using the existing React/Next foundation while keeping authentication, production data queries, and protected organization layouts out of the showcase dependency path. Its operation must not require API keys, a database, workers, or an external receiver. No backend/schema/migration change is required.
- Keep one in-memory simulation per tab above the showcase's in-app page navigation. Do not use localStorage, sessionStorage, a shared server session, or cross-tab synchronization to preserve runs. Explain briefly: “Progress stays in this tab while you explore. Reload to start fresh.”
- Browser contexts and tabs may use the same deterministic fixture identifiers, but they must share no mutable run state. Confirmed reset recreates baseline data, clears visitor acceptance/retries/finalized version/delivery, resets the scenario clock and chapter, and restores usable focus. Cancelling reset changes nothing.
- Keep the original two-direction prototype as a design reference on its throwaway branch. The code assessment found mixed rendering/state, duplicated INR arithmetic, aggregated baseline constants, preview-only lifecycle stages, and broad compressed styles. Do not promote it wholesale. Extract only reviewed copy, semantic controls, interaction patterns, assets, and layout ideas; rebuild the chosen presentation and guarded simulation appropriately.
- Separate presentational concerns from deterministic local simulation and exact money handling. Prefer reuse of existing browser-safe pure contract logic after dependency review; never import database/Prisma modules into the client. Existing backend behavior is authoritative and unchanged. Backend integration remains a later milestone.

### Public fixture and exact calculations

- Use the established Northstar API Organization, Orbit Studio Customer with external ID `orbit_studio`, metric `API_CALL`, currency INR, and September 2026 occurrence month. One applicable immutable PriceVersion, `pv_api_sep_01`, is effective from 2026-09-01 00:00:00.000 UTC at INR 0.0025 per call.
- Represent baseline usage as two inspectable rated events, not an unexplained aggregate: 6,000 calls at 2026-09-10 12:00 UTC contribute INR 15.00; 4,000 calls at 2026-09-20 12:00 UTC contribute INR 10.00. Their receipt times equal occurrence times. Preserve stable source references and exact representations `15.000` and `10.000`; baseline count is two and quantity is 10,000.
- Default visitor event: 1,250 calls occurred 2026-09-28 14:32:00.000 UTC, received at the initial scenario time 2026-09-28 14:32:02.000 UTC. Use a stable synthetic event identity such as `evt_demo_0125` and a stable run-scoped idempotency identity. Customer, metric, occurrence, and receipt are prepared; only quantity is editable before acceptance.
- The public quantity control permits 1–10,000 whole calls, explicitly described as the **demo range**. Missing, zero, negative, fractional, nonnumeric, and out-of-range values cannot accept an event and receive accessible feedback. This modest range is supported by both the verified input validator and rating function, with no monetary overflow at the chosen price.
- Preserve the documented discrepancy: ingestion validates positive integer quantity without an explicit 1,000,000,000 maximum, while rating enforces that maximum. Do not change either backend behavior or call the rating cap an ingestion constraint. The narrower demo range is not an API contract.
- Rate with integer micro-units/arbitrary-precision arithmetic, half-up once after multiplication to INR's two-decimal minor-unit scale. Monetary values remain exact strings/integers. Preserve three-decimal rated/payload evidence without introducing a second rounding pass. Sum individually rounded rated events for lines and the monthly total; never price the aggregate quantity instead.
- Default exact product is INR 3.125, rounded contribution **3.13**, exact persisted-form evidence **3.130**, total **28.130**, displayed **INR 28.13**. At 1,500 calls the contribution is **3.750**, total **28.750**. One call legitimately rates to **0.000**, unlike an event that has not been rated; two calls rate to **0.010**.

### Acceptance, rating, and monthly calculation

- Acceptance is a distinct simulated action that creates one immutable ledger-only usage fact and displays its ID, Customer, metric, quantity, occurrence/receipt, and processing state `PENDING`, with reconciliation outcome `LEDGER_PENDING`. Rating is awaiting processing; no RatedEvent or monetary contribution exists yet. It does not immediately claim a rated amount. Lock accepted billable fields; reset is the only public way to start a different experiment.
- Identical retries return the original event identity and original billable evidence before or after rating and after the close. A retry does not change accepted/rated counts, quantities, amounts, or a final version. Guard rapid/repeated actions as well as ordinary sequential clicks. A changed-payload conflict experiment is not added to this release.
- An explicit simulation action completes processing and rating using occurrence-time price applicability. Distinguish ledger PROCESSED from a successful RATED outcome, including in the inspector. Do not use one generic “complete” label for all stages. If intermediate processing is displayed, it must not imply rating before the rated evidence exists. Processing `PROCESSING` maps to `LEDGER_PROCESSING`; processing `PROCESSED` without rated, failure, retry, or missing-price evidence maps to `RATING_PENDING`. These are processing states and reconciliation outcomes, not an invented shared rating-state enum. `UNRATED / NO_APPLICABLE_PRICE` denotes explicit missing-price evidence and must never label usage merely awaiting processing/rating. The public fixture has an applicable price; it does not introduce a missing-price scenario.
- Monthly calculation shows every eligible accepted source, each monetary contribution when rated, applicable price provenance, accepted/rated counts and quantities, total, and reconciliation. Pending usage has no invented zero amount. Only verified Customer ledger-only usage belongs to this fixture; no legacy attribution or invoice calculation is performed.
- The September period is the half-open interval from 2026-09-01 00:00:00.000 UTC through, but excluding, 2026-10-01 00:00:00.000 UTC. Occurrence time selects the period and applicable PriceVersion. Receipt time does not shift the occurrence month.

### Explicit scenario time, finalization, and webhook

- Display the period and inclusive late close **2026-10-04 00:00:00.000 UTC**. Keep the draft OPEN while scenario time is at or before close. **Finalization exactly at close remains blocked.**
- The public time-transition action clearly explains the jump from the prepared September scenario to **2026-10-04 00:00:00.001 UTC**, just after the 72-hour close. Show before/after scenario times and the reason for the transition. This does not wait on or change the user's wall clock. Do not expose an arbitrary public clock editor or advance time silently during navigation.
- Strictly after close, a fully rated and reconciled calculation is READY_FOR_REVIEW; unresolved or inconsistent evidence makes it BLOCKED with a truthful explanation. Advancing time or inspecting another chapter never invents rating evidence. The happy path remains one resolved scenario; these guards do not add public recovery stories.
- Finalization is explicit simulated owner approval of the reviewed, currently reconciled calculation. Recheck eligibility when invoked. Freeze one immutable version and its line/source/amount evidence; create its linked `invoice.finalized` event in the same local transition. A ready draft is not already approved. The frozen version is not a new draft status invented in place of the backend's version/current-pointer model.
- Repeated finalization activation preserves the same result and cannot create another version/event. Returning to earlier chapters or retrying acceptance must not alter the frozen monetary record. Corrections/revisions remain deferred; reset starts another independent experiment.
- Present one synthetic subscribed endpoint, one pending delivery linked to the created event, and a user-visible simulated delivery action that records a successful attempt/outcome. No HTTP request is sent. Before finalization, no outbound event exists; before the simulated attempt, delivery is not successful. Empty target selection must never imply delivery success.
- Make BillingRecord, version, and webhook event identities distinct but cross-linked. Technical payload details preserve `invoice.finalized`, creation time, Organization/Customer, BillingRecord/version, UTC period, currency, and exact amount. Explain the compatibility event name without renaming the product object to an Invoice. Do not fabricate a real signature-verification or receiver-acknowledgment claim.
- Monetary records remain comparison calculations, not tax invoices, payment requests, or authority to charge. The simulation is transient browser evidence, not backend durability or production-readiness evidence.

### Required states, accessibility, and release boundaries

- Provide initial/loading feedback, quantity validation, prepared/accepted/processed/rated states, draft OPEN/BLOCKED/READY_FOR_REVIEW, frozen approval, pending/successful simulated delivery, reset confirmation, and completion. Not-yet-created records/events are explained rather than displayed as zero-valued completed results.
- Recoverable initialization/action errors preserve prior valid evidence and offer a working retry/reset. Avoid invented network/worker errors when no network/worker operation occurs. Test-only fault configuration may exercise these states; no public fault-injection UI is added.
- Use semantic headings, labels, landmarks, status messages, keyboard-operable disclosures/dialogs, logical focus order, visible focus, and meaningful focus restoration. Do not obscure focus with fixed controls. Provide textual equivalents for any visualization; do not encode status solely with color. Target WCAG 2.2 AA, with automated and manual findings recorded separately.
- Support 360px, 768px, and 1440px layouts and zoom/reflow without page-level horizontal overflow. Long payload content may have a labeled contained scroller. Technical details must remain readable, not simply shrink to fit.
- Zero hosting or API spending is a release constraint. Select and verify a free hosting configuration and controls before a separate deployment decision; this specification selects no provider or SLA. No paid fonts/templates/services are introduced. Contact destination and hosting verification remain release prerequisites.
- Preserve production-readiness records, legacy workflows, and closed deployed Customer ingestion/finalization gates. Showcase success must never be used as a rollout approval.

## Testing Decisions

### Approved boundary and test controls

- Use the existing Playwright runner against the built, locally served complete showcase. Drive actions and assertions through the rendered UI using accessible roles/names and visible evidence. Do not assert component structure, private state, or reducers as the feature's acceptance boundary.
- Tests need no database, Redis, worker, API keys, production secrets, or live receiver. Existing Customer monthly-draft tests provide behavioral prior art for close boundaries and immutable evidence; existing price UI tests provide role/label interaction patterns. Their backend test harnesses are not required by this frontend suite. Existing money-contract tests remain separate prior art.
- Use a restricted test-run initial fixture/scenario-clock configuration for otherwise unreachable boundary cases. Select it when starting an isolated test build, before page load. Thereafter, drive actions and assertions through the UI; do not call private setters or bypass action guards.
- **Published showcase builds must not expose or honor test fixture, clock, or fault controls.** Verify the normal build separately, including that test-only configuration paths/parameters cannot select a fixture or change time. The explicitly designed public scenario-time transition is the only exception; it cannot act as an arbitrary clock editor. Do not repurpose deployed backend feature gates for these controls.
- Monetary assertions use **independently specified, reviewed literal expected amounts**. Never import the application calculation helper to generate expected results at test runtime. Inspect consistent visible source, line, final-version, and payload values, not merely agreement among outputs computed by the same defective algorithm.

### Acceptance cases

1. **Public pages:** fresh unauthenticated entry works for Landing, Demo workspace, and How it works & evidence. Product meaning, synthetic labels, navigation, primary CTA, implementation link, and evidence limitations are present. Direct entry has a useful baseline; no production database or authentication dependency is exercised.
2. **Full journey:** edit/accept → processing `PENDING` / reconciliation `LEDGER_PENDING`, with rating awaiting processing and no amount → process/rate → inspect PriceVersion/contribution → reconciled monthly draft → explicit scenario-time transition → owner approval → frozen version → linked pending event → successful simulated delivery → completion CTAs. Trace references and facts throughout. Readiness alone does not finalize; event creation alone does not mean delivery.
3. **Exact default/edited amounts:** assert 1,250 calls produce contribution `3.130` / INR 3.13 and total `28.130` / INR 28.13; 1,500 produce `3.750` / INR 3.75 and total `28.750` / INR 28.75. Payload amounts retain exact representations. One call is RATED with `0.000`, total `25.000`; two calls contribute `0.010`, total `25.010`.
4. **Per-event rounding trap:** test-only baseline has 6,001 calls rounded to INR 15.00 and 4,001 rounded to INR 10.00; one further call rounds to INR 0.00. Assert **INR 25.00**, not INR 25.01 (the incorrect aggregate-quantity result). This is a test fixture, not an additional public scenario.
5. **Input and immutability:** check the demo range's 1 and 10,000 endpoints and missing/zero/negative/fractional/nonnumeric/out-of-range input. Invalid input creates no event. Valid accepted fields become immutable; the UI never describes the rating maximum as an enforced ingestion constraint.
6. **Retries:** retry the exact event before rating, after rating, after close, and after finalization. Assert identical ID/fields, unchanged counts/quantities/amounts/frozen version. Exercise rapid repeated acceptance and retry activation; never add duplicate contribution.
7. **Month boundaries:** a test fixture includes events at month start, immediately before next month start, and exactly at next month start; only the first two belong to September. Receipt time does not reassign the month. Applicable price is selected at occurrence time, not the time the visitor clicks Rate.
8. **Close boundary:** use initial clocks at `2026-10-03T23:59:59.999Z`, `2026-10-04T00:00:00.000Z`, and `2026-10-04T00:00:00.001Z`. The first two remain OPEN and cannot finalize; **exactly at close is blocked even with all events rated**. The last permits readiness only when fully reconciled. Verify no frozen version or webhook event is created by blocked activation.
9. **Unresolved evidence:** after-close fixtures with processing `PENDING` / reconciliation `LEDGER_PENDING`, or processing `PROCESSED` / reconciliation `RATING_PENDING`, remain BLOCKED; navigating or advancing time does not rate them. Neither fixture displays `UNRATED / NO_APPLICABLE_PRICE` or an invented zero contribution. Once the UI's processing/rating action resolves it and reconciliation passes, readiness may change without implying owner approval.
10. **Clock independence:** run boundary checks in UTC and Asia/Kolkata browser timezones and with differing real system dates. Visible scenario instants and eligibility remain identical. The public transition shows before/after dates and advances to the specified post-close instant without a real-time wait.
11. **Finalization and delivery:** repeated approval yields one unchanged final version/event. Check source/line totals and IDs against frozen evidence and payload; retry/navigation cannot alter them. No delivery success appears before the simulated attempt. A no-target test fixture is not reported as delivered. No actual receiver request occurs.
12. **Independent sessions:** create two browser contexts and two tabs within one context. Mutate/reset/finalize one and confirm the others retain their own baseline/run. Do not require globally unique fixture IDs; require independent state.
13. **Navigation and reload:** progress survives in-app page/chapter/detail navigation and Back/Forward within the app. Reload starts fresh with initial quantity, clock, two baseline events, and no visitor event/final version/delivery. A brief visible explanation matches this behavior.
14. **Reset:** cancellation preserves all state. Confirmation clears visitor usage, retries, calculated/frozen/delivery evidence, and clock advancement; restores baseline INR 25.00 and editable 1,250; returns focus usefully. Other tabs remain unchanged.
15. **Loading, empty, recovery:** delayed initialization does not show invented final evidence. Unreached stages explain not-yet-created output. Test-only recoverable initialization/action failures expose usable retry/reset, retain prior valid evidence, and cannot leave partial finalized/event state. No public debug interface ships.
16. **Keyboard and inspector:** complete the journey without pointer input, including quantity validation, retry, chapter changes, optional margin/mobile evidence, time transition, finalization, delivery details, reset, and completion links. Check focus visibility/order, disclosure state, dialog containment/Escape/restoration, unobscured actions, and accessible outcome announcements.
17. **Responsive and motion:** verify 360px, 768px, and 1440px and zoom/reflow. No page-level horizontal overflow or inspector obstruction; evidence retains logical reading order and textual access. Emulate reduced motion and verify the complete journey remains operable with no information lost. Capture a small set of stable desktop/mobile views for human layout review rather than relying on brittle full-page pixel equality.
18. **Network and claims:** observe journey requests; no real ingestion/finalization/receiver writes, secret use, or paid-service dependency. Static assets and ordinary navigation are allowed. Evidence copy correctly scopes recorded verification, and public links resolve to their intended source/contact destinations. No unsupported capacity/recovery guarantee or instant onboarding claim is published.
19. **Release-build isolation:** run the happy path in the normal build as well as the isolated boundary-test build. Verify fixture/clock/fault test controls and prototype comparison controls are unavailable in the normal build. Review the change scope to confirm backend gates and readiness records are untouched; browser checks alone cannot prove server rollout safety.

### Validation records and release assessment

- Main automated behavioral suite: Chromium. Full happy-path, keyboard, and responsive smoke: Firefox and WebKit. Record browser/version, fixture, run date, failures, and unavailable environments instead of treating unrun checks as passes.
- Automated accessibility checks support, but do not replace, manual keyboard, screen-reader, contrast, zoom/reflow, reduced-motion, and touch-target checks. Record findings and known limitations against the WCAG 2.2 AA target. **Full accessibility assessment is pending until performed; no full-conformance claim follows from automated tests alone.**
- **Human usability validation is pending; no participant results have been recorded.** Target: at least four of five first-time evaluators complete the main journey without coaching within five minutes and explain how the event contributes to the BillingRecord. Record each participant's completion, elapsed time, assistance, comprehension, and obstacles; never manufacture a pass from automated timing or agent review.
- Readiness for public release requires passing functional checks, reviewed visual/accessibility findings with explicit limitations, recorded usability results or an explicit later release decision addressing unmet targets, a verified contact destination, and verified zero-spend hosting configuration. This specification does not itself complete any release check or authorize deployment.

## Out of Scope

- Beginning implementation in the ticket-publication session; publishing approved tickets is authorized, but does not authorize executing them.
- Backend/database integration, schema changes, migrations/backfills, legacy Customer attribution, production writes, or opening deployed pilot gates.
- Real webhook delivery, hosted receivers, signature-verification demonstrations, queue/worker reliability drills, or new capacity/recovery guarantees.
- Customer/admin management, authentication/onboarding, API keys, team settings, legacy Plans/Invoices, standalone analytics, or redesigning the existing protected console.
- Arbitrary sandbox inputs, additional public customers/metrics/currencies/months, tiered pricing, discounts/taxes, price scheduling/gaps, late-arrival scenarios, revisions/adjustments, webhook failure/replay stories, and payments.
- Persistent saved runs, cross-tab synchronization, a public clock/fixture/fault editor, dark mode/theme switching, additional component frameworks, or a general simulation engine.
- Paid services/assets/templates, deployment, or selecting an unverified hosting provider as part of specification publication.

## Further Notes

- This is the finite first-release specification in the repository's local Markdown issue tracker. `ready-for-agent` marks specification readiness, not completion of implementation, human testing, accessibility assessment, or production rollout.
- Source context: [domain glossary](../../CONTEXT.md), [pilot specification](../../docs/pilot-specification.md), [backend contract verification](../../docs/public-showcase-contract-verification.md), [visual research](../../docs/public-showcase-visual-research.md), and [approved direction/reuse assessment](../../docs/public-showcase-direction-decision.md).
- The verified backend contract files remain unchanged from baseline `fe6d3aee6c6726422f21c1fbd9dd02367275892d` at publication. Recheck them if they change before implementation. The quantity-cap discrepancy remains documented, not silently fixed.
- Design primary source: prototype commit `e2ef35e` on `codex/prototype-showcase-directions`, with [fixture and review notes](prototype/README.md). Approval selects Annotated Ledger's direction; it does not certify or authorize wholesale reuse of prototype code.
- The [test proposal and approval record](../../docs/public-showcase-test-proposal.md) documents the agreed browser boundary. Test fixture/clock controls are isolated from published builds; expected monetary amounts are independent literals.
- Remaining bounded visual refinements: compact inspector treatment, technical-label readability, contrast/spacing, complete later-chapter/evidence layouts, reduced-motion/focus details, and selected font optimization. None authorizes additional pages or scenarios.
- Contact destination and verified free hosting configuration remain external release prerequisites. Human usability validation and full accessibility assessment remain pending. Do not mark them complete based on prototype checks.

## Comments

- 2026-10-03: User approved the scope with usability treated as a measured target and accessibility as a documented target, not an automated conformance claim. Requested code verification before fixture definition, then references and direction selection before prototypes.
- 2026-10-04: User subsequently authorized isolated throwaway prototypes of both directions, covering landing and main workspace plus bounded acceptance/retry/rating interactions. Full implementation and deployment remain out of scope. See [design review](issues/01-visual-direction-review.md); direction selection is pending.
- 2026-10-04, subsequent approval: User selected Annotated Ledger, preserving editorial layout and chapter progression. Explore a compact evidence inspector only where traceability improves without clutter or mobile regression. See [approved direction](../../docs/public-showcase-direction-decision.md). Complete-spec publication awaits review of [the browser acceptance proposal](../../docs/public-showcase-test-proposal.md); no implementation tickets are authorized yet.

- 2026-10-04, publication approval: User approved Playwright UI acceptance, isolated test-only fixtures/scenario clocks, independent per-tab in-memory runs, in-app progress preservation, and fresh runs on reload. Required independent monetary expectations and finalization blocked exactly at close. Published this complete specification as ready-for-agent; show it before running to-tickets. No implementation tickets or code changes are included.

- 2026-10-04, ticket publication approval: User approved tickets 02–09 and their dependency order. Clarified processing PENDING / reconciliation LEDGER_PENDING and PROCESSED / RATING_PENDING versus explicit UNRATED / NO_APPLICABLE_PRICE. Tickets 05–08 must distinguish display INR 3.13 from exact persisted-form/payload 3.130. Contact verification and confirmed zero-cost static hosting remain publication blockers; human usability and full accessibility assessment remain pending until performed. No implementation is authorized in this session.
