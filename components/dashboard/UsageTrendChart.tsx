"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function UsageTrendChart({
  usage,
}: {
  usage: { metric: string; total: number }[];
}) {
  // For now, fake daily grouping (later you can use real daily data)
  const data = usage.map((u) => ({
    name: u.metric,
    value: u.total,
  }));

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-2 text-sm font-medium text-gray-700">Usage overview</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#111827"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
