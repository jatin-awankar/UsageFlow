import prisma from "@/lib/prisma";
import { getUsageFlowQueue } from "@/lib/bullmq";
import { isSampledPilotEvidenceKey } from "@/lib/pilotEvidenceTrace";
import { Prisma } from "@prisma/client";
import { findRateableUnratedEventIds } from "./processors/rateCustomerEvent";

// The API gives the initial Redis add 500 ms after committing the intent.
// Let that dispatch settle before checking whether its original job exists.
export const PENDING_DISPATCH_SETTLE_MS = 1_000;
const SCAN_BATCH_SIZE = 200;
let scanAfter: { createdAt: Date; eventId: string } | null = null;

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
  const pendingCutoff = new Date(now.getTime() - PENDING_DISPATCH_SETTLE_MS);
  const eligible: Prisma.LedgerProcessingIntentWhereInput = {
    event: { billingTreatment: "LEDGER_ONLY" },
    AND: [
      { OR: [
        { event: { processingState: "PENDING" }, createdAt: { lte: pendingCutoff } },
        { event: { processingState: { in: ["PROCESSING", "FAILED"] } } },
      ] },
      { OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
    ],
  };
  const findBatch = (after: typeof scanAfter) => prisma.ledgerProcessingIntent.findMany({
    where: after ? { AND: [eligible, { OR: [
      { createdAt: { gt: after.createdAt } },
      { createdAt: after.createdAt, eventId: { gt: after.eventId } },
    ] }] } : eligible,
    select: { eventId: true, createdAt: true, event: { select: { processingState: true } } },
    orderBy: [{ createdAt: "asc" }, { eventId: "asc" }],
    take: SCAN_BATCH_SIZE,
  });
  let intents = await findBatch(scanAfter);
  if (!intents.length && scanAfter) intents = await findBatch(null);
  const last = intents.at(-1);
  scanAfter = intents.length === SCAN_BATCH_SIZE && last ? { createdAt: last.createdAt, eventId: last.eventId } : null;
  // Recovery jobs have new IDs, so the original job's trace marker cannot follow them.
  const sampledIntents = await sampledIdsFor(intents.map(({ eventId }) => eventId));
  const queue = getUsageFlowQueue();
  for (const { eventId, event } of intents) {
    if (event.processingState === "PENDING") {
      // Redis errors leave the durable intent for the next scan. A finished or
      // absent original cannot process it, so a fresh wakeup is appropriate.
      const state = await queue.getJobState(`ledger-${eventId}`);
      if (["waiting", "active", "delayed", "prioritized", "waiting-children"].includes(state)) continue;
      const stillPending = await prisma.ledgerProcessingIntent.count({
        where: { eventId, createdAt: { lte: pendingCutoff }, event: { processingState: "PENDING" }, OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
      });
      if (!stillPending) continue;
    }
    // A crashed BullMQ job can retain its original ID until BullMQ detects a stall.
    // A fresh recovery ID lets the expired PostgreSQL lease determine ownership.
    const jobId = event.processingState === "PENDING" ? `recover-pending-${eventId}` : `recover-${eventId}-${Math.floor(now.getTime() / 5000)}`;
    await queue.add("PROCESS_LEDGER_EVENT", { eventId, ...(sampledIntents.has(eventId) ? { pilotTrace: true, pilotTraceKind: "ledger_recovery" as const } : {}) }, { jobId, removeOnComplete: true });
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
