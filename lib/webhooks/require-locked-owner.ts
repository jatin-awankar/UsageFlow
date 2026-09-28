import type { Prisma } from "@prisma/client";

/** Serialize authorization with membership revocation in the same transaction. */
export async function requireLockedEndpointOwner(tx: Prisma.TransactionClient, orgId: string, actorId: string) {
  await tx.$queryRaw`SELECT id FROM "Membership" WHERE "userId"=${actorId} AND "orgId"=${orgId} FOR UPDATE`;
  const membership = await tx.membership.findUnique({
    where: { userId_orgId: { userId: actorId, orgId } },
    select: { role: true },
  });
  if (membership?.role !== "OWNER") throw new Error("OWNER_REQUIRED");
}
