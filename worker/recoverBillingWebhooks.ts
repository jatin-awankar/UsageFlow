import prisma from "@/lib/prisma";
import { getUsageFlowQueue } from "@/lib/bullmq";
import { WebhookEventStatus } from "@prisma/client";
import { refreshBillingStatus } from "@/lib/webhooks/billing-status";

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

  // An interrupted send consumes its reserved attempt. Expired claims are
  // reconciled before another wakeup, including the fifth (terminal) send.
  const expired = await prisma.billingWebhookWork.findMany({ where: {
    completedAt: null, terminal: false, leaseUntil: { lte: new Date() }, claimToken: { not: null },
  }, select: { webhookEventId: true, endpointId: true }, take: BATCH });
  for (const item of expired) {
    await prisma.$transaction(async (tx) => {
      const work = await tx.billingWebhookWork.findUnique({ where: { webhookEventId_endpointId: item } });
      if (!work?.claimToken || !work.leaseUntil || work.leaseUntil > new Date()) return;
      await tx.webhookDelivery.updateMany({ where: { webhookEventId: item.webhookEventId,
        endpointId: item.endpointId, cycle: work.cycle, attempt: work.attemptCount, status: "PENDING" },
        data: { status: "FAILED", responseBody: "Outcome uncertain after worker interruption" } });
      await tx.billingWebhookWork.updateMany({ where: { webhookEventId: item.webhookEventId,
        endpointId: item.endpointId, claimToken: work.claimToken }, data: {
          claimToken: null, leaseUntil: null, failedAttempts: { increment: 1 },
          terminal: work.attemptCount >= 5,
          dueAt: work.attemptCount < 5 ? new Date(work.leaseUntil.getTime() + 60_000 * 2 ** (work.attemptCount - 1)) : work.dueAt,
        } });
      await refreshBillingStatus(tx, item.webhookEventId);
    });
  }

  const due = await prisma.billingWebhookWork.findMany({
    where: { completedAt: null, terminal: false, dueAt: { lte: new Date() },
      claimToken: null, leaseUntil: null, attemptCount: { lt: 5 } },
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
