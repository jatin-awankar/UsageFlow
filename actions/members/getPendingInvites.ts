"use server";

import prisma from "@/lib/prisma";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";

export async function getPendingInvites(
    userId: string,
    orgId: string
) {
    void userId;

    await requireCurrentOrgRole(orgId, [
        Role.OWNER,
        Role.ADMIN,
    ]);

    return prisma.organizationInvite.findMany({
        where: {
            orgId,
            accepted: false,
            expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
    });
}
