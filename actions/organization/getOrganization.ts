"use server";

import prisma from "@/lib/prisma";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";

export async function getOrganization(orgId: string) {
  await requireCurrentOrgRole(orgId, [
    Role.OWNER,
    Role.ADMIN,
    Role.DEVELOPER,
    Role.VIEWER,
  ]);

  return prisma.organization.findUnique({
    where: {
      id: orgId,
    },
    select: {
      name: true,
    },
  });
}
