import { randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";
import { requireLockedEndpointOwner } from "@/lib/webhooks/require-locked-owner";

export async function createEndpointForOwner(orgId: string, actorId: string, url: string, events: string[]) {
  const secret = randomBytes(32).toString("hex");
  return prisma.$transaction(async (tx) => {
    await requireLockedEndpointOwner(tx, orgId, actorId);
    const endpoint = await tx.webhookEndpoint.create({ data: { orgId, url, events, secret, active: true },
      select: { id: true } });
    await tx.auditLog.create({ data: { orgId, userId: actorId, action: "WEBHOOK_CREATED", entity: "WebhookEndpoint",
      entityId: endpoint.id, metadata: { url, events } } });
    return { id: endpoint.id, secret };
  });
}
