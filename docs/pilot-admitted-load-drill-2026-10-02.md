# Disposable admitted-rate pilot drill — 2026-10-02

The approved load contract is committed separately as `12f238f` on `codex/pilot-load-acceptance-contract`. This drill ran from the existing PR #96 arrival harness with the changes on `codex/pilot-admitted-load-drill`. The runner recorded base commit `e258ec0` because the drill code was still uncommitted when it ran; the source changes were not made during the full run. This limits commit-based reproduction of the retained report. No pilot gate, production data, or paid service was used.

## Healthy admitted-rate result

The production-build API and real worker ran against fresh loopback PostgreSQL and Redis containers. Run `1816c60a-f8b` first accepted and fully reconciled 81,900 seed events, then accepted 18,000 events over 1,799.923 seconds (10.0004 accepted originals/second), then 100 events as 10 concurrent requests per second for 10 seconds. The total was 100,000 original IDs and five Customers with exactly 20,000 events each. The seed took 631.373 seconds to send and is not counted as a one-minute latency pass.

All **18,000 sustained** and **100 burst** events were projected and rated within 60 seconds of receipt. No original request failed or had an uncertain response. The complete ledger had 100,000 distinct accepted, projected, and rated events, with 199,999 expected, raw, projected, and rated units and matching rated amount. Three identical retries retained their IDs and three changed-payload retries returned HTTP 409. Final database and Redis backlog was zero. The owner export returned 100,000 unique rows over 1,000 pages and its grouped and rating totals reconciled without failures. Export creation took 14.249 seconds and pagination 4.484 seconds.

The sender journal is `/tmp/usageflow-pilot-evidence/1816c60a-f8b/sender-journal.jsonl` (82,356,220 bytes; SHA-256 `39a66ede00a7dd861c7898fa0b7d6c922f02dec2e54db19629dac44f972af168`). Its hash and byte count match the [retained run report](/tmp/usageflow-pilot-evidence/1816c60a-f8b/arrival-evidence.json). The export row hash also matches its [export evidence](/tmp/usageflow-pilot-evidence/1816c60a-f8b/export-evidence.json). There were 2,931 Redis queue samples with a maximum inter-sample gap of 1.08 seconds and no gap over three seconds. A targeted scan of the API and worker logs found no worker, transaction, or lock error. The host had 10 logical CPUs and 16 GiB RAM, with no per-container CPU or memory limit set. These local observations do not establish capacity on an untested free deployment.

Across the **whole** 100,000-event run, only 24,610 events completed both stages within a minute; the fast seed built a backlog. This remains a failed high-rate result. The healthy admitted-rate pass applies only to the separately measured 18,100 arrivals after the seed had fully drained.

## Admitted-rate recovery samples

Two separate production-build disposable runs sent 100 events at a requested 10/second while injecting a fault. Both retained all original IDs, reconciled quantities and derived work, finished with zero backlog, and passed their sender-journal hash checks.

- Worker interruption, run `a2c76fb2-893`: the 99-event post-stop send phase achieved 10.080/second. Full reconciliation took 12.901 seconds from the fault; no original ID was replaced. [Evidence](/tmp/usageflow-pilot-evidence/a2c76fb2-893/fault-evidence.json).
- Redis job loss, run `491a57a7-ea7`: 100 events were accepted at 10.081/second, queued jobs were deleted, and full reconciliation took 4.132 seconds from the fault; no original ID was replaced. [Evidence](/tmp/usageflow-pilot-evidence/491a57a7-ea7/fault-evidence.json).

These 100-event fault samples show recovery in the tested conditions. They do not establish the four-hour ingestion restoration target, zero RPO after PostgreSQL loss, or behavior under a long outage.

## Reproduce and check

From the repository root with local Docker available, run `node --test scripts/pilot-admitted-load.test.mjs scripts/pilot-evidence-export.test.mjs`, then `npm run test:pilot-evidence -- --smoke`, then opt in to the long run with `npm run test:pilot-evidence -- --arrival`. The arrival command creates only disposable loopback containers, writes evidence under `PILOT_EVIDENCE_DIR` (default `/tmp/usageflow-pilot-evidence`), and removes its containers when finished. It takes at least 30 minutes plus seeding, draining, building, and export time. Shortened runs using `PILOT_SUSTAINED_SECONDS` or `PILOT_ARRIVAL_DIAGNOSTIC_SEED_COUNT` are marked ineligible for the approved acceptance result.

The fault samples can be repeated with `PILOT_FAULT_ONLY=worker-stop PILOT_FAULT_COUNT=100 PILOT_FAULT_RATE=10 PILOT_FAULT_DRAIN_SECONDS=180 npm run test:pilot-evidence -- --faults` and the same command with `PILOT_FAULT_ONLY=redis-job-loss`. TypeScript, focused ESLint, helper tests, shell syntax, and diff checks passed. Repository-wide `npm run lint` failed at the unchanged `app/app/[orgId]/settings/page.tsx:70` (`react/no-unescaped-entities`); that file was not changed by this branch.

## Remaining rollout gates

The deployed Customer ingestion and owner finalization gates remain closed. Review and reconcile the open PR stack before merging; PR #97's earlier full-volume one-minute requirement conflicts with the approved admitted-rate contract. A recent restored-copy migration and application rollback rehearsal, actual pilot receiver compatibility with durable event-ID deduplication, representative restore/replay timing, and verification on the intended free hosting configuration remain open. This local load result alone does not authorize pilot traffic.
