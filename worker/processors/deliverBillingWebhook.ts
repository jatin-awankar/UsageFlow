import axios from "axios";
import { createHmac } from "node:crypto";
import { Prisma, WebhookDeliveryStatus, WebhookEventStatus } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function deliverBillingWebhook(eventId: string, endpointId: string) {
  const event = await prisma.webhookEvent.findUnique({ where: { id: eventId },
    select: { id: true, orgId: true, type: true, createdAt: true, payload: true, billingRecordVersionId: true,
      targetEndpointIds: true, status: true } });
  if (!event || !event.billingRecordVersionId || !["invoice.finalized", "invoice.revised"].includes(event.type) ||
      event.status !== WebhookEventStatus.PENDING || !event.targetEndpointIds.includes(endpointId)) return;
  const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id: endpointId, orgId: event.orgId },
    select: { id: true, url: true, secret: true, active: true } });
  if (!endpoint) return;
  // The unique (event, endpoint, attempt) row is the ticket-01 send guard.
  // A later recovery ticket will decide when an interrupted PENDING send is due.
  let delivery: { id: string };
  try {
    delivery = await prisma.webhookDelivery.create({ data: { webhookEventId: eventId, endpointId,
      status: endpoint.active ? WebhookDeliveryStatus.PENDING : WebhookDeliveryStatus.SKIPPED,
      responseBody: endpoint.active ? undefined : "Endpoint disabled" }, select: { id: true } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }

  if (endpoint.active) {
    const body = JSON.stringify({ id: event.id, type: event.type, createdAt: event.createdAt.toISOString(),
      organizationId: event.orgId, billingRecordVersionId: event.billingRecordVersionId, payload: event.payload });
    const signature = createHmac("sha256", endpoint.secret).update(body).digest("hex");
    const started = Date.now();
    let status: WebhookDeliveryStatus = WebhookDeliveryStatus.SUCCESS;
    let responseCode: number | undefined;
    let responseBody: string | undefined;
    try {
      const response = await axios.post(endpoint.url, body, { headers: { "Content-Type": "application/json",
        "X-UsageFlow-Signature": signature }, timeout: 5000 });
      responseCode = response.status;
    } catch (error) {
      status = WebhookDeliveryStatus.FAILED;
      responseCode = axios.isAxiosError(error) ? error.response?.status : undefined;
      responseBody = responseCode ? `HTTP ${responseCode}` : "Delivery failed";
    }
    await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: {
      status, responseCode, responseBody, durationMs: Date.now() - started } });
  }
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "WebhookEvent" WHERE id=${eventId} FOR UPDATE`;
    const deliveries = await tx.webhookDelivery.findMany({ where: { webhookEventId: eventId,
      endpointId: { in: event.targetEndpointIds } }, select: { endpointId: true, status: true } });
    const outcomes = new Map(deliveries.map((delivery) => [delivery.endpointId, delivery.status]));
    const status = event.targetEndpointIds.some((id) => !outcomes.has(id)) ? WebhookEventStatus.PENDING :
      [...outcomes.values()].some((value) => value !== WebhookDeliveryStatus.SUCCESS) ? WebhookEventStatus.FAILED : WebhookEventStatus.DELIVERED;
    await tx.webhookEvent.update({ where: { id: eventId }, data: { status } });
  });
}
