import { getCurrentUser } from "@/lib/auth/session";
import { getMetrics } from "@/actions/metrics/getMetrics";
import { redirect } from "next/navigation";
import { PaginationProps } from "@/types";
import Link from "next/link";

import CreateMetricForm from "@/components/forms/CreateMetricForm";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import MetricsEmptyState from "@/components/metrics/MetricsEmptyState";
import MetricsOverview from "@/components/metrics/MetricsOverview";
import MetricsList from "@/components/metrics/MetricsList";
import { ArrowRight } from "lucide-react";

const PAGE_SIZE = 5;

export default async function MetricsPage({
  params,
  searchParams,
}: PaginationProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await params;
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const rawPage = Number(resolvedSearchParams.page ?? 0);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 0;

  const metrics = await getMetrics(user.id, orgId, page, PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Metrics"
        description="Define and maintain the usage dimensions that power analytics and billing."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/${orgId}/analytics`}>Usage analytics</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/app/${orgId}/billing`}>
                Billing
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <CreateMetricForm userId={user.id} orgId={orgId} />
          </div>
        }
      />

      {metrics.length === 0 ? (
        <MetricsEmptyState orgId={orgId} />
      ) : (
        <section className="space-y-6">
          <MetricsOverview metrics={metrics} />
          <MetricsList
            orgId={orgId}
            metrics={metrics}
            page={page}
            pageSize={PAGE_SIZE}
          />
        </section>
      )}
    </>
  );
}
