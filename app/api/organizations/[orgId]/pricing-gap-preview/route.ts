import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/authz/getMembership";
import { previewPricingGap } from "@/lib/pricing-gap-preview";

export async function GET(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await context.params;
  if ((await getMembership(user.id, orgId))?.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const params = request.nextUrl.searchParams;
  const result = await previewPricingGap(orgId, params.get("metricId") ?? "", params.get("customerId") ?? "", params.get("start") ?? "", params.get("end") ?? "");
  return NextResponse.json(result, { status: "error" in result ? 400 : 200 });
}
