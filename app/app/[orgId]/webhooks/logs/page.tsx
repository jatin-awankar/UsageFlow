import { getCurrentUser } from "@/lib/auth/session";
import { getWebhookLogs } from "@/actions/webhooks/getWebhookLogs";
import { redirect } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { ScrollText } from "lucide-react";

export default async function WebhookLogsPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await params;
  const logs = await getWebhookLogs(user.id, orgId);

  return (
    <>
      <PageHeader
        title="Webhook Logs"
        description="Inspect webhook delivery attempts and failures."
        actions={
          <Link
            href={`/app/${orgId}/webhooks`}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to webhooks
          </Link>
        }
      />

      {logs.length === 0 ? (
        <EmptyState
          title="No webhook deliveries yet"
          description="Webhook delivery attempts will appear here once events are triggered."
          icon={<ScrollText />}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Time
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Event
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Endpoint
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Response
                </th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="px-4 py-2 text-gray-700">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>

                  <td className="px-4 py-2 font-mono text-xs text-gray-800">
                    {log.webhookEvent.type}
                  </td>

                  <td className="px-4 py-2 max-w-xs truncate font-mono text-xs text-gray-600">
                    {log.endpoint.url}
                  </td>

                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        log.status === "SUCCESS"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {log.status === "SUCCESS" ? "Success" : "Failed"}
                    </span>
                  </td>

                  <td className="px-4 py-2 text-gray-700">
                    {log.status === "SUCCESS"
                      ? `HTTP ${log.responseCode}`
                      : "Delivery failed"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
