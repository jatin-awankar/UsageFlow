# 07: Finalize one immutable BillingRecord

Status: resolved

Parent: [Approved three-page showcase specification](../spec.md).

**What to build:** Provide explicit simulated owner approval only for a currently eligible reconciled draft. Atomically freeze one immutable BillingRecord version and create one linked pending invoice.finalized event in the same local transition. Readiness, approval, event creation and delivery are distinct; no real backend or receiver action occurs.

**Blocked by:** 06 — Reconcile the month and explain its close.

## Acceptance checks

- [x] Playwright: fully rated drafts at close minus 1 ms and exactly close remain OPEN and cannot finalize; blocked activation creates neither version nor event. At close plus 1 ms unresolved processing PENDING / LEDGER_PENDING or PROCESSED / RATING_PENDING still prevents approval. Recheck eligibility when invoked.
- [x] Playwright: after close and reconciliation, explicit owner approval creates exactly one version and one linked pending invoice.finalized event. Rapid double activation and repeats preserve identities and amounts; event existence does not show delivery success.
- [x] Playwright: independently assert frozen source INR 3.13 / exact 3.130 and total INR 28.13 / exact 28.130 for 1,250; 1,500 yields INR 3.75 / 3.750 and INR 28.75 / 28.750. Two-decimal currency display must not truncate three-decimal persisted-form or outbound payload evidence. Freeze the source, price, line and amount references together.
- [x] Playwright: identical event retries after close and after finalization, and revisiting earlier chapters, cannot change accepted/rated counts, quantities, source contributions, version or outbound event. Pending processing/rating is never relabeled UNRATED / NO_APPLICABLE_PRICE.
- [x] Playwright: a narrowly scoped test-only recoverable finalization failure leaves no partial version/event and retains valid draft evidence with usable recovery. Reset cancellation retains the final result; confirmation clears version/event, restores baseline and clock, and affects no other tab.
- [x] Playwright: complete approval and result inspection by keyboard, including any confirmation dialogue and focus restoration; announce finalized outcome without implying payment or tax invoice. Verify 360px, 768px, 1440px and reduced motion; record manual focus, contrast and reading-order findings.

## Shared acceptance boundary and constraints

Playwright actions and assertions use rendered UI, accessible roles/names and visible evidence against a built, locally served showcase. Boundary fixtures, scenario clocks and recoverable faults are test-only initial configurations unavailable in published builds; the designed public time transition is the only public clock control. Monetary expectations are independently specified literals, never generated with the implementation calculation helper. Incorporate WCAG 2.2 AA targeting in this slice; record manual findings separately from automated checks and do not claim full conformance from automation.

Keep backend integration, database/schema changes, real webhook delivery, production writes, additional administrative pages/scenarios and deployment outside this release's implementation scope. Preserve production-readiness evidence and closed pilot gates. Verified contact details and confirmed zero-cost static hosting are publication blockers. Human usability results and full accessibility assessment remain pending until performed; do not manufacture completion evidence.

## Implementation branch and PR workflow

- Before implementation edits, create dedicated branch `codex/showcase-07-finalization` from a reviewed base containing the completed blockers. Do not bundle unrelated work or the throwaway prototype.
- Run this ticket's acceptance checks and relevant existing checks; record results and any checks that could not run. Keep acceptance boxes unchecked until verified.
- Create a scoped commit, `feat(showcase): finalize one immutable BillingRecord`, containing only this ticket's behavior, tests and necessary documentation. Push that branch and open a draft PR referencing this ticket and its dependencies.
- The draft PR describes observable behavior, validation evidence, accessibility findings and limitations. Record its URL and review status here. Do not merge or deploy merely because a draft PR exists.

## Comments

- 2026-10-04: User approved this slice and dependency order for publication. Processing/rating terminology and exact-versus-display money representations follow the clarified specification. Publication of this ticket does not authorize implementation in the current session.

- 2026-10-04, implementation: Verified ticket 06 / PR #113 merged and a clean working tree; created `codex/showcase-07-finalization` from updated main `b21815c`. Ticket 07 browser acceptance passes in Chromium/WebKit: full isolated suite 136 passed / 26 normal-only skips; full normal suite 114 passed / 48 isolated-only skips. Firefox fails before page creation (“Could not find profile folder”), including a direct temporary-path retry; its smoke checks remain unverified. See [browser evidence and accessibility findings](../../../showcase/review/finalization/README.md). Manual screen-reader/native zoom/physical touch, human usability and full accessibility assessment remain pending. Standards review: zero actionable findings. Spec review identified a missing event creation time; added immutable createdAt evidence and an independent literal/preservation check. Re-review confirms zero remaining findings. Draft PR pending. No delivery implementation, backend/gate changes or deployment.
