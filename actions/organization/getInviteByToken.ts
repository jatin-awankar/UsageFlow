"use server";

import prisma from "@/lib/prisma";

export async function getInviteByToken(token: string) {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    return null;
  }

  return prisma.organizationInvite.findUnique({
    where: { token: normalizedToken },
    include: {
      org: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}
