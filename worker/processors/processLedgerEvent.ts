import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { rateCustomerEvent } from "./rateCustomerEvent";

const LEASE_MS = 30_000;
const RETRY_MS = 5_000;
let skipFirstRatingForTest = true;

class InvalidLedgerEventError extends Error {}

function safeFailureReason(error: unknown) {
  if (error instanceof InvalidLedgerEventError) return "LEDGER_EVENT_INVALID";
  if (error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      (error instanceof Error && error.name === "DriverAdapterError")) return "LEDGER_STORAGE_FAILED";
  return "LEDGER_PROJECTION_FAILED";
}

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
  if (!claimed) {
    try { await rateCustomerEvent(eventId); } catch (error) { console.error("Customer rating failed", { eventId, error }); }
    return;
  }

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
      if (event.billingTreatment !== "LEDGER_ONLY" || !event.billedCustomerId) throw new InvalidLedgerEventError("invalid ledger event");
      await tx.ledgerEventProjection.upsert({
        where: { eventId },
        create: { eventId, orgId: event.orgId, billedCustomerId: event.billedCustomerId, metricKey: event.metricKey, amount: event.amount },
        update: {},
      });
      await tx.usageEvent.update({ where: { id: eventId }, data: { processingState: "PROCESSED" } });
      await tx.ledgerProcessingIntent.update({ where: { eventId }, data: { leaseToken: null, leaseUntil: null, failureReason: null } });
    });
    if (process.env.NODE_ENV !== "production" && process.env.RATING_TEST_SKIP_ONCE === "true" && skipFirstRatingForTest) {
      skipFirstRatingForTest = false;
      console.log("Rating interrupted after projection", eventId);
      return; // Simulate interruption after the committed ledger projection.
    }
    try { await rateCustomerEvent(eventId); } catch (error) { console.error("Customer rating failed", { eventId, error }); }
  } catch (error) {
    console.error("Ledger projection failed", { eventId, error });
    await prisma.$transaction(async (tx) => {
      const ownership = await tx.ledgerProcessingIntent.updateMany({
        where: { eventId, leaseToken: token },
        data: { leaseToken: null, leaseUntil: new Date(Date.now() + RETRY_MS), failureReason: safeFailureReason(error) },
      });
      if (ownership.count) await tx.usageEvent.update({ where: { id: eventId }, data: { processingState: "FAILED" } });
    });
  }
}
