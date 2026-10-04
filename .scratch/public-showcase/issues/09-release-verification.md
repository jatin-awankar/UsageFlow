# 09: Verify the complete static release candidate

Status: ready-for-agent

Parent: [Approved three-page showcase specification](../spec.md).

**What to build:** Integrate the three-page experience into one coherent static release candidate, complete bounded presentation/accessibility fixes, and record actual release-check evidence. Visitors can complete the full synthetic story and use a verified real contact link. Assess a confirmed zero-cost static hosting setup before any separate deployment decision. Missing contact or hosting verification blocks publication; completing implementation tickets does not itself authorize deployment.

**Blocked by:** 03 — Inspect how UsageFlow works and its evidence; 08 — Follow delivery and reach the completion actions.

## Acceptance checks

- [ ] Playwright: on the normal built, locally served showcase, complete Landing → Demo acceptance → processing/rating → price/contribution → monthly review → explicit time transition → owner approval → simulated delivery → completion CTAs, with evidence-page excursions and Back/Forward retaining progress. All three direct URLs work without auth or backend services.
- [ ] Playwright: rerun independent literal money, retry, exact-close blocking, reconciliation, frozen payload, reload, two-context/two-tab independence and reset cases from tickets 04–08. Boundary cases use isolated test-only initial fixtures/clocks; actions and assertions remain through rendered UI. Normal publication builds neither expose nor honor fixture/clock/fault overrides or prototype comparison controls.
- [ ] Playwright: full behavioral suite in Chromium; full happy-path, keyboard and responsive smoke in Firefox and WebKit. Check 360px, 768px, 1440px, reduced motion and zoom/reflow. Record browser/version, date, fixture, failures and unavailable environments; unrun checks are not passes.
- [ ] Playwright and review: verify the real supplied contact destination, intended implementation/evidence links, exploratory pilot wording, readable source evidence and complete loading/empty/error states. Never ship placeholder contact details. Inspect normal-build network behavior: static assets/navigation only, no production writes, receiver calls, secrets or paid APIs.
- [ ] Publication blocker: record verified contact details and confirmed zero-cost static hosting configuration, including direct-page URLs, asset serving, required services, free resource limits and controls preventing spending. If either is missing/unverified, report publication BLOCKED. Use local build/preview checks and configuration evidence; this ticket does not authorize deployment or paid resources.
- [ ] Record selected font licences/notices and bounded font assets; compare stable desktop/mobile views for landing, calculation/inspector, finalization/delivery and evidence. Preserve Annotated Ledger and the mobile inline inspector; do not reopen a general redesign.
- [ ] Record automated accessibility checks separately from manual keyboard, screen-reader, contrast, zoom/reflow, reduced-motion and touch-target assessment and known limitations against WCAG 2.2 AA. Full accessibility assessment remains pending until performed; automated passes cannot establish full conformance. Fix bounded findings or explicitly record unresolved limitations.
- [ ] Human usability remains pending until actual first-time participants are tested. Target at least four of five finishing unassisted within five minutes and explaining the contribution. Record individual completion, elapsed time, assistance, comprehension and obstacles when available; automated timing/agent review is not participant evidence. Do not mark the target achieved without results; any release decision addressing unmet targets must be explicit.
- [ ] Review scope and readiness evidence: backend/schema/migrations, legacy workflows and deployed pilot gates remain unchanged. Publish a release assessment separating passed, failed, blocked and pending checks, with links to actual results; no full-readiness or onboarding claim while publication blockers remain. Final verification covers bounded integration fixes, not additional public scenarios.

## Shared acceptance boundary and constraints

Playwright actions and assertions use rendered UI, accessible roles/names and visible evidence against a built, locally served showcase. Boundary fixtures, scenario clocks and recoverable faults are test-only initial configurations unavailable in published builds; the designed public time transition is the only public clock control. Monetary expectations are independently specified literals, never generated with the implementation calculation helper. Incorporate WCAG 2.2 AA targeting in this slice; record manual findings separately from automated checks and do not claim full conformance from automation.

Keep backend integration, database/schema changes, real webhook delivery, production writes, additional administrative pages/scenarios and deployment outside this release's implementation scope. Preserve production-readiness evidence and closed pilot gates. Verified contact details and confirmed zero-cost static hosting are publication blockers. Human usability results and full accessibility assessment remain pending until performed; do not manufacture completion evidence.

## Implementation branch and PR workflow

- Before implementation edits, create dedicated branch `codex/showcase-09-release-verification` from a reviewed base containing the completed blockers. Do not bundle unrelated work or the throwaway prototype.
- Run this ticket's acceptance checks and relevant existing checks; record results and any checks that could not run. Keep acceptance boxes unchecked until verified.
- Create a scoped commit, `feat(showcase): verify the complete static release candidate`, containing only this ticket's behavior, tests and necessary documentation. Push that branch and open a draft PR referencing this ticket and its dependencies.
- The draft PR describes observable behavior, validation evidence, accessibility findings and limitations. Record its URL and review status here. Do not merge or deploy merely because a draft PR exists.

## Comments

- 2026-10-04: User approved this slice and dependency order for publication. Processing/rating terminology and exact-versus-display money representations follow the clarified specification. Publication of this ticket does not authorize implementation in the current session.
