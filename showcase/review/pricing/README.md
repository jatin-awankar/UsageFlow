# Ticket 05 pricing review

Date: 2026-10-04. Base: `b1c503a802cbc03286cbfa48c58786c83eb7d6ad` from updated `main`. Verified ticket 04 / PR #111 merged at 08:38:05 UTC before creating `codex/showcase-05-pricing`; the working tree was clean. This record covers ticket 05 only.

## Behavior and exact evidence

An explicit local action adds processing PROCESSED and reconciliation RATED evidence to the immutable accepted event. Before that action, acceptance remains PENDING / LEDGER_PENDING with no contribution. A test-only processed event without a rating remains RATING_PENDING with no amount; neither pending state is a missing-price outcome. The slice does not expose an intermediate PROCESSING state.

Occurrence selects the latest applicable PriceVersion. Rating calls the existing pure BigInt `rateMoney` contract, then pads its INR currency amount to the exact three-place representation without another rounding pass. The exact product is also calculated with BigInt. Totals sum the individually rounded source amounts as integer thousandths. This is transient persisted-form evidence, not a database write. No backend file changed.

Independent browser expectations are literal values from the ticket:

- 1,250 × 0.0025 = 3.125; currency INR 3.13; exact 3.130; total 28.130 / INR 28.13.
- 1,500 × 0.0025 = 3.75; currency INR 3.75; exact 3.750; total 28.750.
- One call: exact product 0.0025; RATED INR 0.00; exact 0.000; total 25.000.
- Two calls: exact product 0.005; RATED INR 0.01; exact 0.010; total 25.010.
- Baseline sources remain `evt_demo_prior_01` (6,000 calls, INR 15.00 / 15.000) and `evt_demo_prior_02` (4,000 calls, INR 10.00 / 10.000), individually inspectable.

Identical retries before and after rating preserve event identity, fields, rated counts, quantities and amounts. Re-activating the rated action is a no-op. Navigation retains evidence; reset clears visitor rating and restores the baseline. A recoverable local action failure retains accepted and baseline evidence and permits another rating attempt, without inventing output.

## Isolated fixtures and release separation

The existing webpack alias replaces the initializer only in `SHOWCASE_TEST_BUILD=1`. Its cache version also includes build mode. Regression testing caught that an unversioned webpack cache could retain the fixture module when switching back to a normal build; the mode-specific cache fixes this. Both transition directions were rebuilt and verified after the fix.

- `test-pricing=processed`: accepted default event, processing complete, no rating.
- `test-pricing=occurrence`: default September 28 occurrence, October 2 receipt/scenario clock, and an additional `pv_api_oct_test` effective October 1 at INR 0.0100. September's `pv_api_sep_01`, effective September 1 at INR 0.0025, still wins. Browser wall clock is fixed to 2040; tested in UTC and Asia/Kolkata.
- `test-pricing=fail-once`: first local rating action fails; the next succeeds. This is not a simulated network/worker outage.

These are initial configurations in the test-only module, never public controls. The normal build ignores all three parameters plus existing initialization/clock/fault parameters. Normal JavaScript is scanned for `test-pricing`, `test-init`, `pv_api_oct_test` and the isolated initialization marker. No matching fixture code remains. Normal export is restored after fixture testing.

## Browser validation

Playwright 1.63.0 against the built static export served by `showcase/serve.py`, not a development server. Browser revisions: Chromium 153.0.8010.12, WebKit 26.6, Firefox 155.0.

- Full normal-build suite: 64 passed across Chromium/WebKit; 14 isolated-only checks intentionally skipped.
- Isolated pricing and initialization suites: 30 passed across Chromium/WebKit; 8 normal-only checks intentionally skipped. After switching back, 24 normal pricing/initialization checks passed (14 test-only skips).
- Post-review baseline cleanup: 38 affected normal pricing/entry checks passed across Chromium/WebKit (8 isolated-only skips).
- Firefox launch fails before a page opens: “Could not find profile folder.” No Firefox pass is claimed.
- Tests act through rendered roles, labels and visible evidence; no internal state setters or imported calculation helpers generate expectations. DOM measurements only check layout and focus.
- Browser journey observes only local static GET/HEAD requests. No API, receiver, database or production write occurs.

## Visual and accessibility findings

Agent visual inspection retains Annotated Ledger's typography, ruled evidence, horizontal chapter index and two-column editorial layout. The visitor calculation inspector occupies the existing margin above baseline sources, without a third column or overlay. At mobile width it follows the chapter in DOM reading order. Tablet labels and values stack within the margin to keep timestamps legible. Long values wrap without horizontal page overflow.

[Desktop, 1440px](pricing-1440.png) · [Tablet, 768px](pricing-768.png) · [Mobile, 360px](pricing-360.png).

Keyboard checks invoke rating, retain focus on the completed action, reach the inspector after chapter navigation, open with Enter, close with Space, retain focus on the summary and continue to both baseline sources. The completed rating action uses `aria-disabled` plus a no-op guard to retain useful focus. Native disclosures expose expansion state. A 3px focus outline remains visible; outcomes use a polite status region, and failures use an alert. States and amounts have textual labels. Reduced motion preserves the same information and actions at all three widths. Existing suite also checks 320px entry reflow.

Manual findings are agent inspection of rendered captures and markup, separate from automated keyboard assertions. Reading order is chapter → calculation evidence → baseline sources; no CSS order reversal or fixed overlay obstructs it. The captured focus ring is visible around the baseline summary. Calculated contrast ratios from the actual CSS palette: ink/paper 12.49:1, muted text/paper 5.17:1, terracotta/paper 6.05:1, blue focus/paper 5.04:1, ink/soft panel 11.51:1. The completed rating action retains ink text on its inactive background. Controls/disclosure summaries keep the existing 44px minimum height.

Manual screen-reader output, physical touch, native browser zoom, full accessibility assessment and participant usability testing remain pending. No WCAG conformance or human usability claim is made.

## Other checks and scope

Static builds, showcase and root TypeScript, focused ESLint, and whitespace checks pass. All 15 registered root test scripts were attempted once: inventory and current-restore reconciliation pass; 12 Docker-backed scripts cannot access the Docker socket; pilot-evidence fails on sandbox `spawnSync ps EPERM`. These are unavailable checks, not backend passes. The existing money contract is reused without editing it; customer-model migrations, backend behavior, production-readiness evidence and pilot gates are unchanged.

No monthly reconciliation, time transition, finalization, delivery or deployment was implemented. Ticket 06 remains untouched. Human PR review, verified contact details and zero-cost hosting confirmation remain pending publication prerequisites.

## Standards

Independent review against `b1c503a` found no blocking documented-standard violations. One nonblocking duplication finding was addressed: baseline quantities are numeric source data, and inspector source counts/quantities derive from those records rather than repeating constants. The Standards reviewer confirmed the cleanup resolves the finding, with no new concerns. Exact arithmetic, domain language, bounded scope and explicit validation limitations conform to repository guidance.

Unresolved findings: 0; one nonblocking maintainability finding fixed.

## Spec

Independent review found no actionable missing, incorrect or out-of-scope implementation. Pending/rated distinctions, occurrence-time pricing, exact money representations, stable retries, failure recovery, isolated fixtures and margin/mobile evidence satisfy ticket 05. Contribution totals belong to this slice; full monthly reconciliation and the aggregate-rounding fixture remain ticket 06. Browser/accessibility limitations are explicitly recorded.

Findings: 0. Review totals: Standards 0 unresolved (1 fixed); Spec 0. Human PR review remains pending.

Draft PR: [#112](https://github.com/jatin-awankar/UsageFlow/pull/112). Open as draft; human review pending. No merge or deployment performed.
