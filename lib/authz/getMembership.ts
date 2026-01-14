// lib/authz/getMembership.ts
import prisma from "@/lib/prisma";

export async function getMembership(userId: string, orgId: string) {
  if (!userId || !orgId) {
    return null;
  }

  return prisma.membership.findUnique({
    where: {
      userId_orgId: {
        userId,
        orgId,
      },
    },
  });
}
