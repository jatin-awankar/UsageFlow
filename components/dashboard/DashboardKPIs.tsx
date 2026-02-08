type Props = {
  usage: { metric: string; total: number }[];
  billing: {
    total: number;
    usageCost: number;
    basePrice: number;
  };
  subscription: {
    plan: { name: string };
  };
};

export default function DashboardKPIs({ usage, billing, subscription }: Props) {
  const totalUsage = usage.reduce((sum, u) => sum + u.total, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <KPI title="Plan" value={subscription.plan.name} />
      <KPI title="Total Usage" value={totalUsage.toLocaleString()} />
      <KPI title="Usage Cost" value={`₹${billing.usageCost}`} />
      <KPI title="Estimated Total" value={`₹${billing.total}`} highlight />
    </div>
  );
}

function KPI({
  title,
  value,
  highlight = false,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight ? "bg-gray-50 border-gray-900" : "bg-white"
      }`}
    >
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
