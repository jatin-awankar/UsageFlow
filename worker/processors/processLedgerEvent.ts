import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";

const LEASE_MS = 30_000;
const RETRY_MS = 5_000;

export async function processLedgerEvent(eventId: string) {
  const token = randomUUID();
  const now = new Date();
  const claimed = await prisma.$transaction(async (tx) => {
    const intent = await tx.ledgerProcessingIntent.updateMany({
      where: {
        eventId,
        event: { billingTreatment: "LEDGER_ONLY", processingState: { in: ["PENDING", "PROCESSING", "FAILED"] } },
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
      },
      data: { leaseToken: token, leaseUntil: new Date(now.getTime() + LEASE_MS), attempts: { increment: 1 }, failureReason: null },
    });
    if (intent.count === 0) return false;
    await tx.usageEvent.update({ where: { id: eventId }, data: { processingState: "PROCESSING" } });
    return true;
  });
  if (!claimed) return;

  // The integration suite kills this worker after the durable PROCESSING claim.
  if (process.env.NODE_ENV !== "production" && process.env.LEDGER_TEST_EXIT_AFTER_CLAIM === "true") process.exit(91);

  try {
    if (process.env.NODE_ENV !== "production" && process.env.LEDGER_TEST_FAIL_PROJECTION === "true") throw new Error("injected projection failure");
    await prisma.$transaction(async (tx) => {
      const ownership = await tx.ledgerProcessingIntent.updateMany({
        where: { eventId, leaseToken: token, leaseUntil: { gt: new Date() } },
        data: { leaseUntil: new Date(Date.now() + LEASE_MS) },
      });
      if (ownership.count === 0) return;
      const event = await tx.usageEvent.findUniqueOrThrow({ where: { id: eventId } });
      if (event.billingTreatment !== "LEDGER_ONLY" || !event.billedCustomerId) throw new Error("invalid ledger event");
      await tx.ledgerEventProjection.upsert({
        where: { eventId },
        create: { eventId, orgId: event.orgId, billedCustomerId: event.billedCustomerId, metricKey: event.metricKey, amount: event.amount },
        update: {},
      });
      await tx.usageEvent.update({ where: { id: eventId }, data: { processingState: "PROCESSED" } });
      await tx.ledgerProcessingIntent.update({ where: { eventId }, data: { leaseToken: null, leaseUntil: null, failureReason: null } });
    });
  } catch (error) {
    console.error("Ledger projection failed", { eventId, error });
    await prisma.$transaction(async (tx) => {
      const ownership = await tx.ledgerProcessingIntent.updateMany({
        where: { eventId, leaseToken: token },
        data: { leaseToken: null, leaseUntil: new Date(Date.now() + RETRY_MS), failureReason: "LEDGER_PROJECTION_FAILED" },
      });
      if (ownership.count) await tx.usageEvent.update({ where: { id: eventId }, data: { processingState: "FAILED" } });
    });
  }
}
