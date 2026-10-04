# 04: Accept usage, retry safely, and restart

Status: resolved

Parent: [Approved three-page showcase specification](../spec.md).

**What to build:** Turn prepared usage into one immutable accepted event with a stable ID, then allow an identical retry and a visible confirmed reset. Expose processing state PENDING, reconciliation LEDGER_PENDING, and rating awaiting processing with no contribution amount. UNRATED / NO_APPLICABLE_PRICE is reserved for explicit missing-price evidence and must not appear for pending work. Keep the run in per-tab memory across in-app navigation, with a short explanation that reload starts fresh. No localStorage, sessionStorage, or cross-tab mutable state.

**Blocked by:** 02 — Enter the editorial showcase.

## Acceptance checks

- [x] Playwright: accept 1 and 10,000 as demo-range endpoints; reject empty, zero, negative, fractional, nonnumeric, and out-of-range values with associated accessible feedback and no event. Label 1–10,000 as the demo range, not an ingestion API constraint; preserve the separate documented ingestion/rating-limit discrepancy.
- [x] Playwright: accept the prepared event and inspect ID, Customer, metric, quantity, occurrence and receipt times. Assert processing PENDING / reconciliation LEDGER_PENDING, rating awaiting processing, no monetary contribution, and no UNRATED / NO_APPLICABLE_PRICE label. Accepted billable fields become immutable.
- [x] Playwright: rapid double acceptance and repeated identical retries return the original identity/evidence and create only one visitor event; baseline source quantities remain unchanged and retries do not add usage. Reset is the only way to edit an accepted quantity.
- [x] Playwright: preserve accepted evidence/retries through available in-app page/chapter/detail navigation and Back/Forward; reload restores the initial quantity, clock and two baseline events. Two browser contexts and two tabs in one context share no mutable state, including after reset.
- [x] Playwright: reset cancellation preserves every field; confirmation clears visitor event/retry history and restores baseline, quantity, chapter, clock and useful focus. Dialog supports keyboard containment, Escape and focus restoration.
- [x] Playwright: test-only delayed initialization/recoverable failure exposes truthful loading, error and retry/reset states without partial acceptance. All fixture/fault controls are absent from normal builds; tests act and assert through rendered UI.
- [x] Playwright: complete editing, validation, acceptance, retry and reset by keyboard, with outcome announcements and visible focus. Verify 360px, 768px, 1440px and reduced motion; record manual accessibility findings.

## Shared acceptance boundary and constraints

Playwright actions and assertions use rendered UI, accessible roles/names and visible evidence against a built, locally served showcase. Boundary fixtures, scenario clocks and recoverable faults are test-only initial configurations unavailable in published builds; the designed public time transition is the only public clock control. Monetary expectations are independently specified literals, never generated with the implementation calculation helper. Incorporate WCAG 2.2 AA targeting in this slice; record manual findings separately from automated checks and do not claim full conformance from automation.

Keep backend integration, database/schema changes, real webhook delivery, production writes, additional administrative pages/scenarios and deployment outside this release's implementation scope. Preserve production-readiness evidence and closed pilot gates. Verified contact details and confirmed zero-cost static hosting are publication blockers. Human usability results and full accessibility assessment remain pending until performed; do not manufacture completion evidence.

## Implementation branch and PR workflow

- Before implementation edits, create dedicated branch `codex/showcase-04-acceptance` from a reviewed base containing the completed blockers. Do not bundle unrelated work or the throwaway prototype.
- Run this ticket's acceptance checks and relevant existing checks; record results and any checks that could not run. Keep acceptance boxes unchecked until verified.
- Create a scoped commit, `feat(showcase): accept usage, retry safely, and restart`, containing only this ticket's behavior, tests and necessary documentation. Push that branch and open a draft PR referencing this ticket and its dependencies.
- The draft PR describes observable behavior, validation evidence, accessibility findings and limitations. Record its URL and review status here. Do not merge or deploy merely because a draft PR exists.

## Comments

- 2026-10-04: User approved this slice and dependency order for publication. Processing/rating terminology and exact-versus-display money representations follow the clarified specification. Publication of this ticket does not authorize implementation in the current session.

- 2026-10-04, implementation: Completed ticket 04 only on `codex/showcase-04-acceptance`, created from updated clean main `02f139a` after verifying the ticket 02 merge (#110). Quantity validation, immutable accepted evidence, stable identical retries, per-tab run state, accessible confirmed reset and isolated initialization recovery are implemented. Pricing and all later lifecycle actions remain unavailable; no deployment or backend/gate changes.
- Acceptance: 42 normal static-build Playwright checks pass across Chromium 153 / WebKit 26.6 (21 each), plus 6 isolated initialization checks. Normal export rebuilt afterward; bundle inspection excludes fixture/fault controls and normal-build UI checks ignore injected parameters. Keyboard, focus restoration/containment, history, independent contexts/tabs, reload, reduced motion, 320px reflow and 360/768/1440px layouts verified. The acceptance boxes refer to those verified engines; Firefox 155 cannot launch (“Could not find profile folder”) and is not claimed as passed.
- Validation: static build, showcase/repository typechecks, focused lint and whitespace checks pass. All 15 registered root test scripts attempted: inventory and current-restore reconciliation pass; 12 Docker-backed scripts are blocked by socket permissions; pilot-evidence is blocked by sandbox `ps` EPERM. No backend behavior changed.
- Review: independent Standards and Spec reviews against `02f139a` found 0 actionable findings on either axis. [Browser captures, manual visual findings, validation and limitations](../../../showcase/review/acceptance/README.md). Human PR review, screen-reader/native-zoom/physical-touch assessment, full accessibility and participant usability remain pending. Verified contact and zero-cost hosting remain publication blockers.
