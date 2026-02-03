"use server";

import prisma from "@/lib/prisma";

export async function getOrganization(orgId: string) {
  return prisma.organization.findUnique({
    where: {
      id: orgId,
    },
    select: {
      name: true,
    },
  });
}
