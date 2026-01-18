import { getCurrentUser } from "@/lib/auth/session";
import { getMetrics } from "@/actions/metrics/getMetrics";
import { redirect } from "next/navigation";
import CreateMetricForm from "@/components/forms/CreateMetricForm";

export default async function MetricsPage({
  params,
}: {
  params: Promise<{ orgId: string}> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedParams = await Promise.resolve(params)
  const orgId = resolvedParams.orgId

  const metrics = await getMetrics(user.id, orgId);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Metrics</h1>

      <CreateMetricForm userId={user.id} orgId={orgId} />

      {metrics.length === 0 ? (
        <div className="border rounded p-6 text-gray-600">
          <p className="font-medium">No metrics yet</p>
          <p className="text-sm mt-1">
            Metrics define what usage you track (API calls, users, etc).
          </p>
        </div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Key</th>
              <th className="p-2 text-left">Unit</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.id} className="border-b">
                <td className="p-2">{m.name}</td>
                <td className="p-2 font-mono">{m.key}</td>
                <td className="p-2">{m.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
