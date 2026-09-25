# UsageFlow agent guidance

- For pilot scope and proposed behavior, read [docs/pilot-specification.md](docs/pilot-specification.md). For customer-model migration inventory and safe execution, read [docs/customer-model-inventory.md](docs/customer-model-inventory.md).
- Run the inventory tests with `npm run test:inventory` before changing customer-model migration code.
- Treat missing, arbitrary, and user-ID-shaped customer identifiers as unmapped. Never automatically assign them to billed customers or infer a billed customer from `Subscription.externalCustomerId`.
- Before any customer-model backfill, run the inventory on a recent restored database copy and reconcile organization, subscription, usage-event, and invoice counts plus identifier classifications. Preserve ambiguous records for explicit review.
- For each implementation ticket, create a dedicated branch before editing. Keep the commit limited to that ticket, run its acceptance checks, then commit, push, and open a draft PR from the branch. Keep unrelated work out of the commit and report any checks that could not run.

## Agent skills

### Issue tracker

Issues and specs are local Markdown files. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage states use the default role names. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo. See `docs/agents/domain.md`.
