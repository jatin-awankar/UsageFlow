# 03: Schedule future PriceVersions

**What to build:** An owner can publish and inspect later immutable versions for a metric. Each version applies from its UTC start, inclusive, until the next start, exclusive.

**Blocked by:** 02: Publish and inspect a metric's first PriceVersion.

**Status:** resolved

**Resolution:** Acceptance checks and two-axis code review completed in draft [PR #49](https://github.com/jatin-awankar/UsageFlow/pull/49); merge pending.

**Delivery:** After ticket 02 is merged, implement this ticket on a dedicated `codex/rating-03-schedule` branch from current `main`. Run its acceptance checks and `git diff --check`; commit and push only this ticket's changes, then open a draft PR against `main` linking the ticket and reporting test results and rollback steps.

- [ ] The application rejects duplicate or conflicting starts and requires each new ordinary version to begin strictly later than server time plus the five-minute future-occurrence allowance.
- [ ] Disposable PostgreSQL application tests prove multiple scheduled versions, exact starts and adjacent instants, half-open interval selection, and Organization isolation without requiring event rating.
- [ ] Published and scheduled versions remain immutable; no cancellation or silent replacement is introduced.
- [ ] Any migration is additive. Rollback preserves published versions and keeps the deployed Customer-linked ingestion gate off.
