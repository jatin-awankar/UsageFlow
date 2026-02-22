"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";

export async function getPendingInvites(
    userId: string,
    orgId: string
) {
    await requireRole(userId, orgId, [
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