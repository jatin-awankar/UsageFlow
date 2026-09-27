import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/authz/getMembership";

function month(value: string | null) {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [year, number] = value.split("-").map(Number);
  const start = new Date(Date.UTC(year, number - 1, 1));
  const end = new Date(Date.UTC(year, number, 1));
  if (start.getUTCFullYear() !== year) return null;
  return { start, end, close: new Date(end.getTime() + 72 * 60 * 60 * 1000) };
}

type Month = NonNullable<ReturnType<typeof month>>;

async function authorized(orgId: string) {
  const user = await getCurrentUser();
  return !!user?.id && (await getMembership(user.id, orgId))?.role === "OWNER";
}

function requestTime(request: NextRequest) {
  const testClock = process.env.NODE_ENV !== "production" && process.env.BILLING_RECORD_TEST_CLOCK_ENABLED === "true" && process.env.CUSTOMER_LINKED_INGESTION_ENABLED === "true" ? request.headers.get("x-billing-test-now") : null;
  return testClock && !Number.isNaN(Date.parse(testClock)) ? new Date(testClock) : new Date();
}

function sameEvidence(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((item, index) => sameEvidence(item, right[index]));
  if (left && right && typeof left === "object" && typeof right === "object") {
    const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
    return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((key) => sameEvidence(a[key], b[key]));
  }
  return left === right;
}

async function calculateRecord(orgId: string, billedCustomerId: string, period: Month, request: NextRequest) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${orgId + ":" + billedCustomerId + ":" + period.start.toISOString()}, 0))`;
    const calculatedAt = requestTime(request);
    const key = { orgId, billedCustomerId, periodStart: period.start };
    let existing = await tx.billingRecord.findUnique({ where: { orgId_billedCustomerId_periodStart: key }, include: { currentSnapshot: true } });
    const events = await tx.usageEvent.findMany({
      where: { orgId, billedCustomerId, billingTreatment: "LEDGER_ONLY", timestamp: { gte: period.start, lt: period.end } },
      orderBy: [{ timestamp: "asc" }, { id: "asc" }],
      select: { id: true, timestamp: true, receivedAt: true, metricKey: true, amount: true, processingState: true },
    });
    const sourceEvents = events.map((event) => ({ eventId: event.id, occurredAt: event.timestamp.toISOString(), receivedAt: event.receivedAt?.toISOString() ?? null, metric: event.metricKey, quantity: event.amount, processingState: event.processingState }));
    const state = calculatedAt <= period.close ? "OPEN" : "BLOCKED";
    if (!existing) {
      existing = await tx.billingRecord.create({ data: { ...key, periodEnd: period.end, closeAt: period.close }, include: { currentSnapshot: true } });
    }
    if (existing.currentSnapshot?.state === state && sameEvidence(existing.currentSnapshot.sourceEvents, sourceEvents)) return existing;
    const snapshot = await tx.billingRecordSnapshot.create({ data: { billingRecordId: existing.id, calculatedAt, state, sourceEvents: sourceEvents as Prisma.InputJsonValue } });
    return tx.billingRecord.update({ where: { id: existing.id }, data: { currentSnapshotId: snapshot.id }, include: { currentSnapshot: true } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

function recordResponse(record: Awaited<ReturnType<typeof calculateRecord>>) {
  return NextResponse.json({ id: record.id, orgId: record.orgId, billedCustomerId: record.billedCustomerId, periodStart: record.periodStart, periodEnd: record.periodEnd, closeAt: record.closeAt, currentSnapshotId: record.currentSnapshotId, kind: "CALCULATION", snapshot: record.currentSnapshot });
}

export async function POST(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  if (!(await authorized(orgId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const period = month(body?.month);
  if (!period || typeof body?.billedCustomerId !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const customer = await prisma.customer.findFirst({ where: { id: body.billedCustomerId, orgId }, select: { id: true } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return recordResponse(await calculateRecord(orgId, customer.id, period, request));
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
