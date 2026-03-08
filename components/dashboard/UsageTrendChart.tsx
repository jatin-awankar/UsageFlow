"use client";

import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
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

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">
        {numberFormatter.format(Number(payload[0]?.value ?? 0))} units
      </p>
    </div>
  );
}

export default function UsageTrendChart({
  usage,
}: {
  usage: { metric: string; total: number }[];
}) {
  const data = usage.map((entry) => ({
    name: toLabel(entry.metric),
    value: entry.total,
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-md shadow-slate-900/5 animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:140ms]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Usage trend</h3>
          <p className="text-sm text-slate-500">
            {numberFormatter.format(total)} total units across {data.length} metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-sky-200/80 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
            Real-time
          </span>
          <span className="rounded-full border border-emerald-300/60 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            Live aggregation
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-sm text-slate-500">
          No usage yet for this billing cycle.
        </div>
      ) : (
        <div className="h-72 rounded-xl border border-slate-200/70 bg-gradient-to-b from-sky-50/65 via-cyan-50/30 to-white p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="usage-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity={0.26} />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                vertical={false}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                minTickGap={18}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickFormatter={(value) => numberFormatter.format(value)}
              />
              <Tooltip
                cursor={{ stroke: "#7dd3fc", strokeDasharray: "4 4" }}
                content={<TrendTooltip />}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="none"
                fill="url(#usage-area)"
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0369a1"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, fill: "#fff" }}
                isAnimationActive
                animationDuration={850}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
