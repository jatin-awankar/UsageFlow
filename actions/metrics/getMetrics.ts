"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { Role } from "@/generated/prisma/enums";

export async function getMetrics(userId: string, orgId: string) {
  await requireRole(userId, orgId, [
    Role.OWNER,
    Role.ADMIN,
    Role.DEVELOPER,
    Role.VIEWER,
  ]);

  return prisma.metric.findMany({
    where: { orgId },
    orderBy: { createdAt: "asc" },
  });
}
