import prisma from "@/lib/prisma";
import { getUsageFlowQueue } from "@/lib/bullmq";

export async function recoverLedgerWork() {
  const now = new Date();
  const intents = await prisma.ledgerProcessingIntent.findMany({
    where: {
      event: { billingTreatment: "LEDGER_ONLY", processingState: { in: ["PENDING", "PROCESSING", "FAILED"] } },
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
    },
    select: { eventId: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  const queue = getUsageFlowQueue();
  for (const { eventId } of intents) {
    // A crashed BullMQ job can retain its original ID until BullMQ detects a stall.
    // A fresh recovery ID lets the expired PostgreSQL lease determine ownership.
    await queue.add("PROCESS_LEDGER_EVENT", { eventId }, { jobId: `recover-${eventId}-${Math.floor(now.getTime() / 5000)}`, removeOnComplete: true });
  }
  return intents.length;
}
