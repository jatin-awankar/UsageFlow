import { getAuditLogs } from "@/actions/audit/getAuditLogs";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

const PAGE_SIZE = 20;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const page = Number(searchParams.page ?? 0);
  const orgId = user.currentOrgId;

  const logs = await getAuditLogs(user.id, orgId, page, PAGE_SIZE);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Audit Logs</h1>

      {logs.length === 0 ? (
        <p className="text-gray-500">No audit logs found.</p>
      ) : (
        <>
          <table className="w-full border">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">Action</th>
                <th className="p-2 text-left">Entity</th>
                <th className="p-2 text-left">Details</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="p-2">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-2">{log.action}</td>
                  <td className="p-2">{log.entity}</td>
                  <td className="p-2 text-sm text-gray-600">
                    {log.metadata
                      ? JSON.stringify(log.metadata).slice(0, 100)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex justify-between mt-4">
            <Link
              href={`/audit?page=${Math.max(page - 1, 0)}`}
              className={`px-3 py-1 border rounded ${
                page === 0 ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Previous
            </Link>

            <Link
              href={`/audit?page=${page + 1}`}
              className={`px-3 py-1 border rounded ${
                logs.length < PAGE_SIZE ? "pointer-events-none opacity-50" : ""
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
