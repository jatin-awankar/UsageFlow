import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/authz/getMembership";
import { month, requestTime, calculateRecord } from "@/lib/billing-record-calculation";
import { finalizeBillingRecord } from "@/lib/billing-record-finalization";

async function authorized(orgId: string) {
  const user = await getCurrentUser();
  return user?.id && (await getMembership(user.id, orgId))?.role === "OWNER" ? user.id : null;
}

async function recordResponse(record: Awaited<ReturnType<typeof calculateRecord>>) {
  const history = await prisma.billingRecordSnapshot.findMany({ where: { billingRecordId: record.id }, orderBy: [{ calculatedAt: "asc" }, { id: "asc" }] });
  const finalVersion = record.currentFinalVersionId ? await prisma.billingRecordVersion.findUnique({ where: { id: record.currentFinalVersionId } }) : null;
  return NextResponse.json({ id: record.id, orgId: record.orgId, billedCustomerId: record.billedCustomerId, periodStart: record.periodStart, periodEnd: record.periodEnd, closeAt: record.closeAt, currentSnapshotId: record.currentSnapshotId, kind: "CALCULATION", snapshot: record.currentSnapshot, history,
    finalization: finalVersion ? { kind: "BILLING_RECORD_COMPARISON_CALCULATION", currentVersion: { ...finalVersion, amount: finalVersion.amount.toFixed(3) } } : null });
}

export async function POST(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const actorId = await authorized(orgId);
  if (!actorId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const period = month(body?.month);
  if (!period || typeof body?.billedCustomerId !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const customer = await prisma.customer.findFirst({ where: { id: body.billedCustomerId, orgId }, select: { id: true } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.action === "finalize") {
    // Delivery and recovery are not yet deployed. Only disposable acceptance runs can open this gate.
    if (process.env.NODE_ENV === "production" || process.env.CUSTOMER_BILLING_FINALIZATION_TEST_ENABLED !== "true" || process.env.CUSTOMER_LINKED_INGESTION_ENABLED !== "true")
      return NextResponse.json({ error: "Finalization unavailable" }, { status: 404 });
    if (typeof body.requestId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(body.requestId))
      return NextResponse.json({ error: "Invalid finalization request identity" }, { status: 400 });
    try {
      const result = await finalizeBillingRecord(request, orgId, actorId, customer.id, period, body.requestId);
      // A test-only post-commit failure models a lost response. The transaction
      // has completed; retrying this identity reads its durable binding.
      if (request.headers.get("x-billing-test-fail-finalization") === "after-commit") throw new Error("Injected response loss");
      return "blocked" in result ? NextResponse.json({ error: "Finalization blocked", blockingReasons: result.blocked }, { status: 409 }) : NextResponse.json(result);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code))
        return NextResponse.json({ error: "Finalization conflict" }, { status: 409 });
      throw error;
    }
  }
  const checkedAt = requestTime(request);
  const record = await calculateRecord(orgId, customer.id, period, request, checkedAt);
  if (body.action === "readiness") {
    const snapshot = record.currentSnapshot!;
    const outcomes = snapshot.eventOutcomes as Array<{ eventId: string; state: string; reason: string | null }>;
    const reconciliation = snapshot.reconciliation as { balanced: boolean; accepted: { count: number; quantity: string }; rated: { count: number; quantity: string; amount: string | null; currency: string | null } };
    const blockingReasons = [
      ...(checkedAt <= period.close ? [{ code: "CLOSE_NOT_PASSED" }] : []),
      ...outcomes.filter((outcome) => outcome.state !== "RATED").map((outcome) => ({ code: outcome.state, eventId: outcome.eventId, reason: outcome.reason })),
      ...(!reconciliation.balanced ? [{ code: "RECONCILIATION_MISMATCH" }] : []),
    ];
    return NextResponse.json({ billingRecordId: record.id, orgId, billedCustomerId: customer.id,
      periodStart: record.periodStart, periodEnd: record.periodEnd, closeAt: record.closeAt, checkedAt,
      ready: blockingReasons.length === 0 && snapshot.state === "READY_FOR_REVIEW",
      informational: true, blockingReasons, reconciliation, snapshotId: snapshot.id });
  }
  return recordResponse(record);
}

export async function GET(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  if (!(await authorized(orgId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const period = month(request.nextUrl.searchParams.get("month"));
  const billedCustomerId = request.nextUrl.searchParams.get("billedCustomerId");
  if (!period || !billedCustomerId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const record = await prisma.billingRecord.findFirst({ where: { orgId, billedCustomerId, periodStart: period.start }, include: { currentSnapshot: true } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (requestTime(request) > period.close && record.currentSnapshot?.state === "OPEN") {
    return recordResponse(await calculateRecord(orgId, billedCustomerId, period, request));
  }
  return recordResponse(record);
}
