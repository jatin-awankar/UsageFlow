import { Prisma, WebhookEventStatus } from "@prisma/client";
import { billingEndpointOutcome } from "@/lib/webhooks/billing-outcome";

export async function refreshBillingStatus(tx: Prisma.TransactionClient, eventId: string) {
  const event = await tx.webhookEvent.findUniqueOrThrow({ where: { id: eventId },
    select: { targetEndpointIds: true } });
  const work = await tx.billingWebhookWork.findMany({ where: { webhookEventId: eventId },
    select: { endpointId: true, terminal: true, completedAt: true } });
  const selected = new Set(event.targetEndpointIds);
  const selectedWork = work.filter((item) => selected.has(item.endpointId));
  const outcomes = selectedWork.map(billingEndpointOutcome);
  const pending = selectedWork.length < selected.size || outcomes.includes("PENDING");
  const failed = outcomes.includes("FAILED") || outcomes.includes("DISABLED");
  const delivered = outcomes.includes("DELIVERED");
  await tx.webhookEvent.update({ where: { id: eventId }, data: { status: pending ? WebhookEventStatus.PENDING :
    failed && delivered ? WebhookEventStatus.MIXED : failed ? WebhookEventStatus.FAILED :
      delivered ? WebhookEventStatus.DELIVERED : WebhookEventStatus.NO_TARGET } });
}

