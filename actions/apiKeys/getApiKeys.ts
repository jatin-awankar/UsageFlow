"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";

export async function getApiKeys(userId: string, orgId: string) {
    await requireRole(userId, orgId, [
        Role.OWNER,
        Role.ADMIN,
        Role.DEVELOPER,
    ]);

    return prisma.apiKey.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
    });
}
