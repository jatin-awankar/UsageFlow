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
import { billingEndpointOutcome } from "@/lib/webhooks/billing-outcome";
import { getMembership } from "@/lib/authz/getMembership";
import ReplayBillingWebhookButton from "@/components/webhooks/ReplayBillingWebhookButton";

function endpointOutcomeLabel(work: { terminal: boolean; completedAt: Date | null; attemptCount: number; dueAt: Date }) {
  const outcome = billingEndpointOutcome(work);
  if (outcome === "PENDING") return `Pending attempt ${work.attemptCount + 1} after ${work.dueAt.toISOString()}`;
  if (outcome === "DISABLED") return "Disabled target";
  return outcome === "DELIVERED" ? "Delivered" : "Failed";
}

export default async function WebhookLogsPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await params;
  const logs = await getWebhookLogs(user.id, orgId);
  const events = await getBillingWebhookEvents(orgId);
  const membership = await getMembership(user.id, orgId);

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
          {events.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold">Billing event outcomes</h2>
            <div className="space-y-3">
              {events.map((event) => <article key={event.id} className="rounded border border-slate-200 p-3 text-sm">
                <p className="font-mono text-xs">{event.id} · {event.type} · {event.status === "NO_TARGET" ? "No target" : event.status === "MIXED" ? "Mixed endpoint outcomes" : event.status}</p>
                {event.billingWebhookWork.map((work) => <div key={work.endpointId} className="mt-1 break-all text-slate-600">
                  {new URL(work.endpoint.url).origin}: {endpointOutcomeLabel(work)}
                  {membership?.role === "OWNER" && work.terminal && !work.completedAt && work.attemptCount >= 5 &&
                    <ReplayBillingWebhookButton orgId={orgId} eventId={event.id} endpointId={work.endpointId} />}
                </div>)}
              </article>)}
            </div>
          </section>}
          <WebhookLogsOverview logs={logs} />
          <WebhookLogsList logs={logs} />
        </section>
      )}
    </>
  );
}
