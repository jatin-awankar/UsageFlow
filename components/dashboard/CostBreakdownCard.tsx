export default function CostBreakdownCard({
  breakdown,
}: {
  breakdown: {
    metric: string;
    cost: number;
  }[];
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-700">
        Metric breakdown
      </h3>

      {breakdown.length === 0 ? (
        <p className="text-sm text-gray-500">No billable usage yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {breakdown.map((b) => (
            <li key={b.metric} className="flex items-center justify-between">
              <span className="text-gray-700">{b.metric}</span>
              <span className="font-medium text-gray-900">₹{b.cost}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
