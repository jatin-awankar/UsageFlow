# 03: Inspect how UsageFlow works and its evidence

Status: ready-for-agent

Parent: [Approved three-page showcase specification](../spec.md).

**What to build:** Complete How it works & evidence, the third and final page. Explain Organization versus Customer, acceptance, processing, rating, monthly BillingRecord review/finalization, and webhook delivery. Link traceable implementation and readiness evidence with dates, environments, and limitations. Distinguish the actual backend from the browser-local simulation and retain closed pilot gates. Provide ordinary navigation back to the current demo. Pilot discussions are exploratory and subject to readiness review; a contact destination must be verified before publication.

**Blocked by:** 02 — Enter the editorial showcase.

## Acceptance checks

- [ ] Playwright: reach all three pages through ordinary links and direct entry; browser Back/Forward and returning from evidence preserve the quantity already edited in the current run. Later acceptance/finalization progress is covered by downstream integration checks.
- [ ] Playwright: assert Customer/Organization and comparison-calculation semantics, synthetic boundaries, processing/rating distinctions, and scoped readiness claims. No tax invoice, payment collection, instant onboarding, or production-ready claim is introduced.
- [ ] Playwright: verify intended source and implementation link destinations; separately check that referenced evidence resolves and actually supports its claim. Pending gates and verification limitations remain visible.
- [ ] Playwright: navigate the complete page by keyboard with clear focus, landmarks, headings, descriptive links, and a usable return action. Check 360px, 768px, and 1440px layouts, reduced motion, and no page overflow or color-only meaning.
- [ ] Record manual readability and accessibility findings. Do not invent a public contact address or ship a placeholder; keep the missing verified destination explicitly recorded as a publication blocker.

## Shared acceptance boundary and constraints

Playwright actions and assertions use rendered UI, accessible roles/names and visible evidence against a built, locally served showcase. Boundary fixtures, scenario clocks and recoverable faults are test-only initial configurations unavailable in published builds; the designed public time transition is the only public clock control. Monetary expectations are independently specified literals, never generated with the implementation calculation helper. Incorporate WCAG 2.2 AA targeting in this slice; record manual findings separately from automated checks and do not claim full conformance from automation.

Keep backend integration, database/schema changes, real webhook delivery, production writes, additional administrative pages/scenarios and deployment outside this release's implementation scope. Preserve production-readiness evidence and closed pilot gates. Verified contact details and confirmed zero-cost static hosting are publication blockers. Human usability results and full accessibility assessment remain pending until performed; do not manufacture completion evidence.

## Implementation branch and PR workflow

- Before implementation edits, create dedicated branch `codex/showcase-03-evidence` from a reviewed base containing the completed blockers. Do not bundle unrelated work or the throwaway prototype.
- Run this ticket's acceptance checks and relevant existing checks; record results and any checks that could not run. Keep acceptance boxes unchecked until verified.
- Create a scoped commit, `feat(showcase): inspect how UsageFlow works and its evidence`, containing only this ticket's behavior, tests and necessary documentation. Push that branch and open a draft PR referencing this ticket and its dependencies.
- The draft PR describes observable behavior, validation evidence, accessibility findings and limitations. Record its URL and review status here. Do not merge or deploy merely because a draft PR exists.

## Comments

- 2026-10-04: User approved this slice and dependency order for publication. Processing/rating terminology and exact-versus-display money representations follow the clarified specification. Publication of this ticket does not authorize implementation in the current session.
