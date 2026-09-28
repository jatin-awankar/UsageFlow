import { Prisma, WebhookEventStatus } from "@prisma/client";

export async function billingEventTargets(tx: Prisma.TransactionClient, orgId: string, type: "invoice.finalized" | "invoice.revised") {
  const endpoints = await tx.webhookEndpoint.findMany({
    where: { orgId, active: true, events: { has: type } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const targetEndpointIds = endpoints.map(({ id }) => id);
  return {
    targetEndpointIds,
    status: targetEndpointIds.length ? WebhookEventStatus.PENDING : WebhookEventStatus.NO_TARGET,
  };
}

export const isBillingDeliveryEvent = (type: string, versionId: string | null) =>
  versionId !== null && (type === "invoice.finalized" || type === "invoice.revised");
