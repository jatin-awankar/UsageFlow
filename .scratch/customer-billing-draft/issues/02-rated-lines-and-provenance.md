# 02: Show rated lines and price provenance

**What to build:** An owner can inspect deterministic draft lines grouped only by compatible metric, currency, and price basis. Each rated contribution uses the persisted quantity, exact amount, currency, unit price, and source RatedEvent. Expose source event IDs and either the immutable PriceVersion ID or the approved pricing-gap correction ID; never invent a PriceVersion for a correction. A genuine zero-price rating remains rated. Recalculation publishes a new snapshot with its line evidence.

**Blocked by:** 01: Create a Customer/month draft with snapshots.

**Status:** resolved

- [x] Line and source-event ordering is stable; each included rated event maps to one line, and exact amounts are summed under the existing money contract without an extra rounding pass.
- [x] An owner can distinguish two prices for one metric, correction-backed ratings, and rated zero from missing ratings.
- [x] A disposable PostgreSQL application-level acceptance test configures Customer, currency, and PriceVersions through owner paths; accepts events through `POST /api/track`; runs the real ledger and rating workers and approved correction path; reads the owner draft; and verifies persisted rating IDs, provenance, quantities, currency, and exact amounts, including money limits and tenant scope.
- [x] Migration adds line and source-evidence structures to new calculation snapshots. Rollback disables their application path while retaining populated tables, snapshots, and source evidence for recovery; do not reverse rated ledger outcomes.
- [x] Create a dedicated branch before editing; limit the commit to this ticket, run its acceptance check and relevant regression checks, then commit, push, and open a draft PR. Report any checks that could not run.

## Comments

- Implemented in [draft PR #57](https://github.com/jatin-awankar/UsageFlow/pull/57) (open). The disposable PostgreSQL draft, rating, and approved correction acceptance tests pass, as do typecheck, scoped lint, inventory, and `git diff --check`. The full shell-test sweep ran once; its schema-proposal harness and new rating-sum assertion initially failed, were fixed, and passed on focused reruns. All other scripts passed in the sweep. The final two-axis review found no remaining issues.
- Rollback: deploy the prior BillingRecord route while retaining populated snapshot line/source columns, all prior snapshots, UsageEvents, RatedEvents, PriceVersions, and approved corrections. Never reverse rated ledger outcomes. See `docs/draft-rated-lines-rollout.md` for the evidence export required before any separately reviewed schema removal.
