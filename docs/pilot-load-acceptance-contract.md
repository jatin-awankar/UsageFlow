# Private pilot load acceptance contract

Status: proposed rollout criterion for owner review. This document defines a test; it does not certify the current system or authorize pilot traffic.

The agreed pilot limit is 100,000 accepted events per Organization per UTC month, including up to 20,000 for one Customer, with short bursts of 10 accepted events per second. The one-minute processing target applies during healthy operation at the admitted pilot arrival rate. A sender that offers roughly 130 events per second for many minutes exceeds that rate. Its measured latency failure remains part of the evidence and must not be reported as a pass.

## Acceptance drill

Run the real production build of the API and worker with the intended free pilot infrastructure configuration, documented resource limits, disposable PostgreSQL and Redis, and synthetic data. Keep the deployed Customer ingestion and owner finalization gates closed. Record the commit, configuration, machine limits, UTC times, sender journal and hashes, worker and database errors, queue depth, and sampling gaps.

1. Build a fully processed and reconciled seed of 81,900 accepted events in the test UTC month for one Organization, including 20,000 for one Customer. Verify distinct accepted IDs, quantities, projections, ratings, and export rows. Record the time taken to build this history; the seed is a database-size and reconciliation precondition, not a one-minute latency pass.
2. With that history present and its backlog drained, accept 18,000 events in the same UTC month at 10 per second for 30 minutes, then accept 100 more as 10 concurrent requests per second for 10 seconds. Distribute new events so no Customer exceeds 20,000 for the month. The resulting monthly total is 100,000. Use the real ingestion endpoint and worker throughout. Journal each send and outcome, including retries and uncertain responses. Report offered and achieved rates; an under-rate run is inconclusive.
3. For every distinct accepted event in the arrival phase, measure receipt-to-projection and receipt-to-rating latency. Pass the healthy one-minute target only if all accepted arrival-phase events complete both stages within 60 seconds. Reconcile their IDs and quantities with the raw ledger, processing intent, projections, ratings, and owner export. Require zero unexplained final backlog, failed work, or missing rows. Report the denominator and any late event, not only percentiles.
4. Exercise worker interruption and Redis job loss at the same admitted rate. Report recovery time and accepted-ID reconciliation separately from healthy latency. Accepted events must remain visible while processing is delayed. A stale total must show degraded status; finalization must remain blocked while relevant work is pending, failed, or unrated.

This drill is necessary but not sufficient for rollout. Review migration and application rollback on a recent restored copy, receiver compatibility with a prospective pilot team, and representative restore and replay timing before opening any gate. The four-hour ingestion restoration target is a separate recovery claim and requires its own measured evidence. Backups or replayed quantities do not prove zero original-event-ID loss.

## Existing evidence and decision

The retained 100,000-event high-rate run recorded in [the Step 6 review](https://github.com/jatin-awankar/UsageFlow/pull/97) reconciled all original IDs but only 12,137 completed projection and rating within 60 seconds at about 131 accepted events per second. It fails that run's one-minute result. The [arrival-pattern drill in PR #96](https://github.com/jatin-awankar/UsageFlow/pull/96) processed 600 events at about 10 per second after a reconciled 100,000-event seed, followed by 100 more at about 10 per second; all 700 met one minute. Its roughly one-minute sustained phase does not satisfy the 30-minute drill above.

The pilot gate stays closed. This contract replaces the proposed requirement to process an artificially compressed 100,000-event monthly volume within one minute, while retaining the failed high-rate results as overload evidence. Update the Step 6 review before merging its PR so the two rollout criteria do not conflict. A passing local drill would establish only the measured configuration and workload, not an unconditional production capacity guarantee.
