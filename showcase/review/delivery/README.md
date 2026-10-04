# Ticket 08 — delivery evidence

Run date: 2026-10-04. Base: `f427b98` (merged ticket 07, PR #114). Scope: locally built static showcase; no backend, receiver, deployment or production-gate changes.

## Acceptance results

- Typecheck and normal/isolated static builds pass.
- Delivery-specific isolated checks: 14 passed across Chromium 153.0.8010.12 and WebKit 26.6 (Playwright 1.63.0).
- Full isolated suite: 150 passed, 26 normal-only skips. Full normal suite: 128 passed, 48 isolated-only skips. Normal emitted browser chunks contain neither the test-delivery parser nor the test contact address.
- Firefox 155.0 launch failed before page creation: “Could not find profile folder.” One failed launch, six delivery checks not run. Firefox acceptance remains unverified; this is not a browser behavior pass.
- The first delivery test failed at absent delivery evidence before implementation. Later keyboard checks exposed asynchronous chapter-focus interference; chapter rendering/focus is now synchronous. Final successful runs include these checks.
- Independent literal assertions cover INR 3.13 / 3.130 and 28.13 / 28.130, plus 3.75 / 3.750 and 28.75 / 28.750. Payload key equality prevents additional fields. Frozen source, price, line, record/version and event references survive delivery, retries and navigation.
- Finalization is required. A pending event is not success. Explicit simulation records one attempt, endpoint, event, scenario timestamp and simulated 200 outcome. Repeats preserve one attempt. No-target initial fixture reports NO_TARGET and cannot deliver.
- Network observation across both quantity journeys permits only local static GET/HEAD requests: no receiver, ingestion/finalization write or paid dependency request.
- Keyboard checks cover endpoint and payload disclosures, labeled focusable contained payload scroller, delivery, CTA order/link destinations, reset dialog focus containment/Escape/restoration, and polite outcome announcement. Reset cancellation preserves success; confirmation clears evidence, retries and clock, restores editable 1,250 / baseline INR 25.00, and leaves another tab’s completed run intact.
- Normal builds ignore no-target/contact query parameters. The normal Discuss a pilot control is focusable but unavailable and explains the missing verified destination. Only isolated initialization supplies `mailto:pilot@example.invalid`; it must never be published. No email is sent during testing.

## Visual and accessibility findings

Agent visual inspection of full-page Chromium captures at 360px and 1440px: Annotated Ledger typography, warm paper, ruled evidence and chapter navigation retained; payload stays within its bordered scroller; mobile evidence flows below the main chapter; no fixed inspector obscures controls. Completion is above the longer frozen evidence, with Discuss a pilot first. The 768px capture is retained alongside them. Screenshots are normal-build evidence unless explicitly labeled otherwise.

Automated keyboard/focus, 360/768/1440 viewport overflow and reduced-motion checks passed in Chromium and WebKit. Visible focus is retained on the secondary CTA in captures. Screenshot inspection supports reading order and visual legibility, but is not a manual screen-reader or contrast measurement. Manual screen-reader testing, native browser zoom, physical touch-target assessment, full WCAG 2.2 AA assessment and human usability sessions remain pending. No full-conformance claim.

## Review and release boundary

Standards review: zero findings. Spec review: zero material findings. Separate review agents inspected the committed diff against `f427b98`; browser execution and visual findings were recorded afterward. Human PR review remains pending.

Verified contact details and confirmed zero-cost hosting remain publication blockers. Ticket 03/evidence-page integration and ticket 09 remain outside this change. Production readiness evidence and closed pilot gates are unchanged. No deployment occurred.

Captures: [360px](delivery-360.png), [768px](delivery-768.png), [1440px](delivery-1440.png).
