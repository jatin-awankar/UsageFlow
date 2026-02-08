import { getAuditLogs } from "@/actions/audit/getAuditLogs";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Shield } from "lucide-react";

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
  searchParams: Record<string, string | undefined>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await params;
  const { cursor, direction } = await searchParams;

  const {
    data: logs,
    prevCursor,
    nextCursor,
    hasPrev,
    hasNext,
  } = await getAuditLogs({
    userId: user.id,
    orgId,
    cursor,
    direction: direction === "prev" ? "prev" : "next",
  });

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="A chronological record of actions taken within this organization."
      />

      {logs.length === 0 ? (
        <EmptyState
          title="No audit activity yet"
          description="Actions such as creating metrics, activating plans, or managing API keys will appear here."
          icon={<Shield />}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Time
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Action
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Entity
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Details
                  </th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    <td className="px-4 py-2 font-medium text-gray-900">
                      {log.action}
                    </td>

                    <td className="px-4 py-2 text-gray-700">{log.entity}</td>

                    <td className="px-4 py-2 text-xs font-mono text-gray-500 max-w-md truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <Link
              href={`/app/${orgId}/audit-logs?cursor=${prevCursor}&direction=prev`}
              className={`text-sm ${
                hasPrev
                  ? "text-gray-600 hover:text-gray-900"
                  : "pointer-events-none text-gray-300"
              }`}
            >
              ← Newer
            </Link>

            <Link
              href={`/app/${orgId}/audit-logs?cursor=${nextCursor}&direction=next`}
              className={`text-sm ${
                hasNext
                  ? "text-gray-600 hover:text-gray-900"
                  : "pointer-events-none text-gray-300"
              }`}
            >
              Older →
            </Link>
          </div>
        </>
      )}
    </>
  );
}
