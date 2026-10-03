# UsageFlow first public showcase

Status: ready-for-human

Scope approved in the planning conversation on 2026-10-03. Visual direction selection is pending. This document authorizes research and direction selection only; prototypes, implementation, backend integration, database changes, and deployment are not authorized by this stage.

## Audience and design brief

Technical SaaS founders and engineering leads are primary; recruiters and hiring managers are secondary. Explain product value first, with engineering evidence available for deeper inspection. A visitor should independently understand how accepted usage becomes a priced contribution to a monthly BillingRecord and a webhook notification.

Use editorial precision, expressive typography, readable technical detail, meaningful data visualization, thoughtful motion, accessibility, and responsive layouts. Develop a memorable identity rather than a generic administrative dashboard. Avoid decorative metric cards, blurred gradient blobs, and unsupported readiness claims. Final palette, fonts, and components await comparison of two genuinely distinct reference-supported directions, each covering the landing page and main demo screen.

## Release boundary and page inventory

1. **Landing:** explain UsageFlow, preview the traceable workflow, and lead with “Explore the demo.”
2. **Demo workspace:** one guided 3–5 minute story, with inspectable details and preserved progress. One synthetic organization, customer, metric, currency, and applicable PriceVersion; existing synthetic events provide monthly context. Visitors edit a positive integer quantity before acceptance, accept an immutable event, inspect occurrence-time pricing and its monthly contribution, review reconciliation, explicitly advance scenario time beyond the UTC month’s inclusive 72-hour close, simulate owner finalization, and inspect successful webhook delivery. An optional identical retry preserves the accepted event ID without double counting. Reset remains visible.
3. **How it works & evidence:** architecture, source links, recorded verification and its limitations, and outstanding pilot gates. Preserve existing readiness evidence rather than presenting the demonstration as new production evidence.

The primary completion CTA is “Discuss a pilot,” described as exploratory and subject to readiness review. “Inspect the implementation” is secondary. A simple contact link is sufficient; its destination is pending user input and must be supplied before release.

## Simulation boundary

Public, authentication-free, browser-local synthetic simulation with independent visitor sessions and deterministic reset. Label synthetic data, simulated actions, simulated delivery, and the time transition clearly. Do not send real ingestion or webhook requests or enable deployed gates. Reuse existing backend contracts; real backend/database integration is a later milestone after experience approval.

No hosting or API spending. Verify a suitable free hosting configuration and spending controls before a later publication decision; no provider has been selected or certified here. Do not introduce paid fonts, assets, services, templates, or API dependencies.

Backend limits, monetary precision, period boundaries, and status meanings take precedence over convenient demo behavior. See [the source verification](../../docs/public-showcase-contract-verification.md) before defining fixtures. No fixture dataset is approved by this document.

## Essential UI states

- Initial prepared scenario, visible reset, starting action, synthetic-data label, and clear learning outcome.
- Editable quantity and accessible inline validation for missing, zero, negative, fractional, and excessive values; immutable accepted event afterward.
- Acceptance result and stable event reference; optional identical retry visibly preserves identity, counts, and amounts.
- Separate accepted, ledger-processing, and rated states. A processed event alone is not proof of rating.
- Monthly draft with source contribution, exact total, UTC period/close instant, reconciliation, and review readiness. Show explicit scenario-time advancement before finalization becomes available.
- Frozen finalized comparison calculation linked to its webhook event, payload, and successful simulated attempt. Never imply a tax invoice, payment request, or actual charge.
- Accessible initialization and action feedback; truthful “not yet created” states for record/delivery stages not reached; recoverable initialization/action errors with retry or reset. Do not add deferred domain-failure scenarios merely to populate an error screen.
- Reset communicates that progress is discarded and returns to the original scenario.
- Keyboard focus, announced important updates, reduced motion, text alternatives for charts, and readable narrow-screen details.

## Release acceptance and validation targets

All are pending implementation and verification; approval of this brief is not a passing result.

1. Three public pages work without authentication, credentials, paid APIs, or production mutations.
2. **Usability target:** at least four of five first-time evaluators complete the primary journey without coaching within five minutes and can explain the event’s contribution to the BillingRecord. Record each participant’s actual completion, elapsed time, assistance, comprehension, and obstacles. **Pending human testing; no participants tested.**
3. Quantities, prices, rounded event amounts, exact monthly sums, and references reconcile throughout. Identical retries do not change event counts or amounts. Preserve verified backend contract details.
4. Visitor sessions cannot affect one another. Moving between stages and inspecting details preserves progress; reset restores baseline deterministically. Refresh persistence and cross-tab behavior will be specified before implementation, without introducing shared server state.
5. Display the UTC period and inclusive close. Simulated finalization requires scenario time strictly after close and fully reconciled rated evidence.
6. **Accessibility target:** WCAG 2.2 AA within the showcase scope. Document automated checks and manual keyboard, focus, screen-reader, contrast, zoom/reflow, and reduced-motion checks, including known limitations. Automated results alone never establish full conformance. **Pending implementation and assessment.**
7. Verify the journey at 360px, 768px, and 1440px widths without page-level horizontal overflow. Data remains available in text; status never depends only on color; reduced motion loses no information.
8. No real webhook traffic or production writes; deployed pilot gates and historical evidence remain unchanged. Verify free hosting terms, limits, and spending configuration before release.
9. Published claims match the cited evidence and explicitly distinguish local synthetic verification from production readiness.
10. Supply and verify the contact destination; no placeholder completion CTA ships.

## Deferred features and scope control

Defer administrative screens, customer management, settings, API keys, plans, standalone analytics, legacy invoices, arbitrary sandbox configuration, multiple customers/metrics/currencies, price scheduling experiments, pricing gaps, late-arrival scenarios, revisions, webhook failure/replay scenarios, real backend integration, and production onboarding. Explaining the close window does not add a late-arrival scenario.

Adding a scenario, page, data dimension, theme system, component framework, or admin redesign requires an explicit scope decision. Do not quietly turn library evaluation into a migration of the existing console. Preserve the current backend and avoid changes to settled billing-domain decisions.

## Next stage and open decisions

Research findings and two proposed directions are captured in [the visual research](../../docs/public-showcase-visual-research.md). Neither direction is selected.

Research a small curated reference set and legally reusable free resources. Present two distinct directions, each describing landing composition, demo workspace, typography, data presentation, and motion. Explain what each reference teaches; inspiration does not authorize copying proprietary assets. Verify font/component/template licences from primary sources. Prefer one coherent component foundation and existing dependencies where suitable.

Evaluate directions for immediate comprehension, distinctive identity, traceability, accessibility, responsive behavior, and implementation effort. Select a direction before implementation; the subsequent prototype comparison must cover both landing and main demo screen for each direction. No prototype work starts during research.

No remaining decision blocks reference research. Direction, exact content/brand details, fixture currency/business/month, refresh behavior, and resource selection remain later decisions. Contact destination and verified hosting configuration block release, not research. Quantity validation discrepancy is recorded in the linked source verification and must not be misrepresented as API behavior.

## Existing UI inventory

Source inspection, not runtime usability certification: Customer list/create, PriceVersion schedules and pricing-gap preview, and BillingRecord webhook attempts/replay have basic UI. Accepted-event inspection, general rating provenance, monthly Customer BillingRecord review, and the connecting journey need frontend work. Existing dashboard/analytics/billing/invoice screens use legacy Subscription/Plan/AggregatedUsage/Invoice semantics. Organization pages require authenticated database access. Public landing examples and readiness copy need alignment with the Customer/BillingRecord model.

## Comments

- 2026-10-03: User approved the scope with usability treated as a measured target and accessibility as a documented target, not an automated conformance claim. Requested code verification before fixture definition, then references and direction selection before prototypes.
- 2026-10-04: User subsequently authorized isolated throwaway prototypes of both directions, covering landing and main workspace plus bounded acceptance/retry/rating interactions. Full implementation and deployment remain out of scope. See [design review](issues/01-visual-direction-review.md); direction selection is pending.
- 2026-10-04, subsequent approval: User selected Annotated Ledger, preserving editorial layout and chapter progression. Explore a compact evidence inspector only where traceability improves without clutter or mobile regression. See [approved direction](../../docs/public-showcase-direction-decision.md). Complete-spec publication awaits review of [the browser acceptance proposal](../../docs/public-showcase-test-proposal.md); no implementation tickets are authorized yet.
