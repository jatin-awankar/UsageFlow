const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat("en-IN");

type BreakdownItem = {
  metric: string;
  cost: number;
  used?: number;
  included?: number;
  overage?: number;
};

export default function CostBreakdownCard({
  breakdown,
}: {
  breakdown: BreakdownItem[];
}) {
  const rows = [...breakdown].sort((a, b) => b.cost - a.cost);
  const maxCost = Math.max(...rows.map((row) => row.cost), 1);
  const total = rows.reduce((sum, row) => sum + row.cost, 0);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-md shadow-slate-900/5 animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:220ms]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Cost breakdown
          </h3>
          <p className="text-sm text-slate-500">
            Where overage spend is concentrated
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
          {currencyFormatter.format(total)} total
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 text-center text-sm text-slate-500">
          No billable usage yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((item, index) => {
            const width = Math.max(8, Math.round((item.cost / maxCost) * 100));
            const rowKey = `${item.metric}-${item.used ?? 0}-${item.cost}-${index}`;

            return (
              <li
                key={rowKey}
                className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-3 animate-in fade-in slide-in-from-left-2"
                style={{
                  animationDuration: "650ms",
                  animationDelay: `${index * 80}ms`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">
                    {item.metric}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {currencyFormatter.format(item.cost)}
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-sky-500 to-cyan-400"
                    style={{ width: `${width}%` }}
                  />
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {numberFormatter.format(item.used ?? 0)} used
                  {typeof item.included === "number"
                    ? ` / ${numberFormatter.format(item.included)} included`
                    : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
