import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { Role } from "@/generated/prisma/enums";

export async function getAuditLogs(
  userId: string,
  orgId: string
) {
  await requireRole(userId, orgId, [
    Role.OWNER,
    Role.ADMIN,
  ]);

  return prisma.auditLog.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
