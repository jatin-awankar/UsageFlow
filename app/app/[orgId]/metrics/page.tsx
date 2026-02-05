import { getCurrentUser } from "@/lib/auth/session";
import { getMetrics } from "@/actions/metrics/getMetrics";
import { redirect } from "next/navigation";
import { PaginationProps } from "@/types";
import CreateMetricForm from "@/components/forms/CreateMetricForm";
import Link from "next/link";

const PAGE_SIZE = 5;

export default async function MetricsPage({
  params,
  searchParams,
}: PaginationProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedSearchParams = await Promise.resolve(searchParams);

  const { orgId } = await params;
  const page = Number(resolvedSearchParams.page ?? 0);

  const metrics = await getMetrics(user.id, orgId, page, PAGE_SIZE);

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
        <>
          <h2 className="pt-4 text-xl font-semibold">Metrics created</h2>
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

          {/* Pagination */}
          <div className="flex justify-between mt-4">
            <Link
              href={`/app/${orgId}/metrics?page=${Math.max(page - 1, 0)}`}
              className={`px-3 py-1 border rounded transition-opacity ${
                page === 0
                  ? "pointer-events-none opacity-30"
                  : "hover:bg-gray-500"
              }`}
            >
              Previous
            </Link>

            <Link
              href={`/app/${orgId}/metrics?page=${page + 1}`}
              className={`px-3 py-1 border rounded transition-opacity ${
                metrics.length < PAGE_SIZE
                  ? "pointer-events-none opacity-30"
                  : "hover:bg-gray-500"
              }`}
            >
              Next
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
