import { getCurrentUser } from "@/lib/auth/session";
import { getWebhookLogs, getBillingWebhookEvents } from "@/actions/webhooks/getWebhookLogs";
import { redirect } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import WebhookLogsEmptyState from "@/components/webhooks/WebhookLogsEmptyState";
import WebhookLogsOverview from "@/components/webhooks/WebhookLogsOverview";
import WebhookLogsList from "@/components/webhooks/WebhookLogsList";
import { ArrowRight } from "lucide-react";
import { getMembership } from "@/lib/authz/getMembership";
import ReplayBillingWebhookButton from "@/components/webhooks/ReplayBillingWebhookButton";
import BillingDeliveryEvents from "@/components/webhooks/BillingDeliveryEvents";

export default async function WebhookLogsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await params;
  const logs = await getWebhookLogs(user.id, orgId);
  const membership = await getMembership(user.id, orgId);
  const events = membership?.role === "OWNER" ? await getBillingWebhookEvents(orgId) : [];

  return (
    <>
      <PageHeader
        title="Webhook Logs"
        description="Inspect delivery attempts, response codes, and endpoint reliability."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/${orgId}/webhooks`}>Back to webhooks</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/app/${orgId}/billing`}>
                Billing
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        }
      />

      {logs.length === 0 && events.length === 0 ? (
        <WebhookLogsEmptyState orgId={orgId} />
      ) : (
        <section className="space-y-6">
          <BillingDeliveryEvents events={events} renderReplayButton={(eventId, endpointId) =>
            <ReplayBillingWebhookButton orgId={orgId} eventId={eventId} endpointId={endpointId} />} />
          <WebhookLogsOverview logs={logs} />
          <WebhookLogsList logs={logs} />
        </section>
      )}
    </>
  );
}
