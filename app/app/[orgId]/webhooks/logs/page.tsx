import { getCurrentUser } from "@/lib/auth/session";
import { getWebhookLogs } from "@/actions/webhooks/getWebhookLogs";
import { redirect } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import WebhookLogsEmptyState from "@/components/webhooks/WebhookLogsEmptyState";
import WebhookLogsOverview from "@/components/webhooks/WebhookLogsOverview";
import WebhookLogsList from "@/components/webhooks/WebhookLogsList";

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
        description="Inspect delivery attempts, response codes, and endpoint reliability."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/${orgId}/webhooks`}>Back to webhooks</Link>
          </Button>
        }
      />

      {logs.length === 0 ? (
        <WebhookLogsEmptyState orgId={orgId} />
      ) : (
        <section className="space-y-6">
          <WebhookLogsOverview logs={logs} />
          <WebhookLogsList logs={logs} />
        </section>
      )}
    </>
  );
}
