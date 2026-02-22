import { Banknote, IndianRupee, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function BillingSummaryCards({
  basePrice,
  usageCost,
  total,
}: {
  basePrice: number;
  usageCost: number;
  total: number;
}) {
  const cards = [
    {
      title: "Base Price",
      value: currencyFormatter.format(basePrice),
      description: "Fixed recurring plan charge",
      icon: Banknote,
      gradient: "from-sky-500 to-cyan-400",
    },
    {
      title: "Usage Cost",
      value: currencyFormatter.format(usageCost),
      description: "Charges beyond included limits",
      icon: IndianRupee,
      gradient: "from-indigo-500 to-sky-500",
    },
    {
      title: "Estimated Total",
      value: currencyFormatter.format(total),
      description: "Projected invoice before adjustments",
      icon: Wallet,
      gradient: "from-slate-900 to-slate-700",
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            <p className="text-xs text-slate-500">{card.description}</p>
          </article>
        );
      })}
    </div>
  );
}
