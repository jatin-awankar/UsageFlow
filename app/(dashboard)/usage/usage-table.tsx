// app/(dashboard)/usage/usage-table.tsx
"use client";

type UsageRow = {
  metric: string;
  total: number;
  periodStart: Date;
};

export function UsageTable({ usage }: { usage: UsageRow[] }) {
  return (
    <table className="w-full border">
      <thead>
        <tr className="border-b">
          <th className="text-left p-2">Metric</th>
          <th className="text-left p-2">Total Usage</th>
          <th className="text-left p-2">Period</th>
        </tr>
      </thead>
      <tbody>
        {usage.map((row) => (
          <tr key={row.metric} className="border-b">
            <td className="p-2">{row.metric}</td>
            <td className="p-2">{row.total}</td>
            <td className="p-2">
              {new Date(row.periodStart).toDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
