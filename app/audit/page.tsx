import { getCurrentUser } from "@/lib/auth";
import { getAuditLogs } from "../actions/audits/getAuditLogs";

export default async function AuditPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const orgId = user.currentOrgId;
  const logs = await getAuditLogs(user.id, orgId);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Audit Logs</h1>

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
              <td className="p-2">
                {log.metadata
                  ? JSON.stringify(log.metadata)
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
