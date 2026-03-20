"use server";

import prisma from "@/lib/prisma";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";

export async function getApiKeys(userId: string, orgId: string) {
    void userId;

    await requireCurrentOrgRole(orgId, [
        Role.OWNER,
        Role.ADMIN,
        Role.DEVELOPER,
    ]);

    return prisma.apiKey.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
    });
}
