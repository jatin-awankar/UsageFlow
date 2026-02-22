import { Info } from "lucide-react";

const numberFormatter = new Intl.NumberFormat("en-IN");
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

type BreakdownRow = {
  metric: string;
  used: number;
  included: number;
  overage: number;
  pricePerUnit: number;
  cost: number;
};

export default function BillingBreakdown({ rows }: { rows: BreakdownRow[] }) {
  const sortedRows = [...rows].sort((a, b) => b.cost - a.cost);
  const maxCost = Math.max(...sortedRows.map((row) => row.cost), 1);
  const totalOverageCost = sortedRows.reduce((sum, row) => sum + row.cost, 0);

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:200ms]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Cost breakdown by metric
          </h3>
          <p className="text-sm text-slate-500">
            Ranked by overage impact in this cycle
          </p>
        </div>
        <p className="text-xs text-slate-500">
          {currencyFormatter.format(totalOverageCost)} overage total
        </p>
      </div>

      {sortedRows.length === 0 ? (
        <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 text-center text-sm text-slate-500">
          No usage recorded for this billing period.
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {sortedRows.map((row, index) => {
              const width = Math.max(8, Math.round((row.cost / maxCost) * 100));

              return (
                <div
                  key={`${row.metric}-${row.used}`}
                  className="rounded-xl border border-slate-200/70 bg-slate-50/75 p-3 animate-in fade-in slide-in-from-left-2"
                  style={{
                    animationDuration: "650ms",
                    animationDelay: `${index * 70}ms`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">{row.metric}</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {currencyFormatter.format(row.cost)}
                    </p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <span>Used: {numberFormatter.format(row.used)}</span>
                    <span>Included: {numberFormatter.format(row.included)}</span>
                    <span>Overage: {numberFormatter.format(row.overage)}</span>
                    <span>Rate: {currencyFormatter.format(row.pricePerUnit)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Metric
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Used
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Included
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Overage
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Price / unit
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => (
                  <tr
                    key={`${row.metric}-${row.used}`}
                    className="border-b border-slate-200/80 last:border-0 animate-in fade-in"
                    style={{
                      animationDuration: "650ms",
                      animationDelay: `${index * 55}ms`,
                    }}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.metric}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {numberFormatter.format(row.used)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {numberFormatter.format(row.included)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {numberFormatter.format(row.overage)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {currencyFormatter.format(row.pricePerUnit)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {currencyFormatter.format(row.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="mt-4 rounded-lg border border-slate-200/70 bg-slate-50/60 p-3 text-xs text-slate-600">
        <p className="flex items-center gap-2 font-medium text-slate-700">
          <Info className="size-3.5" />
          Billing notes
        </p>
        <p className="mt-1">Overage is charged only after included units are exceeded.</p>
        <p className="mt-1">Final invoices may include adjustments or discounts.</p>
      </div>
    </article>
  );
}
