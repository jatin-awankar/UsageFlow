import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/authz/getMembership";

export async function GET(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await context.params;
  if ((await getMembership(user.id, orgId))?.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const cursor = request.nextUrl.searchParams.get("cursor");
  if (cursor && !(await prisma.usageEvent.findFirst({ where: { id: cursor, orgId, billingTreatment: "LEDGER_ONLY" }, select: { id: true } }))) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }
  const events = await prisma.usageEvent.findMany({
    where: { orgId, billingTreatment: "LEDGER_ONLY" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 101,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true, timestamp: true, receivedAt: true, metricKey: true, amount: true,
      processingState: true, billedCustomer: { select: { externalId: true } },
      processingIntent: { select: { failureReason: true } },
      ratedEvent: { select: { amount: true, currency: true, unitPriceMicros: true, priceVersionId: true, correctionId: true, ratedAt: true } },
      unratedEvent: { select: { reason: true, recordedAt: true } },
      ratingFailure: { select: { reason: true } },
      ratingRetry: { select: { reason: true, attempts: true, retryAfter: true } },
    },
  });
  const page = events.slice(0, 100);
  return NextResponse.json({
    rows: page.map((event) => ({
      eventId: event.id, occurredAt: event.timestamp, receivedAt: event.receivedAt,
      externalCustomerId: event.billedCustomer?.externalId ?? null,
      metric: event.metricKey, quantity: event.amount,
      processingState: event.processingState,
      processingFailureReason: event.processingIntent?.failureReason ?? null,
      ratingState: event.ratedEvent ? "RATED" : event.ratingFailure ? "FAILED" : event.unratedEvent ? "UNRATED" : event.ratingRetry ? "RETRYABLE_FAILURE" : "PENDING",
      ratingReason: event.ratedEvent ? null : event.ratingFailure?.reason ?? event.unratedEvent?.reason ?? event.ratingRetry?.reason ?? null,
      amount: event.ratedEvent?.amount.toFixed(3) ?? null,
      currency: event.ratedEvent?.currency ?? null,
      unitPriceMicros: event.ratedEvent?.unitPriceMicros.toString() ?? null,
      priceVersionId: event.ratedEvent?.priceVersionId ?? null,
      correctionId: event.ratedEvent?.correctionId ?? null,
      ratedAt: event.ratedEvent?.ratedAt ?? null,
    })),
    nextCursor: events.length > 100 ? page[page.length - 1].id : null,
  });
}
