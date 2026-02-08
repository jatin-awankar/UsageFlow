// app/[orgId]/metrics/page.tsx
import { getCurrentUser } from "@/lib/auth/session";
import { getMetrics } from "@/actions/metrics/getMetrics";
import { redirect } from "next/navigation";
import { PaginationProps } from "@/types";
import CreateMetricForm from "@/components/forms/CreateMetricForm";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Link from "next/link";
import { Activity } from "lucide-react";

const PAGE_SIZE = 5;

export default async function MetricsPage({
  params,
  searchParams,
}: PaginationProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await params;
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const page = Number(resolvedSearchParams.page ?? 0);

  const metrics = await getMetrics(user.id, orgId, page, PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Metrics"
        description="Define what usage you want to track and bill for."
        actions={<CreateMetricForm userId={user.id} orgId={orgId} />}
      />

      {metrics.length === 0 ? (
        <EmptyState
          title="No metrics created"
          description="Metrics define what usage you track, such as API calls or active users."
          icon={<Activity />}
        />
      ) : (
        <div className="space-y-4">
          {/* Table */}
          <div className="overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Key
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Unit
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {m.name}
                    </td>
                    <td className="px-4 py-2 font-mono text-gray-700">
                      {m.key}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{m.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <Link
              href={`/app/${orgId}/metrics?page=${Math.max(page - 1, 0)}`}
              className={`text-sm ${
                page === 0
                  ? "pointer-events-none text-gray-300"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              ← Previous
            </Link>

            <Link
              href={`/app/${orgId}/metrics?page=${page + 1}`}
              className={`text-sm ${
                metrics.length < PAGE_SIZE
                  ? "pointer-events-none text-gray-300"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Next →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
