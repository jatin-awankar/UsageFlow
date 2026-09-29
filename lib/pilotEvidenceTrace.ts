export function emitPilotEvidenceTrace(entry: { stage: string; eventId: string; at: string; [key: string]: unknown }) {
  if (process.env.PILOT_EVIDENCE_TRACE !== "true") return;
  const started = performance.now();
  console.log("PILOT_TRACE " + JSON.stringify(entry));
  console.log("PILOT_TRACE_COST " + JSON.stringify({ eventId: entry.eventId, stage: entry.stage, synchronousMs: performance.now() - started }));
}

export function isSampledPilotEvidenceKey(key: string | null, runId: string | undefined, sampleEvery: number) {
  if (!key || !runId || !Number.isSafeInteger(sampleEvery) || sampleEvery < 1) return false;
  const prefix = `event-${runId}-`;
  if (!key.startsWith(prefix)) return false;
  const indexText = key.slice(prefix.length);
  if (!/^(0|[1-9][0-9]*)$/.test(indexText)) return false;
  const index = Number(indexText);
  return Number.isSafeInteger(index) && index % sampleEvery === 0;
}
