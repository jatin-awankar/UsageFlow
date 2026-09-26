import prisma from "@/lib/prisma";
import { displayUnitPrice } from "@/lib/price-format";
import { rateMoney } from "@/lib/money-contract";

export async function findRateableUnratedEventIds() {
  return prisma.$queryRaw<{ id: string }[]>`
    SELECT e.id FROM "UsageEvent" e
    WHERE e."billingTreatment" = 'LEDGER_ONLY' AND e."processingState" = 'PROCESSED'
      AND e."billedCustomerId" IS NOT NULL AND e."metricId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "RatedEvent" r WHERE r."eventId" = e.id)
      AND NOT EXISTS (SELECT 1 FROM "RatingFailure" f WHERE f."eventId" = e.id)
      AND EXISTS (SELECT 1 FROM "Metric" m WHERE m.id = e."metricId" AND m."orgId" = e."orgId" AND m.key = e."metricKey")
      AND EXISTS (SELECT 1 FROM "PriceVersion" p WHERE p."orgId" = e."orgId" AND p."metricId" = e."metricId" AND p."effectiveFrom" <= e.timestamp)
    ORDER BY e."createdAt" ASC LIMIT 100`;
}

export async function rateCustomerEvent(eventId: string) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.usageEvent.findUnique({ where: { id: eventId } });
    if (!event || event.billingTreatment !== "LEDGER_ONLY" || event.processingState !== "PROCESSED" || !event.billedCustomerId || !event.metricId) return;
    // Published schedules and ratings serialize on the Organization row.
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${event.orgId} FOR NO KEY UPDATE`;
    if (await tx.ratedEvent.findUnique({ where: { eventId } }) || await tx.ratingFailure.findUnique({ where: { eventId } })) return;
    const metric = await tx.metric.findFirst({ where: { id: event.metricId, orgId: event.orgId, key: event.metricKey } });
    if (!metric) return;
    const version = await tx.priceVersion.findFirst({
      where: { orgId: event.orgId, metricId: metric.id, effectiveFrom: { lte: event.timestamp } },
      orderBy: { effectiveFrom: "desc" },
    });
    if (!version) return; // Ticket 05 persists and exposes missing-price outcomes.
    let amount: string;
    try {
      amount = rateMoney(displayUnitPrice(version.unitPriceMicros), BigInt(event.amount), version.currency);
    } catch (error) {
      if (!(error instanceof RangeError) || error.message !== "Extended amount exceeds limit") throw error;
      await tx.ratingFailure.create({ data: { eventId, orgId: event.orgId, metricId: metric.id, priceVersionId: version.id, reason: "AMOUNT_OVERFLOW" } });
      return;
    }
    await tx.ratedEvent.create({ data: {
      eventId, orgId: event.orgId, billedCustomerId: event.billedCustomerId,
      metricId: metric.id, priceVersionId: version.id, quantity: event.amount,
      unitPriceMicros: version.unitPriceMicros, amount, currency: version.currency,
    } });
  });
}
