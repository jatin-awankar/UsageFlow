import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/authz/getMembership";
import { createLedgerExport, utcPeriod } from "@/lib/ledgerExport";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid payload" }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { orgId, period } = body as Record<string, unknown>;
  if (typeof orgId !== "string" || !utcPeriod(period)) return NextResponse.json({ error: "Invalid Organization or UTC period" }, { status: 400 });
  const membership = await getMembership(user.id, orgId);
  if (membership?.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const snapshot = await createLedgerExport(orgId, utcPeriod(period)!);
  return NextResponse.json(snapshot, { status: 201 });
}
