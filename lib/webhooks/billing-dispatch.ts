import prisma from "@/lib/prisma";
import { usageQueue } from "@/lib/queue";
import { isBillingDeliveryEvent } from "@/lib/webhooks/billing-targets";

// Called only after the approval transaction resolves. The selected IDs were
// committed with the event; this path never reselects current endpoints.
export async function dispatchCommittedBillingEvent(eventId: string) {
  const event = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
    select: { id: true, type: true, billingRecordVersionId: true, targetEndpointIds: true },
  });
  if (!event || !isBillingDeliveryEvent(event.type, event.billingRecordVersionId)) return;
  await Promise.all(event.targetEndpointIds.map((endpointId) => usageQueue.add("DELIVER_WEBHOOK",
    { webhookEventId: event.id, endpointId, attempt: 1 },
    { jobId: `billing-${event.id}-${endpointId}`, removeOnComplete: true, removeOnFail: true })));
}
