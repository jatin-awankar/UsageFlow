const numberFormatter = new Intl.NumberFormat("en-IN");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function toLabel(metric: string) {
  return metric
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

type UsageRow = {
  metric: string;
  total: number;
  periodStart: Date;
  periodEnd: Date | null;
};

export default function UsageMetricsTable({ usage }: { usage: UsageRow[] }) {
  const rows = [...usage].sort((a, b) => b.total - a.total);
  const totalUsage = rows.reduce((sum, row) => sum + row.total, 0);
  const peak = rows[0]?.total ?? 1;

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:280ms]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Metric usage breakdown
          </h3>
          <p className="text-sm text-slate-500">
            Ranked by volume with proportional bars
          </p>
        </div>
        <p className="text-xs text-slate-500">
          {numberFormatter.format(totalUsage)} total units
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => {
          const share = totalUsage > 0 ? (row.total / totalUsage) * 100 : 0;
          const width = Math.max(8, Math.round((row.total / peak) * 100));

          return (
            <div
              key={row.metric}
              className="rounded-xl border border-slate-200/70 bg-slate-50/75 p-3 animate-in fade-in slide-in-from-left-2"
              style={{
                animationDuration: "650ms",
                animationDelay: `${index * 70}ms`,
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">
                  <span className="mr-2 rounded-md bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    #{index + 1}
                  </span>
                  {toLabel(row.metric)}
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {numberFormatter.format(row.total)} units
                </p>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                  style={{ width: `${width}%` }}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>{share.toFixed(1)}% of total</span>
                <span>
                  {dateFormatter.format(row.periodStart)} -{" "}
                  {row.periodEnd ? dateFormatter.format(row.periodEnd) : "Current"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
