import { getUsageSummary } from "@/actions/analytics/getUsageSummary";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { UsageTable } from "./usage-table";
import { BarChart3 } from "lucide-react";

export default async function UsagePage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await params;
  const usage = await getUsageSummary(user.id, orgId);

  return (
    <>
      <PageHeader
        title="Usage"
        description="View how metrics are being consumed in the current billing period."
      />

      {usage.length === 0 ? (
        <EmptyState
          title="No usage recorded yet"
          description="Usage data will appear once your application starts sending usage events."
          icon={<BarChart3 />}
        />
      ) : (
        <UsageTable usage={usage} />
      )}
    </>
  );
}
