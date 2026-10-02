import prisma from "@/lib/prisma";
import { displayUnitPrice } from "@/lib/price-format";
import { rateMoney } from "@/lib/money-contract";
import { Prisma } from "@prisma/client";
import { emitPilotEvidenceTrace } from "@/lib/pilotEvidenceTrace";

export async function findRateableUnratedEventIds() {
  return prisma.$queryRaw<{ id: string }[]>`
    SELECT e.id FROM "UsageEvent" e
    WHERE e."billingTreatment" = 'LEDGER_ONLY' AND e."processingState" = 'PROCESSED'
      AND e."billedCustomerId" IS NOT NULL AND e."metricId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "RatedEvent" r WHERE r."eventId" = e.id)
      AND NOT EXISTS (SELECT 1 FROM "RatingFailure" f WHERE f."eventId" = e.id)
      AND NOT EXISTS (SELECT 1 FROM "UnratedEvent" u WHERE u."eventId" = e.id)
      AND (NOT EXISTS (SELECT 1 FROM "RatingRetry" rr WHERE rr."eventId" = e.id) OR
           EXISTS (SELECT 1 FROM "RatingRetry" rr WHERE rr."eventId" = e.id AND rr."retryAfter" <= now()))
      AND EXISTS (SELECT 1 FROM "Metric" m WHERE m.id = e."metricId" AND m."orgId" = e."orgId" AND m.key = e."metricKey")
    ORDER BY e."createdAt" ASC LIMIT 100`;
}

export async function rateCustomerEvent(eventId: string, pilotTrace = false) {
  if (process.env.NODE_ENV !== "production" && process.env.RATING_TEST_FAIL_ATTEMPT === "true") {
    throw new Error("injected transient rating failure");
  }
  const started = performance.now();
  let lockStarted = started;
  let lockAcquired = started;
  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.usageEvent.findUnique({ where: { id: eventId } });
    if (!event || event.billingTreatment !== "LEDGER_ONLY" || event.processingState !== "PROCESSED" || !event.billedCustomerId || !event.metricId) return;
    // Published schedules and ratings serialize on the Organization row.
    lockStarted = performance.now();
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${event.orgId} FOR NO KEY UPDATE`;
    lockAcquired = performance.now();
    if (await tx.ratedEvent.findUnique({ where: { eventId } }) || await tx.ratingFailure.findUnique({ where: { eventId } }) || await tx.unratedEvent.findUnique({ where: { eventId } })) return;
    const metric = await tx.metric.findFirst({ where: { id: event.metricId, orgId: event.orgId, key: event.metricKey } });
    if (!metric) return;
    const version = await tx.priceVersion.findFirst({
      where: { orgId: event.orgId, metricId: metric.id, effectiveFrom: { lte: event.timestamp } },
      orderBy: { effectiveFrom: "desc" },
    });
    if (!version) {
      await tx.unratedEvent.create({ data: { eventId, orgId: event.orgId, billedCustomerId: event.billedCustomerId, metricId: metric.id, reason: "NO_APPLICABLE_PRICE" } });
      await tx.ratingRetry.deleteMany({ where: { eventId } });
      return;
    }
    let amount: string;
    try {
      amount = rateMoney(displayUnitPrice(version.unitPriceMicros), BigInt(event.amount), version.currency);
    } catch (error) {
      if (!(error instanceof RangeError) || error.message !== "Extended amount exceeds limit") throw error;
      await tx.ratingFailure.create({ data: { eventId, orgId: event.orgId, metricId: metric.id, priceVersionId: version.id, reason: "AMOUNT_OVERFLOW" } });
      await tx.ratingRetry.deleteMany({ where: { eventId } });
      return;
    }
    await tx.ratedEvent.create({ data: {
      eventId, orgId: event.orgId, billedCustomerId: event.billedCustomerId,
      metricId: metric.id, priceVersionId: version.id, quantity: event.amount,
      unitPriceMicros: version.unitPriceMicros, amount, currency: version.currency,
    } });
    await tx.ratingRetry.deleteMany({ where: { eventId } });
  });
  if (pilotTrace && process.env.PILOT_EVIDENCE_TRACE === "true") {
    emitPilotEvidenceTrace({ stage: "rating_timing", eventId, at: new Date().toISOString(), preLockMs: lockStarted - started, lockWaitMs: lockAcquired - lockStarted, transactionMs: performance.now() - started });
  }
  return result;
}

export async function attemptCustomerRating(eventId: string, pilotTrace = false) {
  try {
    await rateCustomerEvent(eventId, pilotTrace);
  } catch (error) {
    console.error("Customer rating failed", { eventId, error });
    const reason = error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      (error instanceof Error && error.name === "DriverAdapterError")
      ? "RATING_STORAGE_FAILED" : "RATING_WORKER_FAILED";
    const retryAfter = new Date(Date.now() + 5_000);
    try {
      await prisma.ratingRetry.upsert({
        where: { eventId },
        create: { eventId, attempts: 1, reason, retryAfter },
        update: { attempts: { increment: 1 }, reason, failedAt: new Date(), retryAfter },
      });
    } catch (recordError) {
      console.error("Rating retry persistence failed; recovery will scan accepted event", { eventId, recordError });
    }
  }
}
