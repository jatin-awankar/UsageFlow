import prisma from "@/lib/prisma";
import { getUsageFlowQueue } from "@/lib/bullmq";
import { WebhookEventStatus } from "@prisma/client";

const BATCH = 100;

export async function recoverBillingWebhooks() {
  // PostgreSQL is the outbox. Lock each event while recording its one-time
  // selection, so workers racing at startup cannot select different targets.
  const unselected = await prisma.webhookEvent.findMany({
    where: { billingRecordVersionId: { not: null }, type: { in: ["invoice.finalized", "invoice.revised"] },
      targetSelectionRecordedAt: null, status: WebhookEventStatus.PENDING, targetEndpointIds: { isEmpty: true } },
    select: { id: true }, orderBy: { createdAt: "asc" }, take: BATCH,
  });
  if (unselected.length && process.env.BILLING_TEST_EXIT_BEFORE_SELECTION === "true" && process.env.NODE_ENV !== "production") {
    process.exit(77);
  }
  for (const { id } of unselected) {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; orgId: string; type: string }>>`
        SELECT id, "orgId", type FROM "WebhookEvent" WHERE id=${id}
        AND "targetSelectionRecordedAt" IS NULL FOR UPDATE SKIP LOCKED`;
      const event = locked[0];
      if (!event) return;
      const endpoints = await tx.webhookEndpoint.findMany({
        where: { orgId: event.orgId, active: true, events: { has: event.type } },
        select: { id: true }, orderBy: { id: "asc" },
      });
      await tx.webhookEvent.update({ where: { id }, data: {
        targetEndpointIds: endpoints.map((endpoint) => endpoint.id), targetSelectionRecordedAt: new Date(),
        status: endpoints.length ? WebhookEventStatus.PENDING : WebhookEventStatus.NO_TARGET,
      } });
    });
  }

  // This also repairs a crash after selection was recorded but before work
  // rows or queue wakeups were written.
  const selected = await prisma.$queryRaw<Array<{ id: string; targetEndpointIds: string[] }>>`
    SELECT e.id, e."targetEndpointIds" FROM "WebhookEvent" e
    WHERE e."billingRecordVersionId" IS NOT NULL
      AND e.type IN ('invoice.finalized', 'invoice.revised') AND e.status = 'PENDING'
      AND EXISTS (
        SELECT 1 FROM unnest(e."targetEndpointIds") AS target(id)
        WHERE NOT EXISTS (SELECT 1 FROM "BillingWebhookWork" w
          WHERE w."webhookEventId" = e.id AND w."endpointId" = target.id)
      )
    ORDER BY e."createdAt", e.id LIMIT ${BATCH}`;
  for (const event of selected) {
    await prisma.billingWebhookWork.createMany({ data: event.targetEndpointIds.map((endpointId) => ({
      webhookEventId: event.id, endpointId,
    })), skipDuplicates: true });
  }

  const due = await prisma.billingWebhookWork.findMany({
    where: { completedAt: null, terminal: false, dueAt: { lte: new Date() },
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: new Date() } }] },
    select: { webhookEventId: true, endpointId: true }, orderBy: { dueAt: "asc" }, take: BATCH,
  });
  const queue = getUsageFlowQueue();
  for (const work of due) {
    await queue.add("DELIVER_WEBHOOK", { webhookEventId: work.webhookEventId, endpointId: work.endpointId },
      { jobId: `billing-recover-${work.webhookEventId}-${work.endpointId}-${Math.floor(Date.now() / 5000)}`,
        removeOnComplete: true, removeOnFail: true });
  }
  return due.length;
}
