import prisma from "@/lib/prisma";

export async function getMembership(userId: string, orgId: string) {
  return prisma.membership.findUnique({
    where: {
      userId_orgId: {
        userId,
        orgId,
      },
    },
  });
}
