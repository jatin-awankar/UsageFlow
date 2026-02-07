import { getCurrentUser } from "@/lib/auth/session";
import { getWebhooks } from "@/actions/webhooks/getWebhooks";
import { redirect } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import CreateWebhookForm from "@/components/forms/CreateWebhookForm";
import ToggleWebhookButton from "@/components/forms/ToggleWebhookButton";
import { Webhook } from "lucide-react";

export default async function WebhooksPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await Promise.resolve(params);
  const webhooks = await getWebhooks(user.id, orgId);

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Receive real-time events from UsageFlow."
        actions={
          <div className="flex items-center gap-3">
            <Link
              href={`/app/${orgId}/webhooks/logs`}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              View delivery logs →
            </Link>
            <CreateWebhookForm userId={user.id} orgId={orgId} />
          </div>
        }
      />

      {webhooks.length === 0 ? (
        <EmptyState
          title="No webhook endpoints"
          description="Create a webhook to receive events like invoice creation and subscription changes."
          icon={<Webhook />}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Endpoint
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Events
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Status
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {webhooks.map((w) => (
                <tr key={w.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-mono text-xs text-gray-700 max-w-xs truncate">
                    {w.url}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {w.events.join(", ")}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        w.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {w.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <ToggleWebhookButton
                      userId={user.id}
                      orgId={orgId}
                      webhookEndpointId={w.id}
                      active={w.active}
                    />
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
