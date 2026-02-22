import { getUsageSummary } from "@/actions/analytics/getUsageSummary";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import AnalyticsHero from "@/components/analytics/AnalyticsHero";
import UsageDistributionChart from "@/components/analytics/UsageDistributionChart";
import UsageMetricsTable from "@/components/analytics/UsageMetricsTable";
import AnalyticsEmptyState from "@/components/analytics/AnalyticsEmptyState";
import { Activity } from "lucide-react";

export default async function UsageAnalyticsPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await params;

  const usage = await getUsageSummary(user.id, orgId);
  const totalUsage = usage.reduce((sum, row) => sum + row.total, 0);

  const sortedByUsage = [...usage].sort((a, b) => b.total - a.total);
  const peakMetric = sortedByUsage[0]
    ? {
        name: sortedByUsage[0].metric,
        value: sortedByUsage[0].total,
      }
    : null;

  const periodStart =
    usage.length > 0
      ? usage.reduce(
          (earliest, row) =>
            row.periodStart < earliest ? row.periodStart : earliest,
          usage[0].periodStart,
        )
      : null;

  const periodEnd =
    usage.length > 0
      ? usage.reduce<Date | null>((latest, row) => {
          if (!row.periodEnd) return latest;
          if (!latest) return row.periodEnd;
          return row.periodEnd > latest ? row.periodEnd : latest;
        }, null)
      : null;

  return (
    <>
      <PageHeader
        title="Usage Analytics"
        description="Explore where usage is concentrated and how fast each metric is growing in this cycle."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/${orgId}/metrics`}>Manage metrics</Link>
          </Button>
        }
      />

      {usage.length === 0 ? (
        <AnalyticsEmptyState orgId={orgId} />
      ) : (
        <section className="space-y-6">
          <AnalyticsHero
            totalUsage={totalUsage}
            metricCount={usage.length}
            peakMetric={peakMetric}
            periodStart={periodStart}
            periodEnd={periodEnd}
          />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
            <UsageDistributionChart usage={usage} />

            <article className="rounded-2xl border border-slate-200/80 bg-linear-to-br from-white via-cyan-50/35 to-slate-50 p-5 shadow-sm animate-in fade-in slide-in-from-right-2 duration-700 [animation-delay:220ms]">
              <h3 className="text-base font-semibold text-slate-900">
                Consumption notes
              </h3>
              <ul className="mt-3 space-y-3 text-sm text-slate-600">
                <li className="rounded-lg border border-slate-200/70 bg-white/80 p-3">
                  <p className="flex items-center gap-2 font-medium text-slate-800">
                    <Activity className="size-4 text-sky-600" />
                    Usage is aggregated continuously
                  </p>
                  <p className="mt-1 text-slate-600">
                    Incoming events update totals in near real-time for this
                    billing cycle.
                  </p>
                </li>
                <li className="rounded-lg border border-slate-200/70 bg-white/80 p-3">
                  <p className="font-medium text-slate-800">
                    Focus on high-share metrics
                  </p>
                  <p className="mt-1 text-slate-600">
                    Large concentration in one metric can create faster overage
                    risk and less predictable invoices.
                  </p>
                </li>
                <li className="rounded-lg border border-slate-200/70 bg-white/80 p-3">
                  <p className="font-medium text-slate-800">
                    Keep metric definitions clean
                  </p>
                  <p className="mt-1 text-slate-600">
                    Naming consistency improves trend readability and helps your
                    team debug cost spikes faster.
                  </p>
                </li>
              </ul>
            </article>
          </div>

          <UsageMetricsTable usage={usage} />
        </section>
      )}
    </>
  );
}
