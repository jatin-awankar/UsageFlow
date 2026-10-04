# 05: Explain pricing and the event’s contribution

Status: resolved

Parent: [Approved three-page showcase specification](../spec.md).

**What to build:** Let visitors explicitly simulate processing/rating and inspect occurrence-time PriceVersion provenance, quantity, exact multiplication, half-up rounding and the event contribution alongside the baseline. Use a compact evidence margin in the editorial layout and inline evidence on mobile, without a third column or overlay. Distinguish processing PROCESSED from successful RATED evidence; PROCESSED without a rating/failure/retry/missing-price record has reconciliation RATING_PENDING. This pending outcome is not UNRATED / NO_APPLICABLE_PRICE.

**Blocked by:** 04 — Accept usage, retry safely, and restart.

## Acceptance checks

- [x] Playwright: observe acceptance as processing PENDING / reconciliation LEDGER_PENDING; seed a test-only PROCESSED-without-rating case and observe RATING_PENDING and no amount. If PROCESSING is exposed, assert LEDGER_PROCESSING. Neither pending case implies missing price. Explicit processing/rating produces PROCESSED plus RATED evidence, and retains event identity.
- [x] Playwright: inspect pv_api_sep_01, effective 2026-09-01 00:00 UTC, INR 0.0025 per API_CALL, and the event occurrence. A test fixture confirms occurrence-time applicability, not receipt time or time of clicking Rate.
- [x] Playwright: use independently specified literal expectations: 1,250 × 0.0025 = exact product 3.125, display INR 3.13, exact persisted-form evidence 3.130; 1,500 gives INR 3.75 / 3.750; one call gives RATED INR 0.00 / 0.000; two give INR 0.01 / 0.010. Never derive expectations with the application calculation helper.
- [x] Playwright: baseline evidence remains two inspectable sources, INR 15.00 / 15.000 and INR 10.00 / 10.000. Distinguish two-decimal currency display from exact three-decimal persisted-form evidence; later payload representations must preserve that same amount without another rounding pass. The resulting default monthly total is INR 28.13 / 28.130; ticket 06 adds complete monthly reconciliation. No database persistence is introduced.
- [x] Playwright: retry before and after rating preserves identity, rated counts, quantities and contribution. A test-only recoverable rating-action failure preserves prior valid evidence and offers usable recovery without inventing RATED output.
- [x] Playwright: keyboard users can invoke rating, inspect and close disclosures, and retain logical focus; outcomes are announced. Evidence has textual equivalents, no color-only states or overlay obstruction at 360px, 768px and 1440px; reduced motion preserves information. Record manual contrast, reading-order and focus findings.

## Shared acceptance boundary and constraints

Playwright actions and assertions use rendered UI, accessible roles/names and visible evidence against a built, locally served showcase. Boundary fixtures, scenario clocks and recoverable faults are test-only initial configurations unavailable in published builds; the designed public time transition is the only public clock control. Monetary expectations are independently specified literals, never generated with the implementation calculation helper. Incorporate WCAG 2.2 AA targeting in this slice; record manual findings separately from automated checks and do not claim full conformance from automation.

Keep backend integration, database/schema changes, real webhook delivery, production writes, additional administrative pages/scenarios and deployment outside this release's implementation scope. Preserve production-readiness evidence and closed pilot gates. Verified contact details and confirmed zero-cost static hosting are publication blockers. Human usability results and full accessibility assessment remain pending until performed; do not manufacture completion evidence.

## Implementation branch and PR workflow

- Before implementation edits, create dedicated branch `codex/showcase-05-pricing` from a reviewed base containing the completed blockers. Do not bundle unrelated work or the throwaway prototype.
- Run this ticket's acceptance checks and relevant existing checks; record results and any checks that could not run. Keep acceptance boxes unchecked until verified.
- Create a scoped commit, `feat(showcase): explain pricing and the event’s contribution`, containing only this ticket's behavior, tests and necessary documentation. Push that branch and open a draft PR referencing this ticket and its dependencies.
- The draft PR describes observable behavior, validation evidence, accessibility findings and limitations. Record its URL and review status here. Do not merge or deploy merely because a draft PR exists.

## Comments

- 2026-10-04: User approved this slice and dependency order for publication. Processing/rating terminology and exact-versus-display money representations follow the clarified specification. Publication of this ticket does not authorize implementation in the current session.

- 2026-10-04, implementation: Ticket 04 verified merged via PR #111 before branching from updated clean `main` at `b1c503a`. Implemented ticket 05 only: explicit local processing/rating, occurrence-time pricing provenance, exact contribution evidence and baseline inspection in Annotated Ledger’s margin/mobile reading order. No monthly-review implementation, deployment, backend changes or gate changes.
- Validation: 64 normal static-build checks and 30 isolated pricing/initialization checks pass across Chromium/WebKit. Firefox cannot launch (“Could not find profile folder”), so boxes refer to verified engines only. Build-mode cache separation fixes fixture leakage found when switching exports; normal bundle excludes fixture controls. Typechecks, static builds, lint and whitespace pass. Root inventory/reconciliation tests pass; 12 Docker-backed scripts and pilot-evidence are blocked by environment permissions.
- [Browser evidence, literal fixture expectations, manual visual/contrast findings and limitations](../../../showcase/review/pricing/README.md). Independent Standards review found one nonblocking duplicated baseline-facts issue, now fixed and re-reviewed; Spec review found no actionable issues. Draft PR recording follows; human review, assistive-technology assessment, full accessibility and usability remain pending.
