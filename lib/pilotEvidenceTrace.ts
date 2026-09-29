export function emitPilotEvidenceTrace(entry: { stage: string; eventId: string; at: string; [key: string]: unknown }) {
  if (process.env.PILOT_EVIDENCE_TRACE !== "true") return;
  const started = performance.now();
  console.log("PILOT_TRACE " + JSON.stringify(entry));
  console.log("PILOT_TRACE_COST " + JSON.stringify({ eventId: entry.eventId, stage: entry.stage, synchronousMs: performance.now() - started }));
}
