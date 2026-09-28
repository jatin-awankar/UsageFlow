import axios from "axios";
import { randomUUID } from "node:crypto";
import { WebhookDeliveryStatus, WebhookEventStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { sendBillingWebhook } from "@/worker/processors/sendBillingWebhook";

const LEASE_MS = 30_000;
const RETRY_MINUTES = [1, 2, 4, 8];

export async function deliverBillingWebhook(eventId: string, endpointId: string) {
  const token = randomUUID();
  const now = new Date();
  const context = await prisma.$transaction(async (tx) => {
    const claimed = await tx.billingWebhookWork.updateMany({
      where: { webhookEventId: eventId, endpointId, completedAt: null, terminal: false,
        dueAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
      data: { claimToken: token, leaseUntil: new Date(now.getTime() + LEASE_MS), attemptCount: { increment: 1 } },
    });
    if (!claimed.count) return null;
    const work = await tx.billingWebhookWork.findUniqueOrThrow({ where: { webhookEventId_endpointId: { webhookEventId: eventId, endpointId } } });
    const event = await tx.webhookEvent.findUniqueOrThrow({ where: { id: eventId },
      select: { id: true, orgId: true, type: true, createdAt: true, payload: true, billingRecordVersionId: true,
        targetEndpointIds: true } });
    if (!event.billingRecordVersionId || !["invoice.finalized", "invoice.revised"].includes(event.type) ||
        !event.targetEndpointIds.includes(endpointId)) throw new Error("Invalid billing delivery target");
    const endpoint = await tx.webhookEndpoint.findFirstOrThrow({ where: { id: endpointId, orgId: event.orgId },
      select: { url: true, secret: true, active: true } });
    await tx.webhookDelivery.updateMany({ where: { webhookEventId: eventId, endpointId,
      status: WebhookDeliveryStatus.PENDING }, data: { status: WebhookDeliveryStatus.FAILED,
        responseBody: "Outcome uncertain after worker interruption" } });
    await tx.webhookDelivery.create({ data: { webhookEventId: eventId, endpointId,
      attempt: work.attemptCount, status: endpoint.active ? WebhookDeliveryStatus.PENDING : WebhookDeliveryStatus.SKIPPED,
      responseBody: endpoint.active ? undefined : "Endpoint disabled" } });
    return { event, endpoint, attempt: work.attemptCount };
  });
  if (!context) return;
  await prisma.$transaction(async (tx) => {
    // Owner deactivation takes this row lock. Holding it through HTTP keeps
    // the ticket-01 promise that deactivation waits for an in-flight send.
    await tx.$queryRaw`SELECT id FROM "WebhookEndpoint" WHERE id=${endpointId} AND "orgId"=${context.event.orgId} FOR UPDATE`;
    const endpoint = await tx.webhookEndpoint.findFirstOrThrow({ where: { id: endpointId, orgId: context.event.orgId },
      select: { url: true, secret: true, active: true } });
    const started = Date.now();
    let status: WebhookDeliveryStatus = endpoint.active ? WebhookDeliveryStatus.SUCCESS : WebhookDeliveryStatus.SKIPPED;
    let responseCode: number | undefined;
    let responseBody: string | undefined;
    if (endpoint.active) {
      const body = JSON.stringify({ id: context.event.id, type: context.event.type,
        createdAt: context.event.createdAt.toISOString(), organizationId: context.event.orgId,
        billingRecordVersionId: context.event.billingRecordVersionId, payload: context.event.payload });
      try {
        const response = await sendBillingWebhook(endpoint.url, endpoint.secret, Buffer.from(body, "utf8"));
        responseCode = response.status;
      } catch (error) {
        status = WebhookDeliveryStatus.FAILED;
        responseCode = axios.isAxiosError(error) ? error.response?.status : undefined;
        responseBody = responseCode ? `HTTP ${responseCode}` : "Delivery failed";
      }
    }
    if (status === WebhookDeliveryStatus.SUCCESS && process.env.BILLING_TEST_EXIT_AFTER_HTTP_ACCEPTANCE === "true" && process.env.NODE_ENV !== "production") {
      process.exit(78);
    }
    // Serialize aggregate status updates across endpoints of this event.
    await tx.$queryRaw`SELECT id FROM "WebhookEvent" WHERE id=${eventId} FOR UPDATE`;
    const work = await tx.billingWebhookWork.findUniqueOrThrow({ where: { webhookEventId_endpointId:
      { webhookEventId: eventId, endpointId } } });
    if (work.claimToken !== token) return; // A later claim owns the result.
    await tx.webhookDelivery.update({ where: { webhookEventId_endpointId_attempt:
      { webhookEventId: eventId, endpointId, attempt: context.attempt } },
      data: { status, responseCode, responseBody, durationMs: Date.now() - started } });
    const done = status === WebhookDeliveryStatus.SUCCESS || status === WebhookDeliveryStatus.SKIPPED;
    await tx.billingWebhookWork.update({ where: { webhookEventId_endpointId: { webhookEventId: eventId, endpointId } },
      data: { claimToken: null, leaseUntil: null,
        completedAt: done ? new Date() : null,
        failedAttempts: status === WebhookDeliveryStatus.FAILED ? { increment: 1 } : work.failedAttempts,
        terminal: status === WebhookDeliveryStatus.SKIPPED ||
          (status === WebhookDeliveryStatus.FAILED && work.failedAttempts + 1 >= 5),
        dueAt: status === WebhookDeliveryStatus.FAILED && work.failedAttempts + 1 < 5
          ? new Date(Date.now() + RETRY_MINUTES[work.failedAttempts] * 60_000) : work.dueAt } });
    const remaining = await tx.billingWebhookWork.count({ where: { webhookEventId: eventId, completedAt: null, terminal: false } });
    const failed = await tx.billingWebhookWork.count({ where: { webhookEventId: eventId, terminal: true } });
    await tx.webhookEvent.update({ where: { id: eventId }, data: { status: remaining ? WebhookEventStatus.PENDING :
      failed ? WebhookEventStatus.FAILED : WebhookEventStatus.DELIVERED } });
  }, { timeout: 7000 });
}
