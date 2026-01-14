import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";

// app/actions/audits/getAuditLogs.ts
export async function getAuditLogs(
  userId: string,
  orgId: string,
  page = 0,
  pageSize = 20
) {
  await requireRole(userId, orgId, [Role.OWNER, Role.ADMIN]);

  return prisma.auditLog.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: pageSize,
    skip: page * pageSize,
    select: {
      id: true,
      action: true,
      entity: true,
      metadata: true,
      createdAt: true,
    },
  });
}
