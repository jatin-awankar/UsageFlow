import { readFile } from "node:fs/promises";

export function correlateTraces(apiText, workerText, ids, rows) {
  const traces = new Map();
  let synchronousTraceMs = 0;
  let traceEmissionCount = 0;
  for (const source of [apiText, workerText]) for (const line of source.split("\n")) {
    const costMarker = line.indexOf("PILOT_TRACE_COST ");
    if (costMarker >= 0) {
      try { const cost = JSON.parse(line.slice(costMarker + 17)); if (ids.has(cost.eventId)) { synchronousTraceMs += Number(cost.synchronousMs); traceEmissionCount++; } } catch { /* Ignore partial lines. */ }
      continue;
    }
    const marker = line.indexOf("PILOT_TRACE ");
    if (marker < 0) continue;
    try {
      const entry = JSON.parse(line.slice(marker + 12));
      if (!ids.has(entry.eventId)) continue;
      const list = traces.get(entry.eventId) || [];
      list.push(entry);
      traces.set(entry.eventId, list);
    } catch { /* A partial log line is not evidence. */ }
  }
  const samples = [];
  for (const [eventId, events] of traces) {
    const stage = name => events.find(item => item.stage === name);
    const api = stage("api_dispatch"), execution = stage("worker_execution");
    const claims = events.filter(item => item.stage === "durable_claim").sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    const projectionAt = rows.get(eventId)?.projected?.toISOString();
    const claim = claims.filter(item => projectionAt && Date.parse(item.at) <= Date.parse(projectionAt)).at(-1);
    const row = rows.get(eventId);
    const difference = (a, b) => a && b ? Date.parse(b) - Date.parse(a) : null;
    samples.push({ eventId, apiDispatchAt: api?.at ?? null, queueEnteredAt: api?.queueEnteredAt ?? null, workerExecutionAt: execution?.at ?? null, durableClaimAt: claim?.at ?? null, projectedAt: row?.projected?.toISOString() ?? null, ratedAt: row?.rated?.toISOString() ?? null, jobExecutions: events.filter(item => item.stage === "worker_execution").length, queueWaitMs: difference(api?.queueEnteredAt, execution?.at), claimToProjectionMs: difference(claim?.at, row?.projected?.toISOString()) });
  }
  return { count: samples.length, duplicateJobExecutions: samples.reduce((n, item) => n + Math.max(0, item.jobExecutions - 1), 0), synchronousTraceMs, traceEmissionCount, samples };
}

export async function readTraces(directory, ids, rows) {
  const [api, worker] = await Promise.all(["api.log", "worker.log"].map(name => readFile(`${directory}/${name}`, "utf8")));
  return correlateTraces(api, worker, ids, rows);
}
