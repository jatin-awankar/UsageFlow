# Throwaway showcase design comparison

Question: does an annotated editorial ledger or a stage-based signal desk better explain UsageFlow to a first-time technical visitor?

Branch: `codex/prototype-showcase-directions`. Design review is pending. This is a separate Next.js application, not a route in the production application. It imports no database, auth, worker, API route, or production layout. It refuses to render in production mode. No real mutations or deliveries run. Fonts are served locally. State is in memory and resets on reload; switching direction/page inside the app preserves it.

## Run and compare

From the repository root with existing dependencies installed:

```sh
npm run prototype:showcase
```

- [A: Annotated Ledger landing](http://127.0.0.1:3210/?variant=A&view=landing)
- [A: Annotated Ledger workspace](http://127.0.0.1:3210/?variant=A&view=demo)
- [B: Signal Desk landing](http://127.0.0.1:3210/?variant=B&view=landing)
- [B: Signal Desk workspace](http://127.0.0.1:3210/?variant=B&view=demo)

The fixed comparison bar switches direction without discarding state. Left/right arrow shortcuts work outside interactive controls. Landing/Demo changes the page. Both designs use the same headline, explanatory copy, scenario, quantity editor, calculation, and preview content; their layout and supporting evidence presentation differ.

Try editing 1,250 calls to 1,500, accept, retry, and process/rate. Acceptance creates a pending, unrated event. Rating is a separate simulated action. Inspect the contribution, then return to acceptance and retry again: identity, counts, and total remain unchanged. Reset uses a Radix dialog. Monthly finalization and webhook delivery are clearly marked previews and cannot execute.

## Exact fixture manifest

- Synthetic organization: Northstar API. Customer: Orbit Studio, external ID `orbit_studio`. Metric `API_CALL`. Currency INR.
- Month: `[2026-09-01T00:00:00.000Z, 2026-10-01T00:00:00.000Z)`. Inclusive late close: `2026-10-04T00:00:00.000Z`. The simulated present remains September 28; the monthly calculation is OPEN. Finalization, if built later, must occur strictly after close with resolved evidence.
- PriceVersion `pv_api_sep_01`, effective `2026-09-01T00:00:00.000Z`, unit price `0.0025` INR = 2,500 integer micro-rupees.
- Two earlier rated fixture events: 6,000 calls occurred/received September 10 at 12:00 UTC, INR 15.00 (stored `15.000`); 4,000 calls occurred/received September 20 at 12:00 UTC, INR 10.00 (stored `10.000`). Synthetic references `evt_demo_prior_01` and `evt_demo_prior_02`. They are summarized as two events and INR 25.00 in the UI; individual baseline-event inspection is not implemented.
- Editable event: default 1,250 calls, occurred `2026-09-28T14:32:00.000Z`, synthetic receipt `2026-09-28T14:32:02.000Z`, event ID `evt_demo_0125`, fixed synthetic idempotency identity for this run. Quantity is locked after acceptance. Retry reuses the event and original fields; no second event is added.
- Default rating: exact product INR 3.125, half-up to INR **3.13**, persisted representation **3.130**. Monthly sum **28.130**, displayed INR **28.13**. Edited 1,500 calls yield **3.750** and monthly **28.750**. BigInt arithmetic sums per-event rounded amounts, not rounded aggregate quantities.
- Input range **1–10,000 is a prototype control choice**, explicitly labeled as such. It is neither an ingestion limit nor the rating maximum. The full prototype range is well within rating support and has no monetary overflow at this price. Zero, fractions, non-digits, and values outside this local control range show feedback.

### Separately recorded quantity discrepancy

The existing ingestion validator checks positive integer quantity without the explicit 1,000,000,000 cap enforced by rating. This discrepancy is recorded in [backend contract verification](../../../docs/public-showcase-contract-verification.md). No backend behavior changed, and the rating cap is not represented as an ingestion constraint. Fixture payload shape/quantities were checked against the actual validator and ratings against the actual pure money function; no HTTP ingestion or database test was run.

## Review observations and checks, 2026-10-04

These are agent inspection results, not participant usability results or a WCAG conformance assessment.

- Opened both landing pages and both workspaces in the browser. Inspected desktop layouts at 1440px and mobile at 360px; checked both workspaces at 768px. Observed no page-level horizontal overflow in the checked views. On mobile, chapter navigation wraps and evidence follows the main step; Signal Desk loses simultaneous inspection and becomes a longer page.
- Exercised edited 1,500-call flow in both directions: acceptance yields pending/unrated and total 25.00, identical retry returns the same ID, rating yields contribution 3.75 and total 28.75.
- Exercised default 1,250-call flow: contribution 3.13, total 28.13; a retry after rating also leaves the total unchanged. Verified accepted input is readonly and direction switching retains state. Reset restores 1,250, editable input, two baseline events, and 25.00.
- Keyboard checks: Tab moves from quantity to Accept with a visible outline; Enter performs acceptance and retry/rating. Acceptance focuses the retry action; changing chapters focuses the chapter heading. Dialog Escape returns focus to Reset. Important outcomes have an aria-live status. The input has a label, error association, and invalid state; zero quantity feedback was exercised.
- Reduced-motion CSS disables all transitions/animations under `prefers-reduced-motion: reduce`. Source inspected; OS preference and screen-reader behavior have not been manually tested. Further contrast, zoom/reflow, assistive-technology, touch-device, and target-size review is pending. Fine-print labels are intentionally compact and deserve scrutiny before implementation.
- Isolated TypeScript check and focused ESLint pass. Checked fixture quantities 1, 1,250, 1,500, 4,000, 6,000, and 10,000 against the actual input validator and `rateMoney`; results match prototype arithmetic, including a genuinely rated zero for one call. No permanent test suite was added to throwaway UI code.
- No new package dependencies. Reuses Tailwind, Radix Dialog, and Lucide. Eleven local font files total about 2.3 MB; this is an unoptimized comparison asset set, not a production performance budget. Keep only the selected direction's needed font files and optimize deliberately during later implementation.
- Human five-participant usability validation: **pending, zero participants**. WCAG 2.2 AA target: **pending**, no full-conformance claim.

## Comparison and recommendation

**Clarity:** A presents one readable chapter and an annotated statement; B makes acceptance/processing/rating distinctions more explicit through a persistent status inspector. A is easier to approach, B easier to investigate.

**Distinctiveness:** A's serif hierarchy, paper surfaces, rules, and margin commentary are more distinctive in this product category. B feels precise and credible, but is closer to familiar technical consoles.

**Traceability:** B wins simultaneous desktop inspection: status, event identity, price reference, and total remain together. A connects the same evidence, but spreads some details across chapters and annotations.

**Mobile usability:** Both fit and use a single reading column. A's document structure adapts naturally. B's persistent inspector becomes a below-step section, requiring additional scrolling; any compact summary improvement should be evaluated rather than silently expanding this prototype.

**Implementation effort:** Both use the existing foundation. A should require less responsive and focus coordination; B adds more effort to keep its inspector useful on narrow screens. This is a relative estimate, not a delivery schedule.

**Recommendation: Annotated Ledger** as the direction for the first public showcase, subject to user review. It best supports a memorable product-first identity and a short guided explanation. Signal Desk remains the stronger alternative if continuous technical inspection is the priority. No winning direction has been selected, no code has been promoted, and neither full showcase nor deployment is authorized by this prototype result.

## Font provenance and notices

Fonts downloaded from the official Google Fonts CSS endpoint with the selected families/weights, then self-hosted unmodified. [Exact stylesheet request](https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap).

- `font-0.ttf`–`font-1.ttf`: Fraunces 500/600; [OFL notice](public/fonts/Fraunces-OFL.txt).
- `font-2.ttf`–`font-3.ttf`: IBM Plex Mono 400/500; [OFL notice](public/fonts/Plex-OFL.txt).
- `font-4.ttf`–`font-6.ttf`: IBM Plex Sans 400/500/600; same Plex OFL notice.
- `font-7.ttf`–`font-10.ttf`: Inter 400/500/600/700; [OFL notice](public/fonts/Inter-OFL.txt).

Component licence sources and broader reuse considerations remain in [the visual research](../../../docs/public-showcase-visual-research.md). No reference-site assets or templates are copied.
