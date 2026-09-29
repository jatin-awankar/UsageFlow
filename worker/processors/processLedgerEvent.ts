import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { emitPilotEvidenceTrace } from "@/lib/pilotEvidenceTrace";
import { Prisma } from "@prisma/client";
import { attemptCustomerRating } from "./rateCustomerEvent";

const LEASE_MS = 30_000;
const RETRY_MS = 5_000;

class InvalidLedgerEventError extends Error {}

function safeFailureReason(error: unknown) {
  if (error instanceof InvalidLedgerEventError) return "LEDGER_EVENT_INVALID";
  if (error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      (error instanceof Error && error.name === "DriverAdapterError")) return "LEDGER_STORAGE_FAILED";
  return "LEDGER_PROJECTION_FAILED";
}

export async function processLedgerEvent(eventId: string, pilotTrace = false) {
  const trace = (stage: string) => {
    if (pilotTrace && process.env.PILOT_EVIDENCE_TRACE === "true") {
      emitPilotEvidenceTrace({ stage, eventId, at: new Date().toISOString() });
    }
  };
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
  if (claimed) trace("durable_claim");
  if (!claimed) {
    await attemptCustomerRating(eventId);
    return;
  }

  // The integration suite kills this worker after the durable PROCESSING claim.
  const pauseAfterClaimMs = process.env.NODE_ENV !== "production" ? Number(process.env.LEDGER_TEST_PAUSE_AFTER_CLAIM_MS || 0) : 0;
  if (pauseAfterClaimMs > 0 && pauseAfterClaimMs <= 10000) await new Promise((resolve) => setTimeout(resolve, pauseAfterClaimMs));
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
    trace("projection_committed");
    if (process.env.NODE_ENV !== "production" && process.env.LEDGER_TEST_EXIT_BEFORE_RATING === "true") process.exit(92);
    await attemptCustomerRating(eventId);
    trace("rating_attempt_finished");
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
