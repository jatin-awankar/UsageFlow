import prisma from "@/lib/prisma";
import { getUsageFlowQueue } from "@/lib/bullmq";
import { isSampledPilotEvidenceKey } from "@/lib/pilotEvidenceTrace";
import { findRateableUnratedEventIds } from "./processors/rateCustomerEvent";

// The sampled 10,000-event runs saw queue-wait p99 as high as 61.6 seconds.
// Allow that wait plus margin before treating an unclaimed dispatch as lost.
export const PENDING_RECOVERY_GRACE_MS = 75_000;

async function sampledIdsFor(candidateIds: string[]) {
  const sampledIds = new Set<string>();
  const runId = process.env.PILOT_EVIDENCE_RUN_ID;
  const sampleEvery = Number(process.env.PILOT_EVIDENCE_SAMPLE_EVERY);
  if (process.env.PILOT_EVIDENCE_TRACE !== "true" || !runId || !Number.isSafeInteger(sampleEvery) || sampleEvery < 1 || !candidateIds.length) return sampledIds;
  const events = await prisma.usageEvent.findMany({
    where: { id: { in: candidateIds } },
    select: { id: true, idempotencyKey: true },
  });
  for (const event of events) {
    if (isSampledPilotEvidenceKey(event.idempotencyKey, runId, sampleEvery)) sampledIds.add(event.id);
  }
  return sampledIds;
}

export async function recoverLedgerWork() {
  const now = new Date();
  const pendingCutoff = new Date(now.getTime() - PENDING_RECOVERY_GRACE_MS);
  const intents = await prisma.ledgerProcessingIntent.findMany({
    where: {
      event: { billingTreatment: "LEDGER_ONLY" },
      AND: [{ OR: [
        { event: { processingState: "PENDING" }, createdAt: { lte: pendingCutoff } },
        { event: { processingState: { in: ["PROCESSING", "FAILED"] } } },
      ] }],
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
    },
    select: { eventId: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  // Recovery jobs have new IDs, so the original job's trace marker cannot follow them.
  const sampledIntents = await sampledIdsFor(intents.map(({ eventId }) => eventId));
  const queue = getUsageFlowQueue();
  for (const { eventId } of intents) {
    // A crashed BullMQ job can retain its original ID until BullMQ detects a stall.
    // A fresh recovery ID lets the expired PostgreSQL lease determine ownership.
    await queue.add("PROCESS_LEDGER_EVENT", { eventId, ...(sampledIntents.has(eventId) ? { pilotTrace: true, pilotTraceKind: "ledger_recovery" as const } : {}) }, { jobId: `recover-${eventId}-${Math.floor(now.getTime() / 5000)}`, removeOnComplete: true });
  }
  // A crash after projection commits but before rating must be recoverable.
  const ratingCandidates = await findRateableUnratedEventIds();
  const sampledRatings = await sampledIdsFor(ratingCandidates.map(({ id }) => id));
  if (ratingCandidates.length) console.log("Recovering unrated Customer events", ratingCandidates.map(({ id }) => id));
  for (const { id } of ratingCandidates) {
    await queue.add("PROCESS_LEDGER_EVENT", { eventId: id, ...(sampledRatings.has(id) ? { pilotTrace: true, pilotTraceKind: "rating_recovery" as const } : {}) }, { jobId: `rate-${id}-${Math.floor(now.getTime() / 5000)}`, removeOnComplete: true });
  }
  return intents.length + ratingCandidates.length;
}
