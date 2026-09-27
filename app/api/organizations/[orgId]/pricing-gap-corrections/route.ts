import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/authz/getMembership";
import { approvePricingGap, CorrectionRejected } from "@/lib/pricing-gap-correction";

export async function POST(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await context.params;
  if ((await getMembership(user.id, orgId))?.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  try {
    const result = await approvePricingGap({
      orgId, actorId: user.id,
      metricId: String(body.metricId ?? ""), customerId: String(body.customerId ?? ""),
      start: String(body.start ?? ""), end: String(body.end ?? ""), reviewedAt: String(body.reviewedAt ?? ""),
      eligibleEventIds: body.eligibleEventIds as string[], unitPrice: String(body.unitPrice ?? ""),
      currency: String(body.currency ?? ""), reason: String(body.reason ?? ""), evidence: String(body.evidence ?? ""),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof CorrectionRejected) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
