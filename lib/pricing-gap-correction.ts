import prisma from "@/lib/prisma";
import { previewPricingGap, parseUtcInstant } from "@/lib/pricing-gap-preview";
import { rateMoney } from "@/lib/money-contract";

type Approval = {
  orgId: string; metricId: string; customerId: string; start: string; end: string;
  reviewedAt: string; eligibleEventIds: string[]; unitPrice: string; currency: string;
  reason: string; evidence: string; actorId: string;
};

export class CorrectionRejected extends Error {}

export async function approvePricingGap(input: Approval) {
  const { orgId, metricId, customerId, start, end, reviewedAt, eligibleEventIds, unitPrice, currency, reason, evidence, actorId } = input;
  if (!parseUtcInstant(reviewedAt) || !Array.isArray(eligibleEventIds) || eligibleEventIds.length === 0 ||
      !eligibleEventIds.every((id) => typeof id === "string" && id.length > 0) ||
      !reason?.trim() || !evidence?.trim()) throw new CorrectionRejected("Complete the review, affected IDs, reason, and evidence.");
  let micros: bigint;
  try {
    rateMoney(unitPrice, 1n, currency);
    const [whole, fraction = ""] = unitPrice.split(".");
    micros = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0") || "0");
  } catch { throw new CorrectionRejected("Invalid unit price or currency."); }
  return prisma.$transaction(async (tx) => {
    // This is the same lock used for ordinary publication and rating.
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Organization" WHERE id = ${orgId} FOR NO KEY UPDATE`;
    if (!locked.length) throw new CorrectionRejected("Organization is unavailable.");
    const preview = await previewPricingGap(orgId, metricId, customerId, start, end, tx);
    if ("error" in preview) throw new CorrectionRejected(preview.error);
    if (preview.currency !== currency) throw new CorrectionRejected("Currency changed since review.");
    const expected = preview.eligibleEventIds;
    if (eligibleEventIds.length !== expected.length ||
      new Set(eligibleEventIds).size !== expected.length ||
      eligibleEventIds.some((id) => !expected.includes(id))) throw new CorrectionRejected("Reviewed event IDs are stale or incomplete.");
    const amounts = preview.events.map((event) => {
      try { return rateMoney(unitPrice, BigInt(event.quantity), currency); }
      catch { throw new CorrectionRejected("Corrected amount exceeds the money contract."); }
    });
    const correction = await tx.pricingGapCorrection.create({ data: {
      orgId, metricId, billedCustomerId: customerId, start: new Date(start), end: new Date(end),
      currency, unitPriceMicros: micros, reviewedAt: new Date(reviewedAt), approvedById: actorId,
      reason: reason.trim(), evidence: evidence.trim(), affectedEventIds: expected,
      // RatedEvent uses eventId as its primary key; these are the resulting rating IDs.
      resultingRatingIds: expected,
    } });
    for (const [index, event] of preview.events.entries()) {
      await tx.ratedEvent.create({ data: {
        eventId: event.eventId, orgId, billedCustomerId: customerId, metricId,
        correctionId: correction.id, quantity: event.quantity, unitPriceMicros: micros,
        amount: amounts[index], currency,
      } });
    }
    return { correctionId: correction.id, affectedEventIds: expected, resultingRatingIds: expected };
  });
}
