# 06: Reconcile the month and explain its close

Status: ready-for-agent

Parent: [Approved three-page showcase specification](../spec.md).

**What to build:** Show a monthly BillingRecord draft with accepted/rated sources, counts, quantities, contributions and reconciliation. Explain the half-open UTC occurrence month and inclusive 72-hour close. Provide the explicit designed scenario-time transition, with before/after instants and a reason. Readiness is visible but is not owner approval; finalization becomes functional in ticket 07.

**Blocked by:** 05 — Explain pricing and the event’s contribution.

## Acceptance checks

- [ ] Playwright: default sources reconcile to three accepted/rated events, 11,250 calls and exact total 28.130 displayed INR 28.13, including visitor INR 3.13 / 3.130. Editing to 1,500 before acceptance yields 11,500 calls, visitor INR 3.75 / 3.750 and total INR 28.75 / 28.750. Inspect source/line evidence separately from formatted currency.
- [ ] Playwright: independently specified literals cover one call, total INR 25.00 / 25.000, and two calls, total INR 25.01 / 25.010. A test-only baseline of 6,001 and 4,001 calls plus one visitor call totals INR 25.00 / 25.000, never INR 25.01 from rounding aggregate quantity. Sum individually rounded rated contributions.
- [ ] Playwright: test-only boundary sources at September 1, immediately before October 1, and exactly October 1 show only the first two belong to September. Occurrence selects month; differing receipt time does not move usage.
- [ ] Playwright: test clocks at close minus 1 ms, exactly 2026-10-04T00:00:00.000Z, and plus 1 ms. First two show OPEN and no available approval; after close fully reconciled evidence is READY_FOR_REVIEW. Verify identical eligibility in UTC and Asia/Kolkata browser timezones and independently of real wall-clock date.
- [ ] Playwright: after-close processing PENDING / LEDGER_PENDING and PROCESSED / RATING_PENDING fixtures show BLOCKED with no invented contribution or UNRATED / NO_APPLICABLE_PRICE. Navigation/time advancement alone cannot resolve them; explicit processing/rating can restore readiness.
- [ ] Playwright: public time transition visibly moves from 2026-09-28T14:32:02.000Z to 2026-10-04T00:00:00.001Z with explanation; no arbitrary public clock editor, silent navigation advance, real wait, frozen version or outbound event.
- [ ] Playwright: operate review, source details and time transition by keyboard; announce status changes and provide textual reconciliation. Verify readable periods/amounts at 360px, 768px, 1440px, reduced motion and visible focus. Record manual accessibility findings.

## Shared acceptance boundary and constraints

Playwright actions and assertions use rendered UI, accessible roles/names and visible evidence against a built, locally served showcase. Boundary fixtures, scenario clocks and recoverable faults are test-only initial configurations unavailable in published builds; the designed public time transition is the only public clock control. Monetary expectations are independently specified literals, never generated with the implementation calculation helper. Incorporate WCAG 2.2 AA targeting in this slice; record manual findings separately from automated checks and do not claim full conformance from automation.

Keep backend integration, database/schema changes, real webhook delivery, production writes, additional administrative pages/scenarios and deployment outside this release's implementation scope. Preserve production-readiness evidence and closed pilot gates. Verified contact details and confirmed zero-cost static hosting are publication blockers. Human usability results and full accessibility assessment remain pending until performed; do not manufacture completion evidence.

## Implementation branch and PR workflow

- Before implementation edits, create dedicated branch `codex/showcase-06-monthly-review` from a reviewed base containing the completed blockers. Do not bundle unrelated work or the throwaway prototype.
- Run this ticket's acceptance checks and relevant existing checks; record results and any checks that could not run. Keep acceptance boxes unchecked until verified.
- Create a scoped commit, `feat(showcase): reconcile the month and explain its close`, containing only this ticket's behavior, tests and necessary documentation. Push that branch and open a draft PR referencing this ticket and its dependencies.
- The draft PR describes observable behavior, validation evidence, accessibility findings and limitations. Record its URL and review status here. Do not merge or deploy merely because a draft PR exists.

## Comments

- 2026-10-04: User approved this slice and dependency order for publication. Processing/rating terminology and exact-versus-display money representations follow the clarified specification. Publication of this ticket does not authorize implementation in the current session.
