import axios from "axios";
import { Prisma, WebhookDeliveryStatus, WebhookEventStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { sendBareHmacWebhook } from "@/worker/processors/sendBareHmacWebhook";

export async function deliverBillingWebhook(eventId: string, endpointId: string) {
  const event = await prisma.webhookEvent.findUnique({ where: { id: eventId },
    select: { id: true, orgId: true, type: true, createdAt: true, payload: true, billingRecordVersionId: true,
      targetEndpointIds: true, status: true } });
  if (!event || !event.billingRecordVersionId || !["invoice.finalized", "invoice.revised"].includes(event.type) ||
      event.status !== WebhookEventStatus.PENDING || !event.targetEndpointIds.includes(endpointId)) return;
  try {
    const found = await prisma.$transaction(async (tx) => {
      // Serialize a send with owner deactivation. A deactivation committed first
      // is skipped; one that waits for this lock takes effect after the send.
      await tx.$queryRaw`SELECT id FROM "WebhookEndpoint" WHERE id=${endpointId} AND "orgId"=${event.orgId} FOR UPDATE`;
      const endpoint = await tx.webhookEndpoint.findFirst({ where: { id: endpointId, orgId: event.orgId },
        select: { url: true, secret: true, active: true } });
      if (!endpoint) return false;
      // The unique row is the ticket-01 send guard. Recovery of an interrupted
      // PENDING send belongs to the next ticket.
      const delivery = await tx.webhookDelivery.create({ data: { webhookEventId: eventId, endpointId,
        status: endpoint.active ? WebhookDeliveryStatus.PENDING : WebhookDeliveryStatus.SKIPPED,
        responseBody: endpoint.active ? undefined : "Endpoint disabled" }, select: { id: true } });
      if (!endpoint.active) return true;

      const body = JSON.stringify({ id: event.id, type: event.type, createdAt: event.createdAt.toISOString(),
        organizationId: event.orgId, billingRecordVersionId: event.billingRecordVersionId, payload: event.payload });
      const started = Date.now();
      let status: WebhookDeliveryStatus = WebhookDeliveryStatus.SUCCESS;
      let responseCode: number | undefined;
      let responseBody: string | undefined;
      try {
        const response = await sendBareHmacWebhook(endpoint.url, endpoint.secret, body);
        responseCode = response.status;
      } catch (error) {
        status = WebhookDeliveryStatus.FAILED;
        responseCode = axios.isAxiosError(error) ? error.response?.status : undefined;
        responseBody = responseCode ? `HTTP ${responseCode}` : "Delivery failed";
      }
      await tx.webhookDelivery.update({ where: { id: delivery.id }, data: {
        status, responseCode, responseBody, durationMs: Date.now() - started } });
      return true;
    }, { timeout: 7000 });
    if (!found) return;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "WebhookEvent" WHERE id=${eventId} FOR UPDATE`;
    const deliveries = await tx.webhookDelivery.findMany({ where: { webhookEventId: eventId,
      endpointId: { in: event.targetEndpointIds } }, select: { endpointId: true, status: true } });
    const outcomes = new Map(deliveries.map((delivery) => [delivery.endpointId, delivery.status]));
    const status = event.targetEndpointIds.some((id) => !outcomes.has(id) || outcomes.get(id) === WebhookDeliveryStatus.PENDING) ? WebhookEventStatus.PENDING :
      [...outcomes.values()].some((value) => value !== WebhookDeliveryStatus.SUCCESS) ? WebhookEventStatus.FAILED : WebhookEventStatus.DELIVERED;
    await tx.webhookEvent.update({ where: { id: eventId }, data: { status } });
  });
}
