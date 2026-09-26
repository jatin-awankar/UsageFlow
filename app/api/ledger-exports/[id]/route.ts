import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/authz/getMembership";
import { pageSize } from "@/lib/ledgerExport";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = request.nextUrl.searchParams.get("orgId");
  if (!orgId || (await getMembership(user.id, orgId))?.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const snapshot = await prisma.ledgerExport.findFirst({ where: { id: (await context.params).id, orgId } });
  if (!snapshot) return NextResponse.json({ error: "Export not found" }, { status: 404 });
  const cursor = request.nextUrl.searchParams.get("cursor");
  let after = -1;
  if (cursor !== null) {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
      if (parsed.exportId !== snapshot.id || !Number.isSafeInteger(parsed.position) || parsed.position < 0) throw new Error("Invalid cursor");
      after = parsed.position;
    } catch { return NextResponse.json({ error: "Invalid cursor" }, { status: 400 }); }
  }
  const rows = await prisma.ledgerExportRow.findMany({
    where: { exportId: snapshot.id, position: { gt: after } }, orderBy: { position: "asc" }, take: pageSize + 1,
    select: { position: true, eventId: true, keyReference: true, occurredAt: true, receivedAt: true, externalCustomerId: true, metric: true, quantity: true, processingState: true, failureReason: true },
  });
  const page = rows.slice(0, pageSize);
  const nextCursor = rows.length > pageSize ? Buffer.from(JSON.stringify({ exportId: snapshot.id, position: page[page.length - 1].position })).toString("base64url") : null;
  return NextResponse.json({ id: snapshot.id, periodStart: snapshot.periodStart, periodEnd: snapshot.periodEnd, createdAt: snapshot.createdAt, totals: snapshot.totals, rows: page.map((row) => ({ eventId: row.eventId, keyReference: row.keyReference, occurredAt: row.occurredAt, receivedAt: row.receivedAt, externalCustomerId: row.externalCustomerId, metric: row.metric, quantity: row.quantity, processingState: row.processingState, failureReason: row.failureReason })), nextCursor });
}
