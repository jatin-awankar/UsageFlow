import { randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";

export async function createEndpointForOwner(orgId: string, actorId: string, url: string, events: string[]) {
  const secret = randomBytes(32).toString("hex");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Membership" WHERE "userId"=${actorId} AND "orgId"=${orgId} FOR UPDATE`;
    const membership = await tx.membership.findUnique({ where: { userId_orgId: { userId: actorId, orgId } }, select: { role: true } });
    if (membership?.role !== "OWNER") throw new Error("OWNER_REQUIRED");
    const endpoint = await tx.webhookEndpoint.create({ data: { orgId, url, events, secret, active: true },
      select: { id: true } });
    await tx.auditLog.create({ data: { orgId, userId: actorId, action: "WEBHOOK_CREATED", entity: "WebhookEndpoint",
      entityId: endpoint.id, metadata: { url, events } } });
    return { id: endpoint.id, secret };
  });
}
