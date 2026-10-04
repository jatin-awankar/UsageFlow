# Ticket 06 monthly review

2026-10-04. Base `0cd334d1a89f235a32b8fa758acd38deefb57e6e`, updated main containing ticket 05 / merged PR #112. Working tree was clean before creating `codex/showcase-06-monthly-review`. Scope is ticket 06 only; no backend/schema, production gate, finalization, delivery or deployment changes.

## Behavior and independent evidence

September's in-memory BillingRecord draft shows accepted and rated source counts/quantities, individually rounded contributions, exact API_CALL line and record totals, and textual reconciliation. Source disclosures expose stable IDs, occurrence/receipt, Customer/metric, PriceVersion and exact contribution. Pending evidence never receives an invented zero or missing-price label. Readiness checks unique source identity, processed/rated evidence, occurrence-time price and exact/display contribution agreement.

The UTC period includes September 1 and excludes October 1. Receipt time cannot move usage into another month. At or before the inclusive close `2026-10-04T00:00:00.000Z`, state remains OPEN. Strictly after close, reconciled evidence is READY_FOR_REVIEW; unresolved or inconsistent evidence is BLOCKED. The public action explicitly changes scenario time from `2026-09-28T14:32:02.000Z` to `2026-10-04T00:00:00.001Z`, with before/after instants, explanation and polite announcement. Readiness creates neither owner approval nor a frozen version/outbound event. Finalization stays disabled.

UI tests specify money literals independently, without importing calculation helpers:

- Default: 3 accepted/rated sources, 11,250 calls, visitor INR 3.13 / 3.130, total INR 28.13 / 28.130.
- Edited 1,500: 11,500 calls, visitor INR 3.75 / 3.750, total INR 28.75 / 28.750.
- One call: contribution 0.000, total INR 25.00 / 25.000; two calls: contribution 0.010, total INR 25.01 / 25.010.
- Rounding trap: 6,001 + 4,001 + 1 calls sum contributions 15.000 + 10.000 + 0.000 to 25.000, never aggregate-rounded 25.010.
- Boundary sources at September start and the last September millisecond are included despite October receipts. Exactly October 1 is excluded.
- Close minus 1 ms, exact close, and plus 1 ms run in UTC and Asia/Kolkata with browser wall clocks in 2040 and 2000. Eligibility is OPEN, OPEN, READY_FOR_REVIEW respectively.
- After-close PENDING / LEDGER_PENDING and PROCESSED / RATING_PENDING remain BLOCKED across navigation/time activation. Explicit processing/rating restores readiness. Mismatched rated identity blocks even when counts agree. Public advancement with unresolved accepted usage also stays BLOCKED.

## Validation

Playwright 1.63.0 against built static exports on loopback, Chromium 153.0.8010.12 and WebKit 26.6. Isolated monthly run: 38 passed, 16 normal-only skips. Firefox 155.0 failed to launch before page creation with “Could not find profile folder”; its 27 attempted cases provide no browser pass.

Full normal-build regression: 96 passed, 36 isolated-only skips, two failures from an old acceptance test expecting the former static human-readable date. The test now inspects the actual current scenario time in the new visible time region; affected acceptance rerun passed all 24 checks. A subsequent full run passed 97 checks with one WebKit keyboard-test race: programmatic rating focus competed with the chapter focus handoff. The test now waits for heading focus, uses Tab to reach rating, and asserts the rating announcement before continuing; nine repeated WebKit keyboard checks pass. Independent Spec review confirmed this strengthens coverage without bypassing product behavior. Normal monthly fixtures are ignored; compiled JavaScript has no test-monthly, test-pricing, test-init, boundary-source or mismatch markers. Normal export restored after isolated checks. **Final full normal-build run: 98 passed, 36 isolated-only skips, zero failures** across Chromium/WebKit.

Showcase/root TypeScript, focused ESLint and whitespace checks pass. Existing pure money contract: 3 passed; inventory: 4 passed; restored-copy reconciliation unit tests: 5 passed. No database/backfill was run. Backend integration suites are outside this frontend slice and were not rerun.

TDD evidence: default monthly UI test failed on the missing draft before implementation; rounding-trap test failed on the missing fixture before its addition. Tests interact through rendered roles, names and visible evidence. No private run setters or computed expected money. The journey records only local static GET/HEAD requests, with no outbound writes.

## Visual and accessibility findings

[Desktop 1440px](monthly-1440.png) · [Tablet 768px](monthly-768.png) · [Mobile 360px](monthly-360.png).

Agent manual visual inspection of these rendered captures finds the approved Fraunces/Inter hierarchy, warm paper palette, ruled calculations, two-column editorial composition and inline source details preserved. Tablet time labels stack above exact instants. Mobile sources follow the chapter without a fixed overlay, clipping or competing panel. Core amounts and status remain textual. The captured source-summary focus ring is visible and unobscured. The longer mobile chapter requires scrolling; no compact unreadable split view was introduced.

Automated keyboard checks traverse the chapter heading to the time action, preserve focus after advancement, then traverse chapter controls and all three disclosures; Enter/Space toggle evidence and retain summary focus. The polite, atomic status region announces the new instant/state. Existing CSS provides a 3px outline and 44px minimum controls. Reduced-motion checks at 360/768/1440px retain evidence and operation; an additional 320px viewport checks reflow. DOM measurements found no horizontal page overflow. These are automated assertions, distinct from agent visual inspection.

Palette unchanged from ticket 05: ink/paper 12.49:1, muted/paper 5.17:1, terracotta/paper 6.05:1, focus/paper 5.04:1. Manual screen-reader output, physical touch, native browser zoom, participant usability and full accessibility assessment remain pending; no WCAG conformance claim is made. Contact verification and zero-cost hosting confirmation remain publication blockers.

## Review

### Standards

No findings. The diff preserves documented domain terminology, browser-local simulation, exact shared money arithmetic, inspectable source evidence, and the approved Annotated Ledger layout. No actionable baseline code smell identified.

### Spec

No actionable findings. Ticket 06 requirements are implemented within scope: inspectable monthly sources, accepted/rated reconciliation, literal-expected exact amounts, per-event rounding, occurrence-month boundaries, inclusive close, unresolved-evidence blocking, explicit time advancement, and guarded readiness. Tests are sensitive to these conditions and mismatched identity. Keyboard, responsive, reduced-motion and announcement checks exercise visible UI. Validation limitations are disclosed; finalization stays disabled.

Standards: 0 findings; Spec: 0 findings. Human PR review remains pending. No merge or deployment performed.

Draft PR: [#113](https://github.com/jatin-awankar/UsageFlow/pull/113). Open as draft; human review pending. Implementation commit `0682156`.
