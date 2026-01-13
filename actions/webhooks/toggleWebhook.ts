// app/actions/toggleWebhook.ts

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { Role } from "@/generated/prisma/enums";

export async function toggleWebhook(
  webhookId: string,
  userId: string,
  orgId: string,
  active: boolean
) {
  await requireRole(userId, orgId, [Role.OWNER, Role.ADMIN]);

  return prisma.webhookEndpoint.update({
    where: { id: webhookId, orgId },
    data: { active },
  });
}
