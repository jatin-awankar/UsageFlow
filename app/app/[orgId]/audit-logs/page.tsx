import { getAuditLogs } from "@/actions/audit/getAuditLogs";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

const PAGE_SIZE = 5;

interface Props {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ page?: string }>; // Page is here, not in params
}

export default async function AuditPage({ params, searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) return null;

  // Await both in parallel for better performance
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const orgId = resolvedParams.orgId;
  const page = Number(resolvedSearchParams.page ?? 0);

  const logs = await getAuditLogs(user.id, orgId, page, PAGE_SIZE);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Audit Logs</h1>

      {logs.length === 0 ? (
        <p className="text-gray-500">No audit logs found.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border text-left">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Time</th>
                  <th className="p-2">Action</th>
                  <th className="p-2">Entity</th>
                  <th className="p-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-500 transition-colors">
                    <td className="p-2 text-sm">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-2 font-medium">{log.action}</td>
                    <td className="p-2">{log.entity}</td>
                    <td className="p-2 text-xs text-gray-400 hover:text-gray-300 font-mono">
                      {log.metadata
                        ? JSON.stringify(log.metadata).slice(0, 100)
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between mt-4">
            <Link
              // Use consistent URL pathing
              href={`/app/${orgId}/audit-logs?page=${Math.max(page - 1, 0)}`}
              className={`px-3 py-1 border rounded transition-opacity ${
                page === 0 ? "pointer-events-none opacity-30" : "hover:bg-gray-500"
              }`}
            >
              Previous
            </Link>

            <Link
              href={`/app/${orgId}/audit-logs?page=${page + 1}`}
              className={`px-3 py-1 border rounded transition-opacity ${
                logs.length < PAGE_SIZE ? "pointer-events-none opacity-30" : "hover:bg-gray-500"
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
