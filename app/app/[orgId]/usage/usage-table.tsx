"use client";

type UsageRow = {
  metric: string;
  total: number;
  periodStart: Date;
  periodEnd?: Date;
};

export function UsageTable({ usage }: { usage: UsageRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-600">
              Metric
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">
              Total usage
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">
              Period
            </th>
          </tr>
        </thead>

        <tbody>
          {usage.map((row) => (
            <tr key={row.metric} className="border-b last:border-0">
              <td className="px-4 py-2 font-medium text-gray-900">
                {row.metric}
              </td>

              <td className="px-4 py-2 text-gray-700">
                {row.total.toLocaleString()}
              </td>

              <td className="px-4 py-2 text-gray-700">
                {new Date(row.periodStart).toLocaleDateString()}
                {row.periodEnd && (
                  <span className="text-gray-400">
                    {" "}
                    – {new Date(row.periodEnd).toLocaleDateString()}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
