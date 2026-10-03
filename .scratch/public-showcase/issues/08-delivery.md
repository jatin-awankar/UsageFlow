# 08: Follow delivery and reach the completion actions

Status: ready-for-agent

Parent: [Approved three-page showcase specification](../spec.md).

**What to build:** Trace the frozen BillingRecord into its invoice.finalized payload, selected synthetic endpoint and distinct successful simulated delivery attempt. Complete the story with Discuss a pilot as the primary CTA and Inspect the implementation as secondary. Pilot discussions remain exploratory with onboarding subject to readiness review. Never send an HTTP request to a receiver.

**Blocked by:** 07 — Finalize one immutable BillingRecord.

## Acceptance checks

- [ ] Playwright: before finalization, delivery is unavailable with an explanatory not-yet-created state. A finalized pending event is not delivered until the visitor invokes the simulated attempt; then show the selected synthetic endpoint and successful attempt evidence. A test-only no-target fixture must not report delivery success.
- [ ] Playwright: inspect payload event, BillingRecord, version and source references against the frozen record. Independent literal assertions preserve visitor contribution display INR 3.13 versus exact persisted-form evidence 3.130, and monthly display INR 28.13 versus payload amount 28.130. For 1,500, use INR 3.75 / 3.750 and INR 28.75 / 28.750. Do not substitute two-decimal display strings in exact payload fields or add uncontracted payload fields.
- [ ] Playwright: repeated inspection, accepted-event retry and chapter navigation do not alter the frozen version/payload or duplicate contribution. Observe network requests and confirm no receiver POST, ingestion/finalization API request or paid dependency.
- [ ] Playwright: completion presents exploratory pilot/readiness-review wording and the two actions in the approved priority. A test-only contact destination may validate link behavior; it cannot become the published destination. Verified real contact details remain a publication blocker, not a fabricated placeholder.
- [ ] Playwright: completed journey reset cancellation preserves results; confirmation clears acceptance, retry, draft/frozen/event/delivery evidence and restores baseline and scenario clock. Other tabs remain independent. Available page navigation preserves progress; ticket 09 covers integration with ticket 03.
- [ ] Playwright: use keyboard for endpoint/payload disclosures, delivery, reset and CTAs; verify outcome announcements, accessible labels, focus and dialog behavior. At 360px, 768px, 1440px, payload uses a labeled contained scroller if needed, with no page overflow or mobile inspector obstruction; reduced motion preserves all evidence. Record manual accessibility findings.

## Shared acceptance boundary and constraints

Playwright actions and assertions use rendered UI, accessible roles/names and visible evidence against a built, locally served showcase. Boundary fixtures, scenario clocks and recoverable faults are test-only initial configurations unavailable in published builds; the designed public time transition is the only public clock control. Monetary expectations are independently specified literals, never generated with the implementation calculation helper. Incorporate WCAG 2.2 AA targeting in this slice; record manual findings separately from automated checks and do not claim full conformance from automation.

Keep backend integration, database/schema changes, real webhook delivery, production writes, additional administrative pages/scenarios and deployment outside this release's implementation scope. Preserve production-readiness evidence and closed pilot gates. Verified contact details and confirmed zero-cost static hosting are publication blockers. Human usability results and full accessibility assessment remain pending until performed; do not manufacture completion evidence.

## Implementation branch and PR workflow

- Before implementation edits, create dedicated branch `codex/showcase-08-delivery` from a reviewed base containing the completed blockers. Do not bundle unrelated work or the throwaway prototype.
- Run this ticket's acceptance checks and relevant existing checks; record results and any checks that could not run. Keep acceptance boxes unchecked until verified.
- Create a scoped commit, `feat(showcase): follow delivery and reach the completion actions`, containing only this ticket's behavior, tests and necessary documentation. Push that branch and open a draft PR referencing this ticket and its dependencies.
- The draft PR describes observable behavior, validation evidence, accessibility findings and limitations. Record its URL and review status here. Do not merge or deploy merely because a draft PR exists.

## Comments

- 2026-10-04: User approved this slice and dependency order for publication. Processing/rating terminology and exact-versus-display money representations follow the clarified specification. Publication of this ticket does not authorize implementation in the current session.
