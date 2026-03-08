import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";

import PageHeader from "@/components/layout/PageHeader";
import { getUsageSummary } from "@/actions/analytics/getUsageSummary";
import { getCostBreakdown } from "@/actions/analytics/getCostBreakdown";
import { getActiveSubscription } from "@/lib/subscription/getActiveSubscription";
import { getAuditLogs } from "@/actions/audit/getAuditLogs";
import { Button } from "@/components/ui/button";

import DashboardKPIs from "@/components/dashboard/DashboardKPIs";
import UsageTrendChart from "@/components/dashboard/UsageTrendChart";
import CostBreakdownCard from "@/components/dashboard/CostBreakdownCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import {
  ArrowRight,
  CalendarRange,
  Layers3,
  LayoutDashboard,
  Wallet,
} from "lucide-react";

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
        <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-white to-slate-50 p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-700">
          <div className="pointer-events-none absolute -bottom-12 -right-10 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl" />
          <div className="relative">
            <span className="inline-flex rounded-lg bg-slate-100 p-2 text-slate-600">
              <LayoutDashboard className="size-5" />
            </span>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">
              No active subscription
            </h2>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Activate a plan to start tracking usage trends, spend projections,
              and activity history in this dashboard.
            </p>
            <Button asChild className="mt-4">
              <Link href={`/app/${orgId}/plans`}>Get subscription</Link>
            </Button>
          </div>
        </section>
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

  const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  const numberFormatter = new Intl.NumberFormat("en-IN");
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const totalUsage = usage.reduce((sum, item) => sum + item.total, 0);
  const topMetric = [...usage].sort((a, b) => b.total - a.total)[0] ?? null;
  const cycleStart = dateFormatter.format(subscription.periodStart);
  const cycleEnd = subscription.periodEnd
    ? dateFormatter.format(subscription.periodEnd)
    : "Current";

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Operational snapshot of usage, spend, and team actions."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/${orgId}/analytics`}>Usage analytics</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/app/${orgId}/billing`}>
                Open billing
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <section className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-slate-900 via-slate-800 to-sky-900 p-6 text-white shadow-lg shadow-slate-900/15 animate-in fade-in slide-in-from-top-2 duration-700">
        <div className="pointer-events-none absolute -top-20 right-0 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-sky-300/15 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[1.3fr_1fr] xl:items-end">
          <div>
            <p className="mb-2 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100">
              Live billing cycle
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {cycleStart} to {cycleEnd}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-200">
              Watch spend velocity, usage concentration, and team activity
              before this billing cycle closes.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                asChild
                size="sm"
                className="bg-white text-slate-900 hover:bg-slate-100"
              >
                <Link href={`/app/${orgId}/billing/invoices`}>
                  View invoices
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-white/35 bg-transparent text-white hover:bg-white/10"
              >
                <Link href={`/app/${orgId}/plans`}>Manage plans</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SnapshotTile
              title="Tracked metrics"
              value={numberFormatter.format(usage.length)}
              icon={<Layers3 className="size-4" />}
            />
            <SnapshotTile
              title="Total usage"
              value={numberFormatter.format(totalUsage)}
              icon={<CalendarRange className="size-4" />}
            />
            <SnapshotTile
              title="Projected spend"
              value={currencyFormatter.format(billing.total)}
              icon={<Wallet className="size-4" />}
              helper={
                topMetric
                  ? `Top metric: ${topMetric.metric}`
                  : "Top metric: N/A"
              }
            />
          </div>
        </div>
      </section>

      <div className="space-y-6">
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

function SnapshotTile({
  title,
  value,
  icon,
  helper,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 p-3 shadow-sm backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5">
      <div className="mb-2 inline-flex rounded-md bg-white/15 p-2 text-white">
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-200">
        {title}
      </p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-300">{helper}</p> : null}
    </div>
  );
}
