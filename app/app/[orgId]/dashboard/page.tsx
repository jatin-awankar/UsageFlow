import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

import PageHeader from "@/components/layout/PageHeader";
import { getUsageSummary } from "@/actions/analytics/getUsageSummary";
import { getCostBreakdown } from "@/actions/analytics/getCostBreakdown";
import { getActiveSubscription } from "@/lib/subscription/getActiveSubscription";
import { getAuditLogs } from "@/actions/audit/getAuditLogs";

import DashboardKPIs from "@/components/dashboard/DashboardKPIs";
import UsageTrendChart from "@/components/dashboard/UsageTrendChart";
import CostBreakdownCard from "@/components/dashboard/CostBreakdownCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import EmptyState from "@/components/ui/EmptyState";
import { LayoutDashboard } from "lucide-react";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await params;

  const subscription = await getActiveSubscription(orgId);

  if (!subscription) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="Overview of usage and billing activity."
        />
        <EmptyState
          title="No active subscription"
          description="Select a plan to start tracking usage and costs."
          action={"Get Subscription"}
          icon={<LayoutDashboard />}
          navigate={`/app/${orgId}/plans`}
        />
      </>
    );
  }

  const [usage, billing, auditLogs] = await Promise.all([
    getUsageSummary(user.id, orgId),
    getCostBreakdown(user.id, orgId, subscription.id),
    getAuditLogs({
      userId: user.id,
      orgId,
      pageSize: 5,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="High-level overview of usage, billing, and activity."
      />

      <p className="text-sm text-gray-500 mb-2">
        Current billing period: {subscription.periodStart.toDateString()} -{" "}
        {subscription.periodEnd
          ? subscription.periodEnd.toDateString()
          : "Current"}
      </p>

      <div className="space-y-8">
        <DashboardKPIs
          usage={usage}
          billing={billing}
          subscription={subscription}
        />

        <UsageTrendChart usage={usage} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CostBreakdownCard breakdown={billing.breakdown} />
          <RecentActivity logs={auditLogs.data} />
        </div>
      </div>
    </>
  );
}
