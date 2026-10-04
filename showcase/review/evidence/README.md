# Ticket 03 — How it works & evidence

Recorded 2026-10-04. Base `f6adc01f89a620d5a42d5790a759ff95af165d69`; GitHub confirmed tickets 02 and 04–08 merged in PRs #110–115. Clean checkout, fetched main, dedicated `codex/showcase-03-evidence` branch. Ticket 03 only; no backend, database, production gates or deployment changes.

## Acceptance results

- Normal static build, showcase typecheck, focused ESLint and diff whitespace checks pass.
- Focused evidence checks: **10 passed**, Chromium and WebKit. All three direct entries and ordinary links, edited 1,500 quantity across evidence/landing/return and Back/Forward, domain and comparison-calculation semantics, processing/rating distinction, simulation boundaries, pending gates, exact source destinations, semantic headings, skip link and keyboard traversal through every content link, visible focus, usable return, reduced motion and no page overflow at 360/768/1440px.
- Full normal showcase suite: **138 passed, 48 isolated-fixture-only skipped**. Full isolated-fixture suite: **160 passed, 26 normal-only skipped**. The normal static export was rebuilt afterward. Existing lifecycle checks cover acceptance, rating, finalization and delivery; this slice specifically checks quantity preservation through the new page.
- Firefox: all five ticket tests failed before page creation with `Could not find profile folder`. Firefox behavior remains unverified, not passed.
- Initial focused checks exposed test navigation racing a route commit and WebKit's platform link traversal behavior. Tests now await the evidence heading before Back and use Option-Tab for WebKit link traversal; Chromium uses Tab. No state-reset workaround was introduced.

## Claim and destination audit

All 12 distinct pinned file destinations resolved through the GitHub contents API at `f6adc01`; every public source link is asserted independently by accessible name and exact href in Playwright. The implementation repository destination is also asserted. No fabricated contact link ships.

- `CONTEXT.md` supports Organization/Customer/User distinctions and comparison calculations.
- `app/api/track/route.ts` supports API-key organization scope, active prerequisites, immutable acceptance, original-event retries and PENDING processing intent.
- `worker/processors/rateCustomerEvent.ts` requires PROCESSED ledger usage and selects occurrence-time pricing; explicit missing-price evidence differs from pending rating and rated zero.
- `lib/money-contract.ts` and the linked contract report support exact event-level half-up arithmetic and the demo-range/API distinction. Backend files referenced by that report are unchanged from its `fe6d3ae` inspection baseline.
- `lib/billing-record-calculation.ts` supports UTC period/close and reconciliation; `lib/billing-record-finalization.ts` supports owner checks and atomic frozen version/event creation; `lib/webhooks/billing-status.ts` supports delivery versus event creation and NO_TARGET. The readiness report supplies attempt/retry/replay evidence.
- `showcase/app/run.ts` supports the explicit local transitions. The prior delivery review records its 2026-10-04 local static Chromium/WebKit checks and Firefox launch limitation. Those recorded results are not presented as this ticket's results.
- `docs/billing-webhook-readiness.md` records 2026-09-28 synthetic PostgreSQL/Redis/loopback checks and patched rollback limitations.
- Read **all follow-ups** in `docs/rollout-item-3-rehearsal-2026-10-02.md`: the 15:18 follow-up supersedes the initial backup blocker; the 16:01 follow-up supersedes the current-app build failure. Page copy acknowledges isolated restore/migration/inventory/rollback/current-app success and 35-table preservation, alongside provenance limits, no Customer/BillingRecord rows, unmeasured authenticated owner behavior and sender replay/RPO/RTO. It does not repeat superseded failures as current status.

No backend drills were rerun for this frontend slice. Historical environments and limitations remain explicit. Deployed gates remain closed.

## Agent visual inspection and accessibility limits

Inspected retained full-page captures at 360px, 768px and 1440px. Warm paper, Fraunces headings, ruled workflow and adjacent desktop annotations remain coherent. At 768px and 360px sections stack in reading order; technical text wraps and source links remain in their associated section. The page is intentionally long on mobile; return actions appear at both ends. No fixed overlay obscures content. Focus is visibly outlined on the final return link. State and limitations use words, not color alone.

This is agent visual/readability inspection plus automated keyboard and overflow evidence, not a human usability study. Native screen-reader testing, browser zoom, physical touch assessment and a complete WCAG 2.2 AA assessment remain pending. No full accessibility conformance claim. Verified contact destination and confirmed zero-cost hosting remain publication blockers.

Captures: [360px](evidence-360.png), [768px](evidence-768.png), [1440px](evidence-1440.png).

## Review

Standards axis: zero findings. Spec axis: zero material findings; its requested completion record is included here. Human PR review remains pending.
