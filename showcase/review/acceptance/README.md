# Ticket 04 acceptance review

Date: 2026-10-04. Base: `02f139a` on updated main, the merge of ticket 02 / PR #110. Working tree was clean before creating `codex/showcase-04-acceptance`. This record covers ticket 04 only.

## Behavior and scope

The tab-local run validates the demo quantity, accepts one immutable UsageEvent, and returns its original evidence for identical retries. Acceptance shows PENDING / LEDGER_PENDING, rating awaiting processing and no contribution. No UNRATED or NO_APPLICABLE_PRICE outcome is invented. The range is explicitly a demo constraint; ingestion/rating discrepancy documentation and backend behavior are untouched.

Page/chapter/source inspection and live-app Back/Forward retain the run. Reload starts fresh. Separate contexts and sibling tabs share no mutable state. Reset cancellation preserves evidence, quantity, chapter and retry count; confirmation restores the baseline and focuses editable quantity. Loading/failure gates prevent partial acceptance, and retry/reset recover initialization.

Pricing, time advancement, finalization, delivery and the evidence page are outside this ticket. Production gates and readiness records are unchanged; no deployment or production request occurred.

## Browser acceptance

Playwright 1.63.0 against the built static export served by `showcase/serve.py`; no Next development server.

- Chromium 153.0.8010.12 and WebKit 26.6: 42 normal-build checks passed (21 per engine); 6 isolated-initialization checks intentionally skipped.
- Isolated test build: 6 initialization checks passed across Chromium/WebKit (delay, retry recovery, reset recovery); 2 normal-build checks intentionally skipped. Normal build recreated afterward.
- Normal export scanned for `test-init`, `fail-once` and the isolated failure marker: none present. Normal-build UI checks ignore fixture/clock/fault parameters and retain the default receipt time.
- Firefox 155.0 / Playwright revision 1543 cannot launch: “Could not find profile folder.” No Firefox pass is claimed.
- Tests operate through rendered roles, labels and visible evidence; DOM measurements are used only for layout/focus. No app store access, mocked internal transitions or calculated monetary expectations.
- No non-static or external browser requests were observed during acceptance/retries. Baseline assertions use literal 2 events / 10,000 calls / INR 25.00.

## Visual and accessibility findings

Agent visual inspection of static-build desktop and mobile captures preserves the Fraunces/Inter hierarchy, paper/ink palette, ruled evidence, chapter index and adjacent baseline sources. Accepted facts replace prepared-only rows rather than duplicating them. On mobile the sources follow the chapter in a single column; no fixed evidence overlay or horizontal page overflow was observed. Long source fields wrap. [Desktop accepted evidence](accepted-1440.png), [tablet](accepted-768.png), [mobile](accepted-360.png), and [mobile reset](reset-360.png).

Automated keyboard checks cover editing, associated validation feedback and focus, acceptance/retry announcements, both reset choices, dialog containment, Escape, trigger restoration and quantity focus after confirmation. macOS WebKit uses Option-Tab for native full traversal; at a dialog boundary it may retain the last control rather than wrap. Both buttons are reachable and focus remains inside the modal. Chapter headings retain visible focus. Reduced motion preserves content and actions. Layout checks cover 320px reflow and 360/768/1440px, including the reset dialog.

Manual findings here are agent visual observations, not a human assistive-technology assessment. Existing contrast-tested colors and 44px controls are retained. Manual screen-reader output, physical touch, native browser zoom, full accessibility assessment and participant usability testing remain pending. No WCAG conformance claim is made.

## Other validation and limitations

Static build, showcase and repository TypeScript, focused ESLint and whitespace checks pass. All 15 registered root `test:*` scripts were attempted once: inventory and current-restore reconciliation passed; 12 Docker-backed scripts could not start due to Docker socket permissions; pilot-evidence failed because sandbox restrictions prevent `ps` (`EPERM`). These are unavailable checks, not backend passes. No backend code changed.

Verified contact details and confirmed zero-cost hosting remain publication blockers. Human review, usability and full accessibility assessment remain pending.

## Standards

No documented-standard violations or actionable baseline smells found in the implementation diff against `02f139a`. The reducer keeps run transitions together and the layout provider owns tab-local state. Immutable accepted facts align with the domain and pilot specification. Changes stay within ticket 04; customer migrations, backend behavior, pricing and production gates are untouched. Unavailable checks and accessibility limitations are explicitly recorded.

Findings: 0 hard violations; 0 actionable smells. Human PR review remains pending.

## Spec

No actionable spec findings. Ticket 04 requirements are covered: demo quantity validation, frozen accepted evidence, stable repeated acceptance/retries, pending terminology without monetary outcomes, navigation persistence, fresh reloads, independent tabs/contexts, confirmed reset and focus, and build-isolated initialization fixtures. Tests exercise rendered UI. No pricing, deployment, backend changes or scope expansion found. Firefox and manual assistive-technology evaluation remain unverified as documented.

Findings: 0; no blocking issue. Review totals: Standards 0; Spec 0.
