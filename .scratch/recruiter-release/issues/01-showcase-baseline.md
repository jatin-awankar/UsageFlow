# 01: Refresh the showcase release baseline

Status: ready-for-human

Parent: [Recruiter release roadmap](../spec.md).

## Scope

Refresh the isolated showcase's dependency and functional release evidence. Upgrade dependencies needed to remediate current advisories, preserving the existing public behavior and pure money contract. Diagnose Firefox launch failure or record a precise remaining environmental blocker. Keep the production app dependencies, database, backend, and pilot gates unchanged. No deployment.

Base: `84ead78` on `codex/showcase-contact-fallback` (open PR #118). Ticket branch: `codex/recruiter-01-showcase-baseline`. The new PR targets the contact branch so its diff excludes that unfinished predecessor. Merge #118 before retargeting this PR to main.

## Acceptance checks

- [x] Capture a dated current npm audit and chosen dependency versions; no unresolved release-blocking dependency advisory remains in the showcase.
- [x] Clean lockfile install, typecheck, targeted lint, and normal static build pass.
- [x] Normal export verification passes and the isolated test export is rejected by the verifier.
- [x] Run the complete normal and isolated browser suites in Chromium and WebKit, and Firefox when executable. Record pass/skip/fail counts and browser versions; unavailable environments are not passes.
- [x] Verify public routes, keyboard journey, network boundary, exact-money expectations, retry/reset behavior, contact fallback, and fixture exclusion through the existing rendered-UI acceptance tests.
- [x] Inspect the publication artifact for test fixtures and obvious secret markers; keep environment files and production credentials out of the standalone build.
- [x] Restore and verify the normal export last; retain fresh compact evidence separate from historical release records.
- [ ] Review the scoped diff, commit, push, and open a draft PR with automatic deployment disabled for this branch. Record checks and limitations.

## Comments

- 2026-10-24: Initial npm audit reports Next.js critical, PostCSS high, and Sharp high affected entries. Registry recommends Next.js 16.4.3, with PostCSS 8.5.23 and Sharp ^0.35.5. Existing contact PR #118 remains open; no unrelated commits will be included in this ticket's PR diff.

- 2026-10-24 implementation: Next.js 16.4.3 resolves the three affected audit entries; clean standalone audit reports zero known vulnerabilities. Normal suite: 148 passed / 50 mode-specific skips. Isolated suite: 172 passed / 26 mode-specific skips. Fixed a keyboard-test initialization race with a deterministic delayed-fixture regression (12 repeated checks pass). Firefox remains blocked at browser launch after cached/fresh browser and explicit-profile probes. [Fresh evidence](../../../showcase/review/baseline-2026-10-24/README.md). Local diff review found no blocking issues; human review pending.
