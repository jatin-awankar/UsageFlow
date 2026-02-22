import { Activity, IndianRupee, Layers3, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  usage: { metric: string; total: number }[];
  billing: {
    total: number;
    usageCost: number;
    basePrice: number;
  };
  subscription: {
    plan: { name: string };
  };
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat("en-IN");

export default function DashboardKPIs({ usage, billing, subscription }: Props) {
  const totalUsage = usage.reduce((sum, u) => sum + u.total, 0);
  const cards = [
    {
      title: "Plan",
      value: subscription.plan.name,
      helper: `${usage.length} billable metrics`,
      icon: Layers3,
      gradient: "from-sky-500 to-cyan-400",
    },
    {
      title: "Total Usage",
      value: numberFormatter.format(totalUsage),
      helper: "Across current cycle",
      icon: Activity,
      gradient: "from-indigo-500 to-sky-500",
    },
    {
      title: "Usage Cost",
      value: currencyFormatter.format(billing.usageCost),
      helper: "Overage charges only",
      icon: IndianRupee,
      gradient: "from-emerald-500 to-cyan-500",
    },
    {
      title: "Estimated Total",
      value: currencyFormatter.format(billing.total),
      helper: "Base plan + usage",
      icon: Wallet,
      gradient: "from-slate-900 to-slate-700",
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;

        return (
          <article
            key={card.title}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-md animate-in fade-in slide-in-from-bottom-2",
              card.highlight ? "border-slate-900/15 bg-slate-50/90" : ""
            )}
            style={{
              animationDuration: "700ms",
              animationDelay: `${index * 90}ms`,
            }}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
                card.gradient
              )}
            />
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {card.title}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  {card.value}
                </p>
              </div>
              <span className="inline-flex rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors duration-300 group-hover:bg-slate-900 group-hover:text-white">
                <Icon className="size-4" />
              </span>
            </div>
            <p className="text-xs text-slate-500">{card.helper}</p>
          </article>
        );
      })}
    </div>
  );
}
