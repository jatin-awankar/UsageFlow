# Accessibility and presentation — 26 October 2026

Ticket 04, based on Ticket 03 merge `88b09d0`. This is scoped verification of the browser showcase, not a WCAG conformance assessment or backend-readiness claim.

## Findings and changes

- Demo and evidence inherited the landing page title. Added descriptive per-route titles, including direct entry and reload.
- Standalone source/evidence and footer links now have at least 44px-high touch areas. This is a comfort improvement; the previous links were not classified as a WCAG failure because spacing exceptions also matter.
- The keyboard-focusable webhook payload had only the browser's default 1px outline. It now uses the shared 3px outline.
- At 320px, WebKit did not scroll the overflowing payload with ArrowRight in the test. Payload text now wraps, preserving the original JSON and avoiding a horizontal scrolling requirement. Existing delivery tests now check that the content fits its container rather than requiring `overflow-x: auto`.

## Agent-operated observations

In the Codex in-app browser, inspected the accessibility tree and narrow-screen screenshots. Keyboard skip moved to main and then Try demo. Invalid quantity restored input focus and exposed the error. Chapter changes focused their heading. At 320x640, reset and approval dialogs named their purpose, initially focused cancellation, trapped Tab and restored the trigger on Escape. Approval text and buttons remained legible. This is agent-operated inspection, not a human screen-reader session.

Inspected automated WebKit captures of 200% text enlargement and the short 320x256 approval dialog. The dialog scrolls to keep focused actions visible; the heading can be above the visible area while the bottom actions are focused.

## Automated scope

`presentation.spec.ts` covers route titles, 44px standalone link targets, 320x256 reflow, short dialog controls, focus return, keyboard payload access and intact JSON, 200% text stress on all pages and approval, and touch-emulated contact/error correction/reset at 390x844. Text stress doubles computed font sizes independently of layout; it is **not native browser zoom**. The 320 CSS px test checks the reflow width associated with a 1280px viewport at 400% zoom; it does not claim actual zoom testing.

The full normal Chromium/WebKit suite also covers existing billing interactions, six-state axe scans at three widths, keyboard journeys, reset, static routes, fonts and network boundaries. Scenario build was not repeated: this ticket changes presentation and metadata only, and the prior scenario results remain historical evidence.

## Results

Build, TypeScript and export verification passed. Full normal suite: 156 passed, 50 scenario-only skips, two Chromium timing failures (context teardown and screenshot capture). Both failed cases passed in isolation in 1.7s with unchanged assertions and 30-second timeouts. This is a passing recheck, not a clean first-run suite. Firefox was retried and failed before loading a page with `Could not find profile folder`; coverage remains unavailable. See `verification.json` and `export-manifest.json`.

Local review found no blocking code issue. Human validation remains pending. The recorded images include the short WebKit dialog and enlarged-text landing page.

## Walkthrough

`walkthrough.webm` is a silent, automated Chromium recording of the real local UI. `walkthrough.vtt` supplies timed explanatory text; `walkthrough.json` records the sequence and timestamps. The recording is a reproducible demonstration, not a usability study. It covers entry, acceptance/retry, pricing, monthly review, explicit approval, payload, simulated delivery, contact and reset.

To reproduce after a normal static build, run the showcase static server, then:

```sh
node showcase/scripts/record-walkthrough.mjs /tmp/usageflow-walkthrough
```

## Remaining human work

Native browser zoom could not be exercised through the available browser control (the zoom shortcut did not change viewport/scale). Screen-reader audio and physical mobile devices were not available through the configured tools. Independent recruiter feedback is pending. Use [the human review checklist](human-review.md) to capture these results; do not mark them passed from automated evidence.

Public Cloudflare deployment remains Ticket 02. This ticket introduces no paid service, backend change, dependency change or publication.

## References

Test scope follows W3C guidance for [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [text resizing](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), and [target size and spacing exceptions](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). The checks above cover only a subset of the requirements.

## Follow-up verification

Firefox startup was isolated to app-data resolution, consistent with [upstream Playwright issue 42768](https://github.com/microsoft/playwright/issues/42768). A workspace profile and minimal environment still failed. Providing a fresh `CFFIXED_USER_HOME` to the browser test process launched Firefox 155.0 successfully, without changing HOME, privacy permissions or personal browser data. Use `npm --prefix showcase run test:firefox -- --workers=1`. macOS can retain protected subdirectories in that temporary app-data folder; the launcher reports cleanup warnings separately from test results.

The release keyboard helper previously depended on cycling forward through browser chrome to reach earlier controls. Firefox did not wrap back into the document. It now uses reverse Tab for earlier controls; all navigation still uses actual keyboard input with no programmatic focus.

Native Safari was additionally inspected at 200% (landing) and 300% (demo/reset); percentages were read from its page menu. Reset controls remained visible in the scrollable dialog. This Safari's menu tops out at 300%, so 400% and the full native-zoom matrix still need the human check. The temporary tab was closed after restoring normal zoom.

The user volunteered to perform physical-phone, screen-reader and first-time visitor checks. Results are still awaited; agreement to test is not a passing result.
