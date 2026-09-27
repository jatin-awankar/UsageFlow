# 02: Show rated lines and price provenance

**What to build:** An owner can inspect deterministic draft lines grouped only by compatible metric, currency, and price basis. Each rated contribution uses the persisted quantity, exact amount, currency, unit price, and source RatedEvent. Expose source event IDs and either the immutable PriceVersion ID or the approved pricing-gap correction ID; never invent a PriceVersion for a correction. A genuine zero-price rating remains rated. Recalculation publishes a new snapshot with its line evidence.

**Blocked by:** 01: Create a Customer/month draft with snapshots.

**Status:** ready-for-agent

- [ ] Line and source-event ordering is stable; each included rated event maps to one line, and exact amounts are summed under the existing money contract without an extra rounding pass.
- [ ] An owner can distinguish two prices for one metric, correction-backed ratings, and rated zero from missing ratings.
- [ ] A disposable PostgreSQL application-level acceptance test configures Customer, currency, and PriceVersions through owner paths; accepts events through `POST /api/track`; runs the real ledger and rating workers and approved correction path; reads the owner draft; and verifies persisted rating IDs, provenance, quantities, currency, and exact amounts, including money limits and tenant scope.
- [ ] Migration adds line and source-evidence structures to new calculation snapshots. Rollback disables their application path while retaining populated tables, snapshots, and source evidence for recovery; do not reverse rated ledger outcomes.
- [ ] Create a dedicated branch before editing; limit the commit to this ticket, run its acceptance check and relevant regression checks, then commit, push, and open a draft PR. Report any checks that could not run.
