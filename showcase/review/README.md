# Ticket 02 review evidence

Date: 2026-10-04. Planning base: `b0e3529` (contains `5c2c85c`). Agent inspection, not participant usability research.

## Visual review

Inspected full-page rendered Landing and Demo at 1440px and 360px against the Annotated Ledger prototype. Retained the expressive Fraunces title, warm paper, terracotta emphasis, ruled money example, numbered chapter progression, and adjacent source notes. Mobile keeps one reading column, wraps navigation and identifiers, and places sources after the relevant chapter; no overlay obscures actions. Also checked 768px in browser tests. No page overflow in checked views. Screenshot links below are from the built static export.

- [Desktop landing](landing-1440.png)
- [Desktop demo](demo-1440.png)
- [Mobile landing](landing-360.png)
- [Mobile demo](demo-360.png)
- [Tablet demo](demo-768.png)

## Validation

- Isolated frontend dependency install and static build: pass. A clean environment containing only PATH/HOME and disabled Next telemetry builds successfully. Public imports are confined to this app, React/Next, Radix and Lucide; no protected layout, auth, data, API or worker import.
- Showcase and repository TypeScript: pass; focused ESLint: pass. Full existing npm `test:*` suite attempted once: inventory and current-restore-reconciliation pass. The other 12 scripts cannot start because access to the local Docker socket is denied; no database tests or deployed checks are claimed as passes.
- Playwright verifies direct unauthenticated entry, primary/ordinary links, chapter prerequisites, disabled actions, two inspectable baseline sources, quantity editing, page/chapter/history retention, independent tabs and reload, reset cancellation/confirmation, skip link, keyboard controls/focus, reduced motion, responsive layouts and static-only observed network traffic.
- Firefox 155.0 / Playwright v1543 installed but cannot launch: “Could not find profile folder.” Reproduced with default and `/private/tmp` profile directories. Firefox acceptance is **not verified**.
- WebKit keyboard traversal uses Option-Tab on macOS to include links; Chromium uses Tab. Focus outlines are 3px with 5px offset. Chapter activation focuses its heading; reset Escape restores trigger focus. No persistent overlays outside the modal dialog.
- Computed sRGB contrast: muted text on paper 5.17:1, muted on panel 4.76:1, accent on paper 6.05:1, accent on panel 5.57:1, input border on paper 3.33:1. State also uses text. Interactive controls/disclosures are at least 44px tall.

## Limitations

Manual screen-reader evaluation, physical mobile touch testing, native browser zoom, full accessibility assessment and first-time participant usability studies remain pending. Responsive reflow checks support but do not replace those checks. No WCAG conformance claim. No real acceptance/rating/finalization/delivery is implemented by this slice. Verified contact destination and zero-cost hosting remain publication blockers; no deployment was performed.

## Standards

No blocking findings. The diff follows documented domain terminology, preserves closed pilot gates, avoids customer-model migration changes, and confines implementation to the isolated ticket 02 showcase, tests, and evidence. No concrete, actionable code smells warrant refactoring in this slice.

## Spec

No actionable implementation findings for ticket 02. Prepared context, baseline sources, quantity persistence, unavailable later actions, isolated static dependencies, and Annotated Ledger composition match the approved entry slice. Later-ticket behavior remains deferred.

Review totals: Standards 0 findings; Spec 0 findings. Neither axis has a blocking issue.

Final static-build acceptance: **16 passed** across Chromium and WebKit (8 per engine), including 320px reflow, in addition to 360/768/1440px captures. Firefox remains unavailable as described above. The local Python 3.9 server initially reset connections under parallel asset load; the review server now uses a 128-connection backlog, and the complete two-engine suite passes. This change affects only local static serving.
