import AddMetricToPlanForm from "@/components/forms/AddMetricToPlanForm";
import ActivatePlanButton from "@/components/forms/ActivatePlanButton";
import { BadgeCheck, CircleDollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat("en-IN");

type MetricOption = {
  id: string;
  name: string;
  key: string;
  unit: string;
};

type PlanMetric = {
  id: string;
  includedUnits: number;
  pricePerUnit: number;
  metric: {
    id: string;
    name: string;
    key: string;
    unit: string;
  };
};

export default function PlanCard({
  plan,
  userId,
  orgId,
  metrics,
  isActive,
  index,
}: {
  plan: {
    id: string;
    name: string;
    basePrice: number;
    planMetrics: PlanMetric[];
  };
  userId: string;
  orgId: string;
  metrics: MetricOption[];
  isActive: boolean;
  index: number;
}) {
  const attachedMetricIds = plan.planMetrics.map((pm) => pm.metric.id);
  const availableMetrics = metrics.filter((metric) => !attachedMetricIds.includes(metric.id));

  return (
    <article
      className={cn(
        "group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md animate-in fade-in slide-in-from-bottom-2",
        isActive ? "border-emerald-200/80 bg-emerald-50/40" : ""
      )}
      style={{
        animationDuration: "700ms",
        animationDelay: `${index * 70}ms`,
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {currencyFormatter.format(plan.basePrice)} / month
          </p>
        </div>

        {isActive ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <BadgeCheck className="size-3.5" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
            <CircleDollarSign className="size-3.5" />
            Inactive
          </span>
        )}
      </div>

      <div className="min-h-28">
        {plan.planMetrics.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-500">
            No metrics attached yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {plan.planMetrics.map((pm) => (
              <li key={pm.id} className="rounded-lg border border-slate-200/70 bg-slate-50/75 p-3">
                <p className="text-sm font-medium text-slate-800">
                  {pm.metric.name}
                  <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                    {pm.metric.key}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {numberFormatter.format(pm.includedUnits)} included {pm.metric.unit} - {" "}
                  {currencyFormatter.format(pm.pricePerUnit)} / {pm.metric.unit}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 space-y-3 border-t border-slate-200/80 pt-4">
        {!isActive ? (
          <ActivatePlanButton userId={userId} orgId={orgId} planId={plan.id} />
        ) : (
          <p className="text-xs font-medium text-emerald-700">
            This is the currently active subscription plan.
          </p>
        )}

        <AddMetricToPlanForm
          userId={userId}
          orgId={orgId}
          planId={plan.id}
          metrics={availableMetrics}
        />
      </div>
    </article>
  );
}

