import { getCurrentUser } from "@/lib/auth/session";
import { getPlans } from "@/actions/plans/getPlans";
import CreatePlanForm from "@/components/forms/CreatePlanForm";
import { redirect } from "next/navigation";
import { getMetrics } from "@/actions/metrics/getMetrics";
import AddMetricToPlanForm from "@/components/forms/AddMetricToPlanForm";


export default async function PlansPage({
  params,
}: {
  params: { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await params;

  const metrics = await getMetrics(user.id, params.orgId);
  const plans = await getPlans(user.id, orgId);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Plans</h1>

      <CreatePlanForm userId={user.id} orgId={orgId} />

      {plans.length === 0 ? (
        <div className="border rounded p-6 text-gray-600">
          <p className="font-medium">No plans yet</p>
          <p className="text-sm mt-1">
            Create a plan to see...
          </p>
        </div>
      ) : (
        <>
          <h2 className="pt-4 text-xl font-semibold">Ongoing plans</h2>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="border rounded p-4 space-y-2"
            >
              <h2 className="font-semibold">
                {plan.name} — ₹{plan.basePrice}/month
              </h2>

              <ul className="text-sm text-gray-600">
                {plan.planMetrics.map((pm) => (
                  <li key={pm.id}>
                    {pm.metric.name}: {pm.includedUnits} included, ₹
                    {pm.pricePerUnit}/unit
                  </li>
                ))}
              </ul>
              <AddMetricToPlanForm
                userId={user.id}
                orgId={orgId}
                planId={plan.id}
                metrics={metrics}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
