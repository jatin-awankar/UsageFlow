import { getUsageSummary } from "@/app/actions/analytics/getUsageSummary";
import { getCurrentUser } from "@/lib/auth";

export default async function UsagePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // TEMP: replace with org selector later
  const orgId = user.currentOrgId;

  const usage = await getUsageSummary(user.id, orgId);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Usage</h1>

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
    </div>
  );
}
