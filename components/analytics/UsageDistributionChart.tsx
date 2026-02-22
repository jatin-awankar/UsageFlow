"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const numberFormatter = new Intl.NumberFormat("en-IN");

function toLabel(metric: string) {
  return metric
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function UsageTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: { metric: string; total: number; share: number } }[];
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
      <p className="text-xs font-medium text-slate-500">
        {toLabel(point.metric)}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">
        {numberFormatter.format(point.total)} units
      </p>
      <p className="text-xs text-slate-500">
        {point.share.toFixed(1)}% of total
      </p>
    </div>
  );
}

export default function UsageDistributionChart({
  usage,
}: {
  usage: { metric: string; total: number }[];
}) {
  const total = usage.reduce((sum, row) => sum + row.total, 0);
  const data = [...usage]
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((row) => ({
      metric: row.metric,
      label: toLabel(row.metric),
      total: row.total,
      share: total > 0 ? (row.total / total) * 100 : 0,
    }));

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:140ms]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Metric distribution
          </h3>
          <p className="text-sm text-slate-500">
            Top usage contributors in the current cycle
          </p>
        </div>
        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
          Top {data.length}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-sm text-slate-500">
          No usage yet for this billing cycle.
        </div>
      ) : (
        <div className="h-72 rounded-xl border border-slate-100 bg-linear-to-b from-sky-50/35 to-white p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 8, right: 12, left: 20, bottom: 8 }}
            >
              <CartesianGrid
                horizontal={false}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickFormatter={(value) => numberFormatter.format(value)}
              />
              <YAxis
                dataKey="label"
                type="category"
                width={120}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#334155", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "#e0f2fe66" }}
                content={<UsageTooltip />}
              />
              <Bar
                dataKey="total"
                fill="#0284c7"
                radius={[0, 8, 8, 0]}
                animationDuration={850}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}
