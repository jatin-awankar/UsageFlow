import { getUsageSummary } from "@/actions/analytics/getUsageSummary";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { BarChart3 } from "lucide-react";

export default async function UsageAnalyticsPage({
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
        title="Usage Analytics"
        description="Track how your metrics are being consumed in the current billing period."
      />

      {usage.length === 0 ? (
        <EmptyState
          title="No usage data yet"
          description="Usage analytics will appear once your application starts sending usage events."
          icon={<BarChart3 />}
        />
      ) : (
        <section className="space-y-4">
          {/* Context note */}
          <p className="text-sm text-gray-500">
            This table shows aggregated usage for the current billing period.
            Usage is updated automatically as events are ingested.
          </p>

          <div className="overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Metric
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Total usage
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Period
                  </th>
                </tr>
              </thead>

              <tbody>
                {usage.map((row) => (
                  <tr key={row.metric} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {row.metric}
                    </td>

                    <td className="px-4 py-2 text-gray-700">
                      {row.total.toLocaleString()}
                    </td>

                    <td className="px-4 py-2 text-gray-700">
                      {new Date(row.periodStart).toLocaleDateString()}
                      {row.periodEnd && (
                        <span className="text-gray-400">
                          {" "}
                          - {new Date(row.periodEnd).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
