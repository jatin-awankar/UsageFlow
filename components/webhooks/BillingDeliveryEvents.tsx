import { billingEndpointOutcome } from "@/lib/webhooks/billing-outcome";
import type { ReactNode } from "react";

export type BillingDeliveryEvent = {
  id: string;
  type: string;
  status: string;
  targetEndpointIds: string[];
  billingWebhookWork: { endpointId: string; terminal: boolean; completedAt: Date | null;
    attemptCount: number; dueAt: Date; cycle: number }[];
  deliveries: { endpointId: string; cycle: number; attempt: number; status: string;
    responseCode: number | null; safeError: string | null; durationMs: number | null;
    startedAt: Date | null }[];
  billingWebhookReplays: { endpointId: string; cycle: number; replayedAt: Date }[];
};

function endpointLabel(work: BillingDeliveryEvent["billingWebhookWork"][number]) {
  const outcome = billingEndpointOutcome(work);
  if (outcome === "PENDING") return `Pending attempt ${work.attemptCount + 1} after ${work.dueAt.toISOString()}`;
  if (outcome === "DISABLED") return "Skipped: endpoint disabled";
  if (outcome === "DELIVERED") return "Delivered";
  return work.terminal ? "Terminal failure" : "Failed";
}

function eventLabel(status: string) {
  if (status === "NO_TARGET") return "No target";
  if (status === "MIXED") return "Mixed endpoint outcomes";
  if (status === "FAILED") return "Failed: terminal endpoint failure";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function BillingDeliveryEvents({ events, renderReplayButton }: {
  events: BillingDeliveryEvent[];
  renderReplayButton?: (eventId: string, endpointId: string) => ReactNode;
}) {
  if (events.length === 0) return null;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="mb-3 font-semibold">BillingRecord comparison calculation deliveries</h2>
    <p className="mb-3 text-sm text-slate-600">These calculations are not tax invoices or payment requests.</p>
    <div className="space-y-3">{events.map((event) => <article key={event.id} className="rounded border border-slate-200 p-3 text-sm">
      <p className="font-mono text-xs">{event.id} · {event.type} · {eventLabel(event.status)}</p>
      {event.targetEndpointIds.length === 0 && <p className="mt-2">No endpoints were selected.</p>}
      {event.targetEndpointIds.map((endpointId) => {
        const work = event.billingWebhookWork.find((item) => item.endpointId === endpointId);
        if (!work) return <p key={endpointId} className="mt-2">Selected endpoint {endpointId}: pending recovery</p>;
        const attempts = event.deliveries.filter((item) => item.endpointId === endpointId);
        const replays = event.billingWebhookReplays.filter((item) => item.endpointId === endpointId);
        return <div key={endpointId} className="mt-2 break-all border-t pt-2 text-slate-600">
          <p>Endpoint {endpointId}: {endpointLabel(work)} · Cycle {work.cycle}</p>
          {replays.map((replay) => <p key={replay.cycle} className="ml-3">Replay cycle {replay.cycle} started {replay.replayedAt.toISOString()}</p>)}
          {attempts.length === 0 && <p className="ml-3">No attempts recorded yet.</p>}
          {attempts.map((attempt) => <p key={`${attempt.cycle}-${attempt.attempt}`} className="ml-3">
            Cycle {attempt.cycle}, attempt {attempt.attempt}: {attempt.status}
            {attempt.responseCode !== null ? ` · HTTP ${attempt.responseCode}` : ""}
            {attempt.safeError ? ` · ${attempt.safeError}` : ""}
            {attempt.durationMs !== null ? ` · ${attempt.durationMs} ms` : ""}
            {attempt.startedAt ? ` · ${attempt.startedAt.toISOString()}` : ""}
          </p>)}
          {work.terminal && !work.completedAt && work.attemptCount >= 5 && renderReplayButton?.(event.id, endpointId)}
        </div>;
      })}
    </article>)}</div>
  </section>;
}
