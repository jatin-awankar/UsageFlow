import { getCurrentUser } from "@/lib/auth/session";
import { getWebhooks } from "@/actions/webhooks/getWebhooks";
import { redirect } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import CreateWebhookForm from "@/components/forms/CreateWebhookForm";
import WebhooksEmptyState from "@/components/webhooks/WebhooksEmptyState";
import WebhooksOverview from "@/components/webhooks/WebhooksOverview";
import WebhooksList from "@/components/webhooks/WebhooksList";

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
        description="Create endpoints to receive real-time UsageFlow events in your systems."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/${orgId}/webhooks/logs`}>Delivery logs</Link>
            </Button>
            <CreateWebhookForm userId={user.id} orgId={orgId} />
          </div>
        }
      />

      {webhooks.length === 0 ? (
        <WebhooksEmptyState orgId={orgId} />
      ) : (
        <section className="space-y-6">
          <WebhooksOverview webhooks={webhooks} />
          <WebhooksList userId={user.id} orgId={orgId} webhooks={webhooks} />
        </section>
      )}
    </>
  );
}
