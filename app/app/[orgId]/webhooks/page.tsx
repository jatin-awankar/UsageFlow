import { getCurrentUser } from "@/lib/auth/session";
import { getWebhooks } from "@/actions/webhooks/getWebhooks";
import CreateWebhookForm from "@/components/forms/CreateWebhookForm";
import ToggleWebhookButton from "@/components/forms/ToggleWebhookButton";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function WebhooksPage({
    params,
}: {
    params: Promise<{ orgId: string }>;
}) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const { orgId } = await params;

    const webhooks = await getWebhooks(user.id, orgId);

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Webhooks</h1>
                <Link
                    href={`/app/${orgId}/webhooks/logs`}
                    className="text-sm text-blue-500"
                >
                    View delivery logs →
                </Link>
            </div>

            <CreateWebhookForm userId={user.id} orgId={orgId} />

            {webhooks.length === 0 ? (
                <p className="text-gray-500">No webhooks to show</p>
            ) : (
                <table className="w-full border">
                    <thead>
                        <tr className="border-b">
                            <th className="p-2 text-left">URL</th>
                            <th className="p-2 text-left">Events</th>
                            <th className="p-2 text-left">Status</th>
                            <th className="p-2 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {webhooks.map((w) => (
                            <tr key={w.id} className="border-b">
                                <td className="p-2">{w.url}</td>
                                <td className="p-2">{w.events.join(", ")}</td>
                                <td className="p-2">
                                    {w.active ? "Active" : "Inactive"}
                                </td>
                                <td className="p-2">
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
            )}
        </div>
    );
}
