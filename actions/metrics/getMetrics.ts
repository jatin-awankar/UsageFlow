"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";

export async function getMetrics(userId: string, orgId: string, page = 0, pageSize = 5) {
  await requireRole(userId, orgId, [
    Role.OWNER,
    Role.ADMIN,
    Role.DEVELOPER,
    Role.VIEWER,
  ]);

  return prisma.metric.findMany({
    where: { orgId },
    orderBy: { createdAt: "asc" },
    take: pageSize,
    skip: page * pageSize,
    select: {
      id: true,
      name: true,
      key: true,
      unit: true,
      createdAt: true,
    }
  });
}
