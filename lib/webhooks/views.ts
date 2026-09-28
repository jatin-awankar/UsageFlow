import prisma from "@/lib/prisma";

export function listWebhookEndpoints(orgId: string) {
  return prisma.webhookEndpoint.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    select: { id: true, url: true, events: true, active: true, createdAt: true },
  });
}

export function listWebhookDeliveryLogs(orgId: string) {
  return prisma.webhookDelivery.findMany({
    where: { endpoint: { orgId } },
    select: { id: true, status: true, createdAt: true, responseCode: true, responseBody: true,
      attempt: true, cycle: true, durationMs: true, startedAt: true,
      webhookEvent: { select: { type: true } }, endpoint: { select: { url: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export function listBillingWebhookEvents(orgId: string) {
  return prisma.webhookEvent.findMany({
    where: { orgId, billingRecordVersionId: { not: null },
      type: { in: ["invoice.finalized", "invoice.revised"] } },
    select: { id: true, type: true, status: true, createdAt: true,
      targetEndpointIds: true, billingWebhookWork: {
        select: { endpointId: true, dueAt: true, attemptCount: true,
          completedAt: true, terminal: true, endpoint: { select: { url: true, active: true } } },
      } },
    orderBy: { createdAt: "desc" }, take: 100,
  });
}
