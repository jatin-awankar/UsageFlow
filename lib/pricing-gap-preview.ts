import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function parseUtcInstant(value: string): Date | null {
  if (!UTC_INSTANT.test(value) || !Number.isFinite(Date.parse(value))) return null;
  const date = new Date(value);
  return date.toISOString() === value ? date : null;
}

export async function previewPricingGap(orgId: string, metricId: string, customerId: string, startText: string, endText: string, db: Prisma.TransactionClient = prisma) {
  const start = parseUtcInstant(startText);
  const end = parseUtcInstant(endText);
  if (!start || !end || start >= end) return { error: "Enter an increasing half-open interval using UTC instants with milliseconds." } as const;

  const [org, metric, customer] = await Promise.all([
    db.organization.findUnique({ where: { id: orgId }, select: { currency: true } }),
    db.metric.findFirst({ where: { id: metricId, orgId }, select: { id: true, key: true, name: true } }),
    db.customer.findFirst({ where: { id: customerId, orgId }, select: { id: true, externalId: true } }),
  ]);
  if (!org?.currency || !metric || !customer) return { error: "Organization currency, metric, or Customer is unavailable." } as const;

  // A published version applies from its start until the next version, or forever.
  // Thus any version before the requested end overlaps this interval.
  const published = await db.priceVersion.findFirst({ where: { orgId, metricId, effectiveFrom: { lt: end } }, select: { id: true } });
  if (published) return { error: "A published price applies within this interval." } as const;

  const events = await db.usageEvent.findMany({
    where: {
      orgId, metricId, billedCustomerId: customerId, billingTreatment: "LEDGER_ONLY",
      timestamp: { gte: start, lt: end },
      unratedEvent: { is: { orgId, billedCustomerId: customerId, metricId, reason: "NO_APPLICABLE_PRICE" } },
      ratedEvent: { is: null },
    },
    orderBy: [{ timestamp: "asc" }, { id: "asc" }],
    select: { id: true, timestamp: true, receivedAt: true, amount: true, metricKey: true, processingState: true },
  });
  return {
    orgId, metricId, metricKey: metric.key, metricName: metric.name,
    customerId, externalCustomerId: customer.externalId, currency: org.currency,
    start: start.toISOString(), end: end.toISOString(),
    eligibleEventIds: events.map((event) => event.id),
    events: events.map((event) => ({
      eventId: event.id, occurredAt: event.timestamp.toISOString(), receivedAt: event.receivedAt?.toISOString() ?? null,
      metric: event.metricKey, quantity: event.amount, processingState: event.processingState,
      ratingState: "UNRATED" as const, ratingReason: "NO_APPLICABLE_PRICE" as const,
    })),
  };
}
