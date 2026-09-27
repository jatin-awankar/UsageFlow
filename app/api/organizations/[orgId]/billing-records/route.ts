import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/authz/getMembership";
import { persistedRatedAmount, sumPersistedRatedAmounts } from "@/lib/persisted-rated-amount";

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

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

const safeReasons = new Set([
  "LEDGER_EVENT_INVALID", "LEDGER_STORAGE_FAILED", "LEDGER_PROJECTION_FAILED",
  "RATING_STORAGE_FAILED", "RATING_WORKER_FAILED", "AMOUNT_OVERFLOW", "NO_APPLICABLE_PRICE",
]);

function safeReason(reason: string | null | undefined) {
  return reason && safeReasons.has(reason) ? reason : null;
}

async function calculateRecord(orgId: string, billedCustomerId: string, period: Month, request: NextRequest) {
  const calculate = () => prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${orgId + ":" + billedCustomerId + ":" + period.start.toISOString()}, 0))`;
    const calculatedAt = requestTime(request);
    const key = { orgId, billedCustomerId, periodStart: period.start };
    let existing = await tx.billingRecord.findUnique({ where: { orgId_billedCustomerId_periodStart: key }, include: { currentSnapshot: true } });
    const events = await tx.usageEvent.findMany({
      where: { orgId, billedCustomerId, billingTreatment: "LEDGER_ONLY", timestamp: { gte: period.start, lt: period.end } },
      orderBy: [{ timestamp: "asc" }, { id: "asc" }],
      select: { id: true, timestamp: true, receivedAt: true, metricKey: true, amount: true, processingState: true,
        processingIntent: { select: { failureReason: true } },
        ratingRetry: { select: { reason: true } },
        ratingFailure: { select: { reason: true } },
        unratedEvent: { select: { reason: true } },
        ratedEvent: { select: { eventId: true, metricId: true, quantity: true, amount: true, currency: true, unitPriceMicros: true, priceVersionId: true, correctionId: true } } },
    });
    const sourceEvents = events.map((event) => ({ eventId: event.id, occurredAt: event.timestamp.toISOString(), receivedAt: event.receivedAt?.toISOString() ?? null, metric: event.metricKey, quantity: event.amount, processingState: event.processingState }));
    const ratedSources = events.flatMap((event) => {
      const rating = event.ratedEvent;
      return rating ? [{
        eventId: event.id, ratingId: rating.eventId, occurredAt: event.timestamp.toISOString(),
        metricId: rating.metricId, quantity: rating.quantity, amount: persistedRatedAmount(rating.amount),
        currency: rating.currency, unitPriceMicros: rating.unitPriceMicros.toString(),
        priceVersionId: rating.priceVersionId, correctionId: rating.correctionId,
        basis: rating.priceVersionId ? "PRICE_VERSION" : "PRICING_GAP_CORRECTION",
      }] : [];
    });
    const ratedSourceByEventId = new Map(ratedSources.map((source) => [source.eventId, source]));
    const eventOutcomes = events.map((event) => {
      // A completed ledger projection is not rating evidence. Persisted rating wins
      // even when a stale retry marker survives a worker interruption.
      const ratedSource = ratedSourceByEventId.get(event.id);
      const state = ratedSource ? "RATED" : event.processingState === "FAILED" ? "LEDGER_FAILED"
        : event.processingState === "PROCESSING" ? "LEDGER_PROCESSING"
        : event.processingState === "PENDING" ? "LEDGER_PENDING"
        : event.ratingFailure ? "RATING_FAILED" : event.unratedEvent ? "UNRATED"
        : event.ratingRetry ? "RATING_RETRY" : "RATING_PENDING";
      const reason = state === "LEDGER_FAILED" ? safeReason(event.processingIntent?.failureReason)
        : state === "RATING_FAILED" ? safeReason(event.ratingFailure?.reason)
        : state === "RATING_RETRY" ? safeReason(event.ratingRetry?.reason)
        : state === "UNRATED" ? safeReason(event.unratedEvent?.reason) : null;
      return { eventId: event.id, metric: event.metricKey, quantity: event.amount, state, reason,
        ...(ratedSource ? { amount: ratedSource.amount, currency: ratedSource.currency } : {}) };
    });
    const lateEventIds = new Set(events.filter((event) => event.receivedAt && event.receivedAt > period.end && event.receivedAt <= period.close).map((event) => event.id));
    const lateEvents = events.flatMap((event, index) => lateEventIds.has(event.id) ? [{
      ...eventOutcomes[index], occurredAt: event.timestamp.toISOString(), receivedAt: event.receivedAt!.toISOString(),
    }] : []);
    const lateBuckets = new Map<string, { metric: string; state: string; count: number; quantity: bigint }>();
    for (const event of lateEvents) {
      const key = JSON.stringify([event.metric, event.state]);
      const bucket = lateBuckets.get(key) ?? { metric: event.metric, state: event.state, count: 0, quantity: 0n };
      bucket.count++;
      bucket.quantity += BigInt(event.quantity);
      lateBuckets.set(key, bucket);
    }
    const lateRatedSources = ratedSources.filter((source) => lateEventIds.has(source.eventId));
    const lateArrivals = {
      events: lateEvents,
      byMetricAndState: [...lateBuckets.values()].sort((a, b) => compareText(a.metric, b.metric) || compareText(a.state, b.state))
        .map((bucket) => ({ ...bucket, quantity: bucket.quantity.toString() })),
      ratedContribution: { count: lateRatedSources.length,
        quantity: lateRatedSources.reduce((sum, source) => sum + BigInt(source.quantity), 0n).toString(),
        amount: sumPersistedRatedAmounts(lateRatedSources.map((source) => source.amount)),
        currency: lateRatedSources[0]?.currency ?? null },
    };
    const buckets = new Map<string, { metric: string; state: string; count: number; quantity: bigint }>();
    for (const outcome of eventOutcomes) {
      const key = JSON.stringify([outcome.metric, outcome.state]);
      const bucket = buckets.get(key) ?? { metric: outcome.metric, state: outcome.state, count: 0, quantity: 0n };
      bucket.count++;
      bucket.quantity += BigInt(outcome.quantity);
      buckets.set(key, bucket);
    }
    const byMetricAndState = [...buckets.values()].sort((a, b) => compareText(a.metric, b.metric) || compareText(a.state, b.state))
      .map((bucket) => ({ ...bucket, quantity: bucket.quantity.toString() }));
    const acceptedQuantity = events.reduce((sum, event) => sum + BigInt(event.amount), 0n);
    const ratedQuantity = ratedSources.reduce((sum, source) => sum + BigInt(source.quantity), 0n);
    const currencies = [...new Set(ratedSources.map((source) => source.currency))];
    if (currencies.length > 1) throw new Error("Mixed rating currencies in Customer draft");
    const ratedAmount = sumPersistedRatedAmounts(ratedSources.map((source) => source.amount));
    const reconciliation = { accepted: { count: events.length, quantity: acceptedQuantity.toString() },
      rated: { count: ratedSources.length, quantity: ratedQuantity.toString(), amount: ratedAmount, currency: currencies[0] ?? null },
      byMetricAndState, balanced: byMetricAndState.reduce((sum, bucket) => sum + bucket.count, 0) === events.length &&
        byMetricAndState.reduce((sum, bucket) => sum + BigInt(bucket.quantity), 0n) === acceptedQuantity };
    ratedSources.sort((a, b) => compareText(a.metricId, b.metricId) || compareText(a.basis, b.basis) ||
      compareText(a.occurredAt, b.occurredAt) || compareText(a.eventId, b.eventId) ||
      compareText(a.priceVersionId ?? a.correctionId ?? "", b.priceVersionId ?? b.correctionId ?? "") || compareText(a.currency, b.currency));
    const grouped = new Map<string, { metricId: string; currency: string; basis: string; priceVersionId: string | null; correctionId: string | null; unitPriceMicros: string; quantity: bigint; amounts: string[]; sourceEventIds: string[]; ratingIds: string[] }>();
    for (const source of ratedSources) {
      const key = JSON.stringify([source.metricId, source.currency, source.basis, source.priceVersionId, source.correctionId, source.unitPriceMicros]);
      let line = grouped.get(key);
      if (!line) {
        line = { metricId: source.metricId, currency: source.currency, basis: source.basis, priceVersionId: source.priceVersionId,
          correctionId: source.correctionId, unitPriceMicros: source.unitPriceMicros, quantity: 0n,
          amounts: [], sourceEventIds: [], ratingIds: [] };
        grouped.set(key, line);
      }
      line.quantity += BigInt(source.quantity);
      line.amounts.push(source.amount);
      line.sourceEventIds.push(source.eventId);
      line.ratingIds.push(source.ratingId);
    }
    const lines = [...grouped.values()].map(({ amounts, ...line }) => ({ ...line, quantity: line.quantity.toString(),
      amount: sumPersistedRatedAmounts(amounts) }));
    if (sumPersistedRatedAmounts(lines.map((line) => line.amount)) !== ratedAmount ||
        lines.reduce((sum, line) => sum + BigInt(line.quantity), 0n) !== ratedQuantity || !reconciliation.balanced) {
      throw new Error("Draft source reconciliation failed");
    }
    const state = calculatedAt <= period.close ? "OPEN" : "BLOCKED";
    if (!existing) {
      existing = await tx.billingRecord.create({ data: { ...key, periodEnd: period.end, closeAt: period.close }, include: { currentSnapshot: true } });
    }
    if (existing.currentSnapshot?.state === state && sameEvidence(existing.currentSnapshot.sourceEvents, sourceEvents) &&
      sameEvidence(existing.currentSnapshot.lines, lines) && sameEvidence(existing.currentSnapshot.ratedSources, ratedSources) &&
      sameEvidence(existing.currentSnapshot.eventOutcomes, eventOutcomes) && sameEvidence(existing.currentSnapshot.reconciliation, reconciliation) &&
      sameEvidence(existing.currentSnapshot.lateArrivals, lateArrivals)) return existing;
    const snapshot = await tx.billingRecordSnapshot.create({ data: { billingRecordId: existing.id, calculatedAt, state, sourceEvents: sourceEvents as Prisma.InputJsonValue,
      lines: lines as Prisma.InputJsonValue, ratedSources: ratedSources as Prisma.InputJsonValue,
      eventOutcomes: eventOutcomes as Prisma.InputJsonValue, reconciliation: reconciliation as Prisma.InputJsonValue,
      lateArrivals: lateArrivals as Prisma.InputJsonValue } });
    return tx.billingRecord.update({ where: { id: existing.id }, data: { currentSnapshotId: snapshot.id }, include: { currentSnapshot: true } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await calculate();
    } catch (error) {
      if (attempt === 2 || !(error instanceof Prisma.PrismaClientKnownRequestError) || !["P2002", "P2034"].includes(error.code)) throw error;
    }
  }
  throw new Error("Draft calculation retry exhausted");
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
