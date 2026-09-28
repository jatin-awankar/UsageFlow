import type { NextRequest } from "next/server";
import { Prisma, type BillingRecordVersion } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { requestTime, type Month } from "@/lib/billing-record-calculation";
import { billingEventTargets } from "@/lib/webhooks/billing-targets";

type Line = { amount: string; ratedAmount?: string; adjustmentAmount?: string; currency: string; sourceEventIds: string[]; [key: string]: unknown };
type Change = { lineIndex: number; sourceEventIds: string[]; signedDelta: string; revisedAmount: string };
export type RevisionInput = { expectedVersionId: string; requestId: string; reason: string; evidenceRef: string; currency: string; signedDelta: string; revisedAmount: string; affectedLines: Change[] };
const exact = (value: unknown) => typeof value === "string" && /^-?(?:0|[1-9]\d{0,32})\.\d{3}$/.test(value) ? BigInt(value.replace(".", "")) : null;
const money = (value: bigint) => `${value < 0n ? "-" : ""}${(value < 0n ? -value : value) / 1000n}.${((value < 0n ? -value : value) % 1000n).toString().padStart(3, "0")}`;
const durableEvidence = (value: string) => /^https:\/\/[^\s/?#]+\/[^\s#]+$/.test(value) || /^urn:[a-z0-9][a-z0-9-]*:[A-Za-z0-9][A-Za-z0-9:._/-]+$/.test(value);

function revisionHash(input: RevisionInput) {
  const fields = { expectedVersionId: input.expectedVersionId, reason: input.reason.trim(), evidenceRef: input.evidenceRef,
    currency: input.currency, signedDelta: input.signedDelta, revisedAmount: input.revisedAmount,
    affectedLines: input.affectedLines.map((line) => ({ lineIndex: line.lineIndex, sourceEventIds: [...line.sourceEventIds].sort(),
      signedDelta: line.signedDelta, revisedAmount: line.revisedAmount }))
      .sort((a, b) => a.lineIndex - b.lineIndex) };
  return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}

export function validRevisionInput(value: unknown): value is RevisionInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.expectedVersionId === "string" && v.expectedVersionId.length > 0 &&
    typeof v.requestId === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v.requestId) &&
    typeof v.reason === "string" && v.reason.trim().length > 0 && v.reason.length <= 2000 &&
    typeof v.evidenceRef === "string" && v.evidenceRef.length <= 2048 && durableEvidence(v.evidenceRef) &&
    typeof v.currency === "string" && /^[A-Z]{3}$/.test(v.currency) && exact(v.signedDelta) !== null && exact(v.revisedAmount) !== null &&
    Array.isArray(v.affectedLines) && v.affectedLines.length > 0 && v.affectedLines.every((item) => item && typeof item === "object" &&
      Number.isSafeInteger(item.lineIndex) && item.lineIndex >= 0 && Array.isArray(item.sourceEventIds) && item.sourceEventIds.length > 0 &&
      item.sourceEventIds.every((id: unknown) => typeof id === "string" && id.length > 0) && exact(item.signedDelta) !== null && exact(item.revisedAmount) !== null);
}

function calculateRevision(previous: BillingRecordVersion, input: RevisionInput, adjustmentId: string) {
  const priorLines = previous.lines as Line[];
  const lines = priorLines.map((line) => ({ ...line, ratedAmount: line.ratedAmount ?? line.amount,
    adjustmentAmount: line.adjustmentAmount ?? "0.000" }));
  const seen = new Set<number>();
  let totalDelta = 0n;
  for (const change of input.affectedLines) {
    const line = priorLines[change.lineIndex];
    const delta = exact(change.signedDelta), revised = exact(change.revisedAmount);
    if (!line || seen.has(change.lineIndex) || line.currency !== previous.currency || delta === null || revised === null || delta === 0n || revised < 0n ||
      exact(line.amount) === null || exact(line.amount)! + delta !== revised ||
      change.sourceEventIds.length !== line.sourceEventIds.length || new Set(change.sourceEventIds).size !== line.sourceEventIds.length ||
      !change.sourceEventIds.every((id) => line.sourceEventIds.includes(id))) return { blocked: [{ code: "INVALID_AFFECTED_LINE" }] };
    seen.add(change.lineIndex);
    const ratedAmount = exact(line.ratedAmount ?? line.amount);
    if (ratedAmount === null) return { blocked: [{ code: "INVALID_AFFECTED_LINE" }] };
    lines[change.lineIndex] = { ...line, ratedAmount: money(ratedAmount), adjustmentAmount: money(revised - ratedAmount), amount: money(revised) };
    totalDelta += delta;
  }
  const priorAmount = exact(previous.amount.toFixed(3)), delta = exact(input.signedDelta), revisedAmount = exact(input.revisedAmount);
  if (priorAmount === null || delta === null || revisedAmount === null || delta === 0n || totalDelta !== delta || revisedAmount < 0n || priorAmount + delta !== revisedAmount ||
    lines.some((line) => exact(line.amount) === null || exact(line.ratedAmount) === null || exact(line.adjustmentAmount) === null ||
      exact(line.ratedAmount)! + exact(line.adjustmentAmount)! !== exact(line.amount)) ||
    lines.reduce((sum, line) => sum + exact(line.amount)!, 0n) !== revisedAmount)
    return { blocked: [{ code: "AMOUNT_MISMATCH" }] };
  const priorReconciliation = previous.reconciliation as { rated: { amount: string }; adjustments?: Prisma.InputJsonValue[]; [key: string]: unknown };
  const reconciliation = { ...priorReconciliation, adjustments: [
    ...(priorReconciliation.adjustments ?? []),
    { previousAmount: previous.amount.toFixed(3), signedDelta: input.signedDelta, revisedAmount: input.revisedAmount, adjustmentId }],
    revised: { ratedAmount: priorReconciliation.rated.amount,
      adjustmentAmount: money(revisedAmount - exact(priorReconciliation.rated.amount)!),
      amount: input.revisedAmount, currency: previous.currency, lineCount: lines.length, balanced: true } };
  return { lines, reconciliation };
}

export async function reviseBillingRecord(request: NextRequest, orgId: string, actorId: string, customerId: string, period: Month, input: RevisionInput) {
  const failAt = request.headers.get("x-billing-test-fail-revision");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`LOCK TABLE "Membership", "Customer" IN SHARE MODE`;
    const membership = await tx.membership.findUnique({ where: { userId_orgId: { userId: actorId, orgId } }, select: { role: true } });
    if (membership?.role !== "OWNER") return { blocked: [{ code: "OWNER_REQUIRED" }] };
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${orgId + ":" + customerId + ":" + period.start.toISOString()}, 0))`;
    const binding = await tx.billingRevisionRequest.findUnique({ where: { orgId_requestId: { orgId, requestId: input.requestId } } });
    if (binding) {
      if (binding.billedCustomerId !== customerId || binding.periodStart.getTime() !== period.start.getTime() ||
        binding.expectedVersionId !== input.expectedVersionId || binding.requestHash !== revisionHash(input))
        return { blocked: [{ code: "REQUEST_ID_CONFLICT" }] };
      return { versionId: binding.versionId, eventId: binding.eventId, adjustmentId: binding.adjustmentId,
        billingRecordId: binding.billingRecordId, kind: "BILLING_RECORD_COMPARISON_CALCULATION" };
    }
    const record = await tx.billingRecord.findUnique({ where: { orgId_billedCustomerId_periodStart: { orgId, billedCustomerId: customerId, periodStart: period.start } } });
    if (!record?.currentFinalVersionId) return { blocked: [{ code: "NOT_FINALIZED" }] };
    if (record.currentFinalVersionId !== input.expectedVersionId) return { blocked: [{ code: "STALE_VERSION", currentVersionId: record.currentFinalVersionId }] };
    const previous = await tx.billingRecordVersion.findUniqueOrThrow({ where: { id: input.expectedVersionId } });
    if (input.currency !== previous.currency) return { blocked: [{ code: "CURRENCY_CHANGE" }] };
    if (await tx.billingRecordAdjustment.findFirst({ where: { billingRecordId: record.id, requestId: input.requestId } }))
      return { blocked: [{ code: "REQUEST_ID_CONFLICT" }] };
    const adjustmentId = randomUUID(), versionId = randomUUID(), eventId = randomUUID();
    const calculation = calculateRevision(previous, input, adjustmentId);
    if ("blocked" in calculation) return calculation;
    if (failAt === "before-adjustment") throw new Error("Injected revision failure");
    await tx.billingRecordAdjustment.create({ data: { id: adjustmentId, billingRecordId: record.id, previousVersionId: previous.id,
      actorId, requestId: input.requestId, createdAt: requestTime(request), reason: input.reason.trim(), evidenceRef: input.evidenceRef,
      affectedLines: input.affectedLines as unknown as Prisma.InputJsonValue, currency: previous.currency,
      previousAmount: previous.amount, signedDelta: input.signedDelta, revisedAmount: input.revisedAmount } });
    if (failAt === "before-version") throw new Error("Injected revision failure");
    await tx.billingRecordVersion.create({ data: { id: versionId, billingRecordId: record.id, snapshotId: previous.snapshotId,
      version: previous.version + 1, approvedById: actorId, finalizedAt: requestTime(request), predecessorId: previous.id, adjustmentId,
      periodStart: previous.periodStart, periodEnd: previous.periodEnd, closeAt: previous.closeAt,
      sourceEvents: previous.sourceEvents as Prisma.InputJsonValue, ratedSources: previous.ratedSources as Prisma.InputJsonValue,
      eventOutcomes: previous.eventOutcomes as Prisma.InputJsonValue, lines: calculation.lines as Prisma.InputJsonValue,
      reconciliation: calculation.reconciliation as Prisma.InputJsonValue,
      lateArrivals: previous.lateArrivals as Prisma.InputJsonValue,
      comparison: previous.comparison as Prisma.InputJsonValue, currency: previous.currency, amount: input.revisedAmount } });
    if (failAt === "before-pointer") throw new Error("Injected revision failure");
    await tx.billingRecord.update({ where: { id: record.id }, data: { currentFinalVersionId: versionId } });
    if (failAt === "before-event") throw new Error("Injected revision failure");
    const targets = await billingEventTargets(tx, orgId, "invoice.revised");
    await tx.webhookEvent.create({ data: { id: eventId, orgId, type: "invoice.revised", billingRecordVersionId: versionId, ...targets,
      payload: { organizationId: orgId, billingRecordId: record.id, customerId, periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(), versionId, predecessorVersionId: previous.id, version: previous.version + 1,
        currency: previous.currency, previousAmount: previous.amount.toFixed(3), amount: input.revisedAmount, adjustmentId } } });
    await tx.billingRevisionRequest.create({ data: { orgId, requestId: input.requestId, billedCustomerId: customerId,
      periodStart: period.start, billingRecordId: record.id, expectedVersionId: previous.id,
      requestHash: revisionHash(input), adjustmentId, versionId, eventId } });
    return { versionId, eventId, adjustmentId, billingRecordId: record.id, kind: "BILLING_RECORD_COMPARISON_CALCULATION" };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
