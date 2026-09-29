# Retained 100,000-event processing diagnosis

Branch: `codex/diagnose-100k-processing`, created from updated `main`.
Source: `/tmp/usageflow-pilot-evidence/3fa4be6c-d9a` and the retained `combined-report.json`. This is a local synthetic run, not a production capacity estimate. Pilot gates remain closed.

## Repro signal

The read-only check below exits 1 on the observed one-minute target failure:

```sh
python3 - <<'PY'
import json
p='/tmp/usageflow-pilot-evidence/3fa4be6c-d9a/volume-evidence.json'
d=json.load(open(p))
n=d['achieved']['uniquePersistedEvents']
within=d['latency']['bothWithin60Seconds']
print(f'processing within 60 s: {within}/{n} ({within/n:.2%}); target: 100%')
raise SystemExit(0 if within == n else 1)
PY
```

Observed: `processing within 60 s: 9180/100000 (9.18%); target: 100%` (exit 1). The combined report independently marks `processingWithin60Seconds` failed for this run.

## Where time accumulates

| Boundary | Retained observation | Interpretation |
| --- | --- | --- |
| Ingestion | 100,000 distinct events in 1,530.359 s, 65.344/s. Original HTTP responses p50 102 ms, p95 152 ms, p99 276 ms from send/outcome journal pairs. | Ingestion is sustained but slower than the requested monthly total would imply in a short drill. HTTP response time is not the processing latency. |
| Dispatch | API attempted a BullMQ add after the durable event and intent transaction. The API log has 12 `Ledger dispatch timed out` messages; all 100,000 events eventually processed. | Redis dispatch can time out, but the retained artifacts have no per-event dispatch timestamp or queue wait histogram. The durable recovery path worked for these events. |
| Worker claim | One worker, concurrency 5. Worker log has 116,963 `PROCESS_LEDGER_EVENT` starts and completions for 100,000 distinct events; 183 recovery scans found unrated candidates. | At least 16,963 job executions were additional to one per distinct event. Claims have no retained timestamp, so exact queue wait versus claim time cannot be calculated. |
| Projection | At send end 19,518 projections were missing. `projectedAt - receivedAt` p50 182.163 s, p95 287.049 s, p99 289.732 s; 90,809 exceeded 60 s. | The large delay is already present before projection completes. Queue wait, claim, and projection DB time are combined in this measure. |
| Rating | At send end 19,521 ratings were missing, just three more than projections. `ratedAt - receivedAt` p50 182.224 s, p95 287.102 s, p99 289.784 s; 90,820 exceeded 60 s. | Marginal p50/p95/p99 differences from projection are 61/53/52 ms. These are differences of distributions, not paired event durations; they suggest rating follows projection closely and is not the main *observed* latency after projection. |

The preceding 100,000-event run (`f2ccfd29-df2`) had 19,667 missing projections at send end and only 8.336% within 60 s, despite a slower 49.271/s acceptance rate. The 100-event burst (`f7778e50-17a`) had no backlog at 10.067/s and all events finished within 60 s. This supports load-related accumulation but does not identify one limiting query or lock.

## Saturation and competing work

The final report's single Docker sample showed PostgreSQL at 100.10% CPU and 224.7 MiB, Redis at 0.18% CPU and 23.82 MiB. Neither container had a configured CPU or memory quota. The host reported about 84 MB free memory at report time. These are point samples, so peak saturation and whether PostgreSQL CPU was the limiting resource remain unmeasured. The API log contains about 800,022 Prisma query lines; the worker log contains about 2,203,067. Development query logging itself adds substantial I/O, but its timing cost was not measured.

The worker's one-second recovery scan selects up to 100 unleased pending intents and enqueues a fresh recovery job ID for each. Pending events are eligible even if their original BullMQ job is already waiting. The extra 16,963 completed jobs are consistent with this duplicate-work path, though the logs do not identify each job ID or prove every extra job came from it. Rating also takes an Organization row lock, which could serialize five worker slots; no lock-wait or query-duration sample was retained.

## Bottleneck and smallest testable change

The demonstrated bottleneck is **work waiting to finish projection under sustained load**: 19.5% was still unprojected when sending ended, and projection latency already accounted for almost all of end-to-end latency. The retained run cannot split that wait into BullMQ queue time, PostgreSQL claim/transaction time, and projection query time, so it cannot justify a stronger single-component claim.

The smallest candidate fix is to keep recovery from enqueuing a fresh job for a *recent* unleased `PENDING` intent while its normal dispatch is still eligible to run. Keep recovery for old pending intents and expired claims. A focused integration test should enqueue a pending event, run a recovery scan before the staleness threshold, and assert one execution; then simulate lost dispatch and advance time past the threshold to assert recovery. Before adopting it, run a smaller opt-in A/B workload with dispatch, queue-entry, claim, projection, and rating timestamps and per-stage p50/p95/p99. Compare duplicate job count, queue wait, PostgreSQL CPU and lock waits, and within-60-second fraction. This candidate may reduce redundant work; the current evidence does not show that it alone will make 100,000 events meet the one-minute target.

No code, gate, or service configuration was changed for this diagnosis. The volume runner hard-codes 100,000 events, so a smaller opt-in run would require a separate diagnostic count override; the retained evidence was sufficient to localize the backlog, and no new workload was run.
