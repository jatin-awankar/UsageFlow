# UsageFlow agent guidance

- For pilot scope and proposed behavior, read [docs/pilot-specification.md](docs/pilot-specification.md). For customer-model migration inventory and safe execution, read [docs/customer-model-inventory.md](docs/customer-model-inventory.md).
- Run the inventory tests with `npm run test:inventory` before changing customer-model migration code.
- Treat missing, arbitrary, and user-ID-shaped customer identifiers as unmapped. Never automatically assign them to billed customers or infer a billed customer from `Subscription.externalCustomerId`.
- Before any customer-model backfill, run the inventory on a recent restored database copy and reconcile organization, subscription, usage-event, and invoice counts plus identifier classifications. Preserve ambiguous records for explicit review.
- For each implementation ticket, ensure its approved spec and ticket are on `main`, read its acceptance criteria, and verify its blockers are complete. Create a dedicated `codex/` branch from current `main` before editing. Keep changes limited to that ticket, run its acceptance checks and `git diff --check`, then commit, push, and open a draft PR against `main`. In the PR, link the ticket and report test results plus migration or rollback steps. If a check, push, or PR cannot complete, report the blocker and leave the work on its branch.

## Agent skills

### Issue tracker

Issues and specs are local Markdown files. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage states use the default role names. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo. See `docs/agents/domain.md`.
