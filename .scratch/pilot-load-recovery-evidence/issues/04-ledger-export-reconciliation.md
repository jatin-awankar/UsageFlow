# 04: Reconcile the owner ledger export at pilot workload

**What to build:** Measure ledger-export snapshot creation separately from paginating its complete result through the owner API, then reconcile exported IDs, counts, quantities, processing states, and grouped totals with the captured accepted ledger state. Verify prices and currency against persisted rating evidence separately because the current export does not include them.

**Blocked by:** 01: Run a disposable pilot evidence harness with a durable sender journal; 02: Measure pilot volume and achieved burst throughput.

**Status:** ready-for-agent

- [ ] Implement and pass `npm run test:pilot-evidence -- --export` against an opt-in full-workload evidence run: create a snapshot during synthetic ingestion, paginate all rows through the owner API, and record snapshot creation duration, page count, pagination duration, HTTP errors/timeouts, row count, IDs, quantities, processing states, and grouped totals.
- [ ] Reconcile exported IDs, counts, quantities, states, and totals against the accepted ledger state captured at snapshot creation, explicitly accounting for concurrent acceptance. Verify each relevant PriceVersion, currency, per-event rated amount, and summed rated amount against persisted rating evidence rather than expecting price or currency fields in the export.
- [ ] A missing or extra row, mismatched count/quantity/state/total, creation failure, or pagination timeout fails its own check visibly even if ingestion and rating succeed. Report pending, processing, failed, unrated, retry, and rating-failure counts without dropping them from denominators.
- [ ] Use only synthetic data and fresh local services. Document executable cleanup/rollback limited to run-owned resources and retain journal and export evidence for review; leave production data and pilot gates untouched.
- [ ] Implement on a dedicated branch for this ticket, run its acceptance checks, commit only this ticket, push, and open a draft PR. Report checks that could not run.
