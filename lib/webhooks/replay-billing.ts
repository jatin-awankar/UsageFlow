import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { refreshBillingStatus } from "@/lib/webhooks/billing-status";

// The action supplies the authenticated actor; authorization is checked again
// against current membership inside the same transaction as the replay.
export async function replayBillingWebhookForActor(input: {
  orgId: string; eventId: string; endpointId: string; idempotencyKey: string; reason: string;
}, actorId: string) {
  const { orgId, eventId, endpointId, idempotencyKey } = input;
  const reason = input.reason.trim();
  if (!idempotencyKey || idempotencyKey.length > 128 || !reason || reason.length > 500)
    throw new Error("INVALID_REPLAY_REQUEST");
  return prisma.$transaction(async (tx) => {
    // Serialize replay decisions with worker claims and other replay requests.
    const rows = await tx.$queryRaw<Array<{ webhookEventId: string }>>`
      SELECT "webhookEventId" FROM "BillingWebhookWork"
      WHERE "webhookEventId"=${eventId} AND "endpointId"=${endpointId} FOR UPDATE`;
    if (!rows.length) throw new Error("INVALID_REPLAY_TARGET");
    const membership = await tx.membership.findUnique({ where: { userId_orgId: { userId: actorId, orgId } } });
    if (membership?.role !== Role.OWNER) throw new Error("OWNER_REQUIRED");
    const event = await tx.webhookEvent.findFirst({ where: { id: eventId, orgId,
      billingRecordVersionId: { not: null }, type: { in: ["invoice.finalized", "invoice.revised"] } } });
    const endpoint = await tx.webhookEndpoint.findFirst({ where: { id: endpointId, orgId } });
    if (!event || !endpoint || !event.targetEndpointIds.includes(endpointId)) throw new Error("INVALID_REPLAY_TARGET");
    const previous = await tx.billingWebhookReplay.findUnique({ where: { orgId_idempotencyKey: { orgId, idempotencyKey } } });
    if (previous) {
      if (previous.webhookEventId !== eventId || previous.endpointId !== endpointId || previous.actorId !== actorId || previous.reason !== reason)
        throw new Error("REPLAY_KEY_CONFLICT");
      return { eventId, endpointId, cycle: previous.cycle, replayedAt: previous.replayedAt };
    }
    const work = await tx.billingWebhookWork.findUniqueOrThrow({ where: { webhookEventId_endpointId: { webhookEventId: eventId, endpointId } } });
    if (!work.terminal || work.completedAt || work.claimToken || work.leaseUntil || work.attemptCount < 5)
      throw new Error("INVALID_REPLAY_STATE");
    const replayedAt = new Date();
    const cycle = work.cycle + 1;
    await tx.billingWebhookReplay.create({ data: { orgId, webhookEventId: eventId, endpointId,
      actorId, idempotencyKey, reason, cycle, replayedAt } });
    await tx.billingWebhookWork.update({ where: { webhookEventId_endpointId: { webhookEventId: eventId, endpointId } },
      data: { cycle, cycleStartedAt: replayedAt, attemptCount: 0, failedAttempts: 0, dueAt: replayedAt,
        terminal: false, completedAt: null, claimToken: null, leaseUntil: null } });
    await refreshBillingStatus(tx, eventId);
    return { eventId, endpointId, cycle, replayedAt };
  });
}
