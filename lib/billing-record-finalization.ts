import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { calculateInTransaction, requestTime, type Month } from "@/lib/billing-record-calculation";

export async function finalizeBillingRecord(request: NextRequest, orgId: string, actorId: string, customerId: string, period: Month) {
  const failAt = request.headers.get("x-billing-test-fail-finalization");
  return prisma.$transaction(async (tx) => {
    // Ledger and rating workers do not participate in the draft advisory lock.
    // Hold their evidence tables against writes before taking the approval read.
    await tx.$executeRaw`LOCK TABLE "Membership", "Customer", "UsageEvent", "LedgerProcessingIntent", "RatedEvent", "RatingRetry", "RatingFailure", "UnratedEvent" IN SHARE MODE`;
    const membership = await tx.membership.findUnique({ where: { userId_orgId: { userId: actorId, orgId } }, select: { role: true } });
    if (membership?.role !== "OWNER") return { blocked: [{ code: "OWNER_REQUIRED" }] };
    const scopedCustomer = await tx.customer.findFirst({ where: { id: customerId, orgId }, select: { id: true } });
    if (!scopedCustomer) return { blocked: [{ code: "CUSTOMER_NOT_FOUND" }] };
    const approvalAt = requestTime(request);
    const record = await calculateInTransaction(tx, orgId, customerId, period, request, approvalAt, true);
    const snapshot = record.currentSnapshot!;
    const outcomes = snapshot.eventOutcomes as Array<{ eventId: string; state: string; reason: string | null }>;
    const reconciliation = snapshot.reconciliation as { balanced: boolean; rated: { amount: string | null; currency: string | null } };
    const blockingReasons = [
      ...(approvalAt <= period.close ? [{ code: "CLOSE_NOT_PASSED" }] : []),
      ...outcomes.filter((outcome) => outcome.state !== "RATED").map((outcome) => ({ code: outcome.state, eventId: outcome.eventId, reason: outcome.reason })),
      ...(!reconciliation.balanced || !reconciliation.rated.amount || !reconciliation.rated.currency ? [{ code: "RECONCILIATION_MISMATCH" }] : []),
    ];
    if (blockingReasons.length || snapshot.state !== "READY_FOR_REVIEW") return { blocked: blockingReasons };
    if (record.currentFinalVersionId) return { blocked: [{ code: "ALREADY_FINALIZED" }] };
    const versionId = randomUUID();
    const eventId = randomUUID();
    const finalizedAt = approvalAt;
    if (failAt === "before-version") throw new Error("Injected finalization failure");
    await tx.billingRecordVersion.create({ data: {
      id: versionId, billingRecordId: record.id, snapshotId: snapshot.id, version: 1, approvedById: actorId, finalizedAt,
      periodStart: record.periodStart, periodEnd: record.periodEnd, closeAt: record.closeAt,
      sourceEvents: snapshot.sourceEvents as Prisma.InputJsonValue, ratedSources: snapshot.ratedSources as Prisma.InputJsonValue,
      eventOutcomes: snapshot.eventOutcomes as Prisma.InputJsonValue, lines: snapshot.lines as Prisma.InputJsonValue,
      reconciliation: snapshot.reconciliation as Prisma.InputJsonValue, lateArrivals: snapshot.lateArrivals as Prisma.InputJsonValue,
      comparison: snapshot.comparison === null ? Prisma.JsonNull : snapshot.comparison as Prisma.InputJsonValue,
      currency: reconciliation.rated.currency!, amount: reconciliation.rated.amount!,
    } });
    if (failAt === "before-pointer") throw new Error("Injected finalization failure");
    await tx.billingRecord.update({ where: { id: record.id }, data: { currentFinalVersionId: versionId } });
    if (failAt === "before-event") throw new Error("Injected finalization failure");
    await tx.webhookEvent.create({ data: { id: eventId, orgId, type: "invoice.finalized", billingRecordVersionId: versionId,
      payload: { organizationId: orgId, billingRecordId: record.id, customerId,
        periodStart: period.start.toISOString(), periodEnd: period.end.toISOString(), versionId, version: 1,
        currency: reconciliation.rated.currency!, amount: reconciliation.rated.amount! } } });
    return { versionId, eventId, billingRecordId: record.id, kind: "BILLING_RECORD_COMPARISON_CALCULATION" };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
