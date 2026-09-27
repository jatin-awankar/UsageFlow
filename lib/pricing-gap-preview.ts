import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { createHmac, timingSafeEqual } from "node:crypto";

const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function parseUtcInstant(value: string): Date | null {
  if (!UTC_INSTANT.test(value) || !Number.isFinite(Date.parse(value))) return null;
  const date = new Date(value);
  return date.toISOString() === value ? date : null;
}

type ReviewScope = {
  orgId: string; metricId: string; customerId: string; start: string; end: string;
  currency: string; eligibleEventIds: string[]; reviewedAt: string; reviewerId: string;
};

function reviewSignature(scope: ReviewScope): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Review signing secret is unavailable");
  return createHmac("sha256", secret).update(JSON.stringify(scope)).digest();
}

export function verifyGapReview(scope: ReviewScope, token: string): boolean {
  const reviewedAt = parseUtcInstant(scope.reviewedAt);
  const age = reviewedAt ? Date.now() - reviewedAt.getTime() : -1;
  if (age < 0 || age > 24 * 60 * 60 * 1000 || !/^[0-9a-f]{64}$/.test(token)) return false;
  return timingSafeEqual(reviewSignature(scope), Buffer.from(token, "hex"));
}

export async function previewPricingGap(orgId: string, metricId: string, customerId: string, startText: string, endText: string, reviewerId: string, db: Prisma.TransactionClient = prisma) {
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
  const reviewedAt = new Date().toISOString();
  const reviewScope = { orgId, metricId, customerId, start: start.toISOString(), end: end.toISOString(),
    currency: org.currency, eligibleEventIds: events.map((event) => event.id), reviewedAt, reviewerId };
  return {
    orgId, metricId, metricKey: metric.key, metricName: metric.name,
    customerId, externalCustomerId: customer.externalId, currency: org.currency,
    start: start.toISOString(), end: end.toISOString(),
    eligibleEventIds: events.map((event) => event.id),
    reviewedAt, reviewToken: reviewSignature(reviewScope).toString("hex"),
    events: events.map((event) => ({
      eventId: event.id, occurredAt: event.timestamp.toISOString(), receivedAt: event.receivedAt?.toISOString() ?? null,
      metric: event.metricKey, quantity: event.amount, processingState: event.processingState,
      ratingState: "UNRATED" as const, ratingReason: "NO_APPLICABLE_PRICE" as const,
    })),
  };
}
