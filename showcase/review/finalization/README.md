# Ticket 07 finalization evidence

2026-10-04. Started from clean, updated main `b21815c`, containing ticket 06 / merged [PR #113](https://github.com/jatin-awankar/UsageFlow/pull/113). Branch: `codex/showcase-07-finalization`. Scope: local simulated approval, immutable BillingRecord evidence and one linked pending event. No delivery implementation, backend/schema/gate changes or deployment.

## Behavior

Readiness remains distinct from explicit owner approval. The approval dialog defaults focus to “Keep reviewing”; Escape/cancellation preserves the draft. Confirmation rechecks the current run's reconciliation and strictly-after-close eligibility. A single reducer transition publishes a detached, recursively frozen version and linked pending `invoice.finalized` event together. Repeated activation returns the same result. A fault after constructing the candidate version but before constructing the event discards both; valid draft evidence remains available for another explicit approval.

The frozen version includes original accepted events, occurrence-time PriceVersions, rated source amounts, line/source references, period/close, owner/approval instant, reconciliation counts/quantities and exact total. Inspectable JSON preserves three-place amounts; the event payload follows the backend's organization/record/customer/period/version/currency/amount fields. The immutable event envelope also records its scenario creation time; the technical event name is explained as a comparison calculation, not a payment or tax invoice. Event creation never implies delivery; delivery remains disabled with no attempt.

Independent browser expectations:

- 1,250 visitor calls: source INR 3.13 / exact 3.130; 3 accepted/rated events, 11,250 calls; total INR 28.13 / exact 28.130.
- 1,500 visitor calls: source INR 3.75 / exact 3.750; 3 accepted/rated events, 11,500 calls; total INR 28.75 / exact 28.750.
- Stable version `brv_demo_sep_2026_1`, source `evt_demo_0125`, PriceVersion `pv_api_sep_01`, line `line_demo_api_sep_1`, event `wh_demo_finalized_1`. Frozen time `2026-10-04T00:00:00.001Z`.
- Fully rated drafts at close minus 1 ms and exactly close remain OPEN. Invoking their focusable aria-disabled approval controls creates no dialog, version or event and announces blocking.
- After-close PENDING / LEDGER_PENDING, PROCESSED / RATING_PENDING and inconsistent source fixtures block approval. Explicit processing/rating resolves the pending fixtures; navigation cannot relabel them as missing-price outcomes.
- Rapid double confirmation, repeated finalization, identical event retries after close/finalization, earlier chapters, Landing/Back and delivery chapter inspection retain exact version/event JSON and source totals.
- Reset cancellation preserves the result; confirmation clears it, restores editable 1,250, baseline INR 25.00 and the initial clock, focuses quantity and leaves another tab's finalized INR 28.750 untouched.

## Validation

Tests use rendered accessible roles/names and visible evidence against built static exports. No internal state setters or arithmetic-derived money expectations. Playwright 1.63.0; Chromium 153.0.8010.12 and WebKit 26.6 on this host.

- Full isolated build: **136 passed, 26 normal-only skips, zero failures**. Includes exact-close, unresolved-evidence and recoverable failure checks.
- Full normal build after review fix: **114 passed, 48 isolated-only skips, zero failures**. Focused isolated finalization rerun after the creation-time fix: **26 passed, 2 normal-only skips**.
- Firefox smoke could not run: browser launch fails before page creation with “Could not find profile folder.” Retrying with `/private/tmp` produces the same error. One launch failure, three remaining smoke checks not run; no Firefox pass is claimed.
- Root and showcase TypeScript, focused ESLint, whitespace checks and existing pure money contract tests (3 passed) pass.
- Normal compiled browser JavaScript has no test-finalization, test-monthly, test-pricing, test-init, fail-once, mismatched-source or boundary-source markers. Public normal-build tests ignore fault/clock/fixture parameters. The normal export is restored after isolated testing.
- Journey network observation sees only local static GET/HEAD requests, no receiver/API writes.

The first test failed against disabled pre-ticket finalization, then passed after implementation. Test refinements await the existing chapter focus handoff before Tab, assert containment without assuming browser-specific focus wrapping, await Landing before Back, scope error assertions to main (excluding Next's route announcer), and replace retired entry placeholder wording with the current no-version/event evidence. All retain the agreed UI boundary.

Backend integration/database suites were not run for this frontend-only slice. No migration/backfill took place.

## Visual and accessibility findings

[Desktop 1440px](finalization-1440.png) · [Tablet 768px](finalization-768.png) · [Mobile 360px](finalization-360.png).

[Approval 1440px](approval-1440.png) · [Approval 768px](approval-768.png) · [Approval 360px](approval-360.png).

Agent manual visual review of rendered captures: approved Fraunces/Inter hierarchy, paper/ink/terracotta palette, ruled calculation and source margin are preserved. Frozen amounts are prominent; IDs and exact evidence wrap without clipping. Mobile source notes follow the result in one column; desktop/tablet retain the editorial columns. The mobile confirmation fits its viewport with readable text and stacked controls. The visible blue focus ring surrounds “Keep reviewing” in the dialog and the finalization trigger after return without obstruction. Expanded technical JSON is deliberately optional and long; collapsed evidence keeps the result readable. The mobile journey requires scrolling.

Automated keyboard checks at 360/768/1440px use reduced motion, reach confirmation/cancel via keyboard, check dialog focus containment, Escape restoration, confirmation restoration and both result disclosures. The polite live region announces approval, the pending event and no delivery/payment/tax invoice. No page overflow with expanded evidence; additional 320px reflow assertion passes. Controls retain the existing 44px minimum and 3px focus outline. These automated findings are distinct from the agent visual review above.

Manual contrast review uses the unchanged palette: ink/paper 12.49:1, muted/paper 5.17:1, terracotta/paper 6.05:1, focus/paper 5.04:1. Text and focus remain distinguishable in the reviewed captures; status is textual, not color-only. Reading order is chapter, result/approval, outcome, chapter navigation, then source details on mobile, consistent with DOM order.

Manual screen-reader speech, physical touch, native browser zoom, first-time participant usability and a full accessibility assessment remain pending. This is WCAG 2.2 AA targeting, not a conformance claim. Verified contact and confirmed zero-cost hosting remain publication blockers.

## Review

### Standards

Standards review: **0 actionable findings** for `b21815c...3397579`.

The implementation follows the documented local simulation boundary, BillingRecord terminology, explicit owner approval, immutable evidence, and separate pending event semantics. Playwright assertions use rendered UI and independent literal amounts; failure fixtures remain isolated to the test build.

Reviewed finalization construction, reducer/session changes, approval/evidence components, styles, fixtures, and acceptance tests. No documented violations or baseline code-smell concerns warrant changes. Tooling-enforced matters were excluded.

### Spec

Initial review found one P2: the parent specification requires event creation time, which the event inspector omitted. Added immutable `createdAt` from the scenario clock, exposed in the existing JSON inspector. An independent literal assertion failed before the fix; version/event equality assertions cover its preservation through retries and navigation. Re-review confirms the creation-time requirement is resolved; zero remaining actionable Spec findings.

Standards: 0 actionable findings; Spec: 1 P2 resolved, 0 remaining findings. Human PR review pending. No merge or deployment authorized by this evidence.
