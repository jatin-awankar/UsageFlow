import { getCurrentUser } from "@/lib/auth/session";
import { getWebhookLogs } from "@/actions/webhooks/getWebhookLogs";
import { redirect } from "next/navigation";

export default async function WebhookLogsPage({
    params,
}: {
    params: Promise<{ orgId: string }>;
}) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const { orgId } = await params;
    const logs = await getWebhookLogs(user.id, orgId);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-semibold">Webhook Logs</h1>

            {logs.length === 0 ? (
                <p className="text-gray-500">
                    No webhook deliveries yet.
                </p>
            ) : (
                <table className="w-full border text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="p-2 text-left">Time</th>
                            <th className="p-2 text-left">Event</th>
                            <th className="p-2 text-left">Endpoint</th>
                            <th className="p-2 text-left">Status</th>
                            <th className="p-2 text-left">Response</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id} className="border-b">
                                <td className="p-2">
                                    {new Date(log.createdAt).toLocaleString()}
                                </td>

                                <td className="p-2 font-mono">
                                    {log.webhookEvent.type}
                                </td>

                                <td className="p-2">
                                    {log.endpoint.url}
                                </td>

                                <td className="p-2">
                                    {log.status === "SUCCESS" ? (
                                        <span className="text-green-600 font-medium">
                                            Success
                                        </span>
                                    ) : (
                                        <span className="text-red-600 font-medium">
                                            Failed
                                        </span>
                                    )}
                                </td>

                                <td className="p-2">
                                    {log.status === "SUCCESS"
                                        ? log.responseCode
                                        : log.webhookEvent.status}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
