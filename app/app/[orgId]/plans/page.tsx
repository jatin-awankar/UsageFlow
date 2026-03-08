import { getCurrentUser } from "@/lib/auth/session";
import { getPlans } from "@/actions/plans/getPlans";
import { redirect } from "next/navigation";
import { getMetrics } from "@/actions/metrics/getMetrics";
import { getActiveSubscription } from "@/lib/subscription/getActiveSubscription";
import Link from "next/link";

import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import CreatePlanForm from "@/components/forms/CreatePlanForm";
import PlansEmptyState from "@/components/plans/PlansEmptyState";
import PlansOverview from "@/components/plans/PlansOverview";
import PlanCard from "@/components/plans/PlanCard";
import { ArrowRight } from "lucide-react";

export default async function PlansPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await Promise.resolve(params);

  const [metrics, plans, activeSub] = await Promise.all([
    getMetrics(user.id, orgId, 0, 200),
    getPlans(user.id, orgId),
    getActiveSubscription(orgId),
  ]);

  const activePlanName =
    plans.find((plan) => plan.id === activeSub?.planId)?.name ?? null;

  return (
    <>
      <PageHeader
        title="Plans"
        description="Define monthly pricing plans and map billable metrics with included usage limits."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/${orgId}/metrics`}>Manage metrics</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/app/${orgId}/billing`}>
                Billing
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <CreatePlanForm userId={user.id} orgId={orgId} />
          </div>
        }
      />

      {plans.length === 0 ? (
        <PlansEmptyState orgId={orgId} />
      ) : (
        <section className="space-y-6">
          <PlansOverview plans={plans} activePlanName={activePlanName} />

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                userId={user.id}
                orgId={orgId}
                metrics={metrics}
                isActive={activeSub?.planId === plan.id}
                index={index}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
