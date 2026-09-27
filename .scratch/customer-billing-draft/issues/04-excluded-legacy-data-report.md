# 04: Report excluded legacy data separately

**What to build:** An owner can inspect excluded `LEGACY` event counts and quantities for an Organization and UTC period in a separate reconciliation section, without Customer attribution. The report identifies exclusion by the durable legacy path; it does not claim a verified Customer classification or mapping that a restored-copy inventory has not established. Legacy events remain outside Customer draft source sets, totals, and status partitions even if a historical event has a Customer link. Existing Invoices and aggregate totals stay unchanged.

**Blocked by:** 03: Show unresolved events and reconcile the ledger.

**Status:** resolved

- [x] Organization/period legacy counts and quantities are visible separately, with no inferred Customer from raw identifiers, User IDs, or Subscription identifiers.
- [x] Customer drafts exclude `LEGACY` events including a synthetic Customer-linked example; existing Invoice and aggregate values are unchanged.
- [x] A disposable PostgreSQL application-level acceptance test seeds legacy evidence and an Invoice, exercises the owner report and draft paths, and checks tenant isolation, exact exclusions, and unchanged legacy values. It does not backfill or classify ambiguous records as verified Customers.
- [x] Prefer a read-only report over existing records. If a migration is needed, add only report-specific structures; rollback disables the report path while retaining any populated evidence. No historical mapping or backfill is performed.
- [x] Create a dedicated branch before editing; limit the commit to this ticket, run its acceptance check and relevant regression checks, then commit, push, and open a draft PR. Report any checks that could not run.

## Comments

- Implemented in draft PR [#59](https://github.com/jatin-awankar/UsageFlow/pull/59), open against `main`. Focused disposable PostgreSQL acceptance, inventory, the full script suite, typecheck, `git diff --check`, and standards/spec code review passed. Rollback steps are in the PR and [report rollout guidance](../../../docs/legacy-exclusion-report-rollout.md).
