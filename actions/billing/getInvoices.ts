import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";

export async function getInvoices(userId: string, orgId: string) {
  await requireRole(userId, orgId, [Role.OWNER, Role.ADMIN]);

  return prisma.invoice.findMany({
    where: {
      orgId,
    },
    select: {
      id: true,
      periodStart: true,
      amount: true,
      status: true,
    },
  });
}
