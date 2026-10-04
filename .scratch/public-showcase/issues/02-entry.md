# 02: Enter the editorial showcase

Status: resolved

Parent: [Approved three-page showcase specification](../spec.md).

**What to build:** A visitor understands UsageFlow on the Annotated Ledger landing page and enters a prepared, usable demo workspace without authentication. Preserve editorial typography, chapter progression, paper/ink surfaces, and adjacent annotations. Show Northstar API, Orbit Studio, September 2026, the two inspectable baseline events (6,000 and 4,000 calls; INR 25.00 total), and an editable default quantity of 1,250. Later actions explain their prerequisites and remain unavailable until implemented. Assess prototype code before extracting reviewed layout, copy, assets, or controls; do not promote the throwaway prototype wholesale.

**Blocked by:** None (can start immediately).

## Acceptance checks

- [x] Playwright: open Landing and Demo directly in fresh unauthenticated sessions; follow ordinary navigation and the primary Explore the demo link. Assert product meaning, synthetic/local simulation labels, prepared Customer/month context, baseline sources, and editable quantity.
- [x] Playwright: verify chapter navigation and not-yet-created explanations without fabricated accepted, rated, finalized, or delivered output. Quantity edits remain visible while navigating within the implemented app.
- [x] Playwright: serve the static build without a database, worker, API keys, or auth service; entry and interaction need no production/API calls. Keep protected layouts and data imports out of the public dependency path.
- [x] Playwright: operate navigation, skip link, quantity, and chapter controls by keyboard; verify semantic headings/labels, visible unobscured focus, and reading order. At 360px, 768px, and 1440px there is no page overflow; reduced motion retains every action and explanation.
- [x] Record prototype reuse assessment and desktop/mobile visual review against Annotated Ledger. Use Tailwind, needed Radix primitives, and a small Lucide subset; select only needed licensed fonts and retain notices. Do not add a component kit or redesign administrative screens.

## Shared acceptance boundary and constraints

Playwright actions and assertions use rendered UI, accessible roles/names and visible evidence against a built, locally served showcase. Boundary fixtures, scenario clocks and recoverable faults are test-only initial configurations unavailable in published builds; the designed public time transition is the only public clock control. Monetary expectations are independently specified literals, never generated with the implementation calculation helper. Incorporate WCAG 2.2 AA targeting in this slice; record manual findings separately from automated checks and do not claim full conformance from automation.

Keep backend integration, database/schema changes, real webhook delivery, production writes, additional administrative pages/scenarios and deployment outside this release's implementation scope. Preserve production-readiness evidence and closed pilot gates. Verified contact details and confirmed zero-cost static hosting are publication blockers. Human usability results and full accessibility assessment remain pending until performed; do not manufacture completion evidence.

## Implementation branch and PR workflow

- Before implementation edits, create dedicated branch `codex/showcase-02-entry` from a reviewed base containing the completed blockers. Do not bundle unrelated work or the throwaway prototype.
- Run this ticket's acceptance checks and relevant existing checks; record results and any checks that could not run. Keep acceptance boxes unchecked until verified.
- Create a scoped commit, `feat(showcase): enter the editorial showcase`, containing only this ticket's behavior, tests and necessary documentation. Push that branch and open a draft PR referencing this ticket and its dependencies.
- The draft PR describes observable behavior, validation evidence, accessibility findings and limitations. Record its URL and review status here. Do not merge or deploy merely because a draft PR exists.

## Comments

- 2026-10-04: User approved this slice and dependency order for publication. Processing/rating terminology and exact-versus-display money representations follow the clarified specification. Publication of this ticket does not authorize implementation in the current session.

- 2026-10-04, implementation: Completed ticket 02 only on `codex/showcase-02-entry` from clean planning merge `b0e3529`; verified `5c2c85c` is available and an ancestor. Isolated static Landing/Demo, editable tab-local quantity, explicit baseline sources, disabled later actions, licensed selected fonts, and review evidence are in `showcase/`.
- Validation: 16 Playwright checks pass across Chromium and WebKit against the served static export, including keyboard, focus, reduced motion, 320px reflow and 360/768/1440px layouts. Isolated clean-environment build/install, showcase and repository typechecks, and focused lint pass. Inventory and current-restore reconciliation tests pass. Twelve other registered backend scripts could not start because Docker socket access was denied. Firefox could not launch (“Could not find profile folder”), including a retry with a separate temporary directory; no Firefox pass is claimed.
- Review: independent Standards and Spec reviews against `5c2c85c` found no actionable implementation findings. [Screenshots, prototype assessment and limitations](../../../showcase/review/README.md). Human usability, manual screen-reader/native zoom/touch evaluation and full accessibility assessment remain pending; contact and hosting publication blockers remain open. No deployment or later-ticket implementation.
- Draft PR: creation pending; URL will be recorded in the next scoped documentation commit.
