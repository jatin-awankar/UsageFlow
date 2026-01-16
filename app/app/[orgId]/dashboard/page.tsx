// app/[orgId]/dashboard/page.tsx
import { getCostBreakdown } from "@/actions/analytics/getCostBreakdown";
import { getUsageSummary } from "@/actions/analytics/getUsageSummary";
import { Role } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/authz/requireRole";
import { getActiveSubscription } from "@/lib/subscription/getActiveSubscription";
import { redirect } from "next/navigation";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Await params if it's a Promise (Next.js 16+)
  const resolvedParams = await Promise.resolve(params);
  const orgId = resolvedParams.orgId;

  const usage = await getUsageSummary(user.id, orgId);

  if (!orgId) {
    redirect("/app");
  }

  const subscription = await getActiveSubscription(orgId);

  const billing = subscription
    ? await getCostBreakdown(user.id, orgId, subscription.id)
    : null;

  // 🔐 Ensure user belongs to this org
  const membership = await requireRole(user.id, orgId, [
    Role.OWNER,
    Role.ADMIN,
    Role.DEVELOPER,
    Role.VIEWER,
  ]);

  if (!membership || ("ok" in membership && !membership.ok)) {
    redirect("/app");
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Overview</h1>

      {!subscription ? (
        <p className="text-gray-500">
          This organization does not have an active subscription.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div className=" p-4 border rounded">
            <p className="text-sm text-gray-500">Metrics Tracked</p>
            <p className="text-xl font-semibold">{usage.length}</p>
          </div>

          <div className=" p-4 border rounded">
            <p className="text-sm text-gray-500">Usage Cost</p>
            <p className="text-xl font-semibold">₹{billing?.usageCost ?? 0}</p>
          </div>

          <div className=" p-4 border rounded">
            <p className="text-sm text-gray-500">Estimated Total</p>
            <p className="text-xl font-semibold">₹{billing?.total ?? 0}</p>
          </div>
        </div>
      )}
    </div>
  );
}
