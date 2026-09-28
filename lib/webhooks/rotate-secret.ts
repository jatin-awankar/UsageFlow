import { randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";

export async function rotateEndpointSecretForOwner(orgId: string, endpointId: string, actorId: string,
  now?: Date) {
  const secret = randomBytes(32).toString("hex");
  return prisma.$transaction(async (tx) => {
    // Membership and endpoint locks keep authorization and rotation current at the write.
    await tx.$queryRaw`SELECT id FROM "Membership" WHERE "userId"=${actorId} AND "orgId"=${orgId} FOR UPDATE`;
    const membership = await tx.membership.findUnique({ where: { userId_orgId: { userId: actorId, orgId } }, select: { role: true } });
    if (membership?.role !== "OWNER") throw new Error("OWNER_REQUIRED");
    await tx.$queryRaw`SELECT id FROM "WebhookEndpoint" WHERE id=${endpointId} AND "orgId"=${orgId} FOR UPDATE`;
    const endpoint = await tx.webhookEndpoint.findFirst({ where: { id: endpointId, orgId }, select: { secret: true } });
    if (!endpoint) throw new Error("ENDPOINT_NOT_FOUND");
    const expiresAt = new Date((now ?? new Date()).getTime() + 24 * 60 * 60 * 1000);
    await tx.webhookEndpoint.update({ where: { id: endpointId }, data: {
      secret, previousSecret: endpoint.secret, previousSecretExpiresAt: expiresAt,
    } });
    await tx.auditLog.create({ data: { orgId, userId: actorId, action: "WEBHOOK_SECRET_ROTATED",
      entity: "WebhookEndpoint", entityId: endpointId, metadata: { previousSecretExpiresAt: expiresAt.toISOString() } } });
    return { secret, previousSecretExpiresAt: expiresAt.toISOString() };
  });
}
