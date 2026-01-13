// lib/org/getUserOrganization.ts
import prisma from "@/lib/prisma";

export async function getUserOrganizations(userId: string) {
  return prisma.organization.findMany({
    where: {
      memberships: {
        some: { userId },
      },
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}
