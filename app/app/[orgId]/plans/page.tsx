import { getCurrentUser } from "@/lib/auth/session";
import { getPlans } from "@/actions/plans/getPlans";
import { redirect } from "next/navigation";
import { getMetrics } from "@/actions/metrics/getMetrics";
import { getActiveSubscription } from "@/lib/subscription/getActiveSubscription";

import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import CreatePlanForm from "@/components/forms/CreatePlanForm";
import AddMetricToPlanForm from "@/components/forms/AddMetricToPlanForm";
import ActivatePlanButton from "@/components/forms/ActivatePlanButton";
import { Layers } from "lucide-react";

export default async function PlansPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await Promise.resolve(params);

  const metrics = await getMetrics(user.id, orgId);
  const plans = await getPlans(user.id, orgId);
  const activeSub = await getActiveSubscription(orgId);

  return (
    <>
      <PageHeader
        title="Plans"
        description="Define pricing plans and attach billable metrics."
        actions={<CreatePlanForm userId={user.id} orgId={orgId} />}
      />

      {plans.length === 0 ? (
        <EmptyState
          title="No plans created"
          description="Create a plan to define how usage is billed."
          icon={<Layers />}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isActive = activeSub?.planId === plan.id;

            return (
              <div
                key={plan.id}
                className="rounded-lg border bg-white p-5 flex flex-col"
              >
                {/* Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    ₹{plan.basePrice} / month
                  </p>
                </div>

                {/* Metrics */}
                <div className="flex-1">
                  {plan.planMetrics.length === 0 ? (
                    <p className="text-sm text-gray-400">No metrics attached</p>
                  ) : (
                    <ul className="space-y-1 text-sm text-gray-700">
                      {plan.planMetrics.map((pm) => (
                        <li key={pm.id}>
                          <span className="font-medium">{pm.metric.name}</span>:{" "}
                          {pm.includedUnits} included, ₹{pm.pricePerUnit}/unit
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 space-y-3">
                  {isActive ? (
                    <span className="inline-flex w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      Active plan
                    </span>
                  ) : (
                    <ActivatePlanButton
                      userId={user.id}
                      orgId={orgId}
                      planId={plan.id}
                    />
                  )}

                  <AddMetricToPlanForm
                    userId={user.id}
                    orgId={orgId}
                    planId={plan.id}
                    metrics={metrics}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
