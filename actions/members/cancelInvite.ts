"use server";

import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";

export async function cancelInvite(orgId: string, inviteId: string) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "You must be signed in" };
  }

  await requireRole(user.id, orgId, [Role.OWNER, Role.ADMIN]);

  const result = await prisma.organizationInvite.deleteMany({
    where: {
      id: inviteId,
      orgId,
      accepted: false,
    },
  });

  if (result.count === 0) {
    return { success: false, error: "Invite not found" };
  }

  return { success: true };
}
