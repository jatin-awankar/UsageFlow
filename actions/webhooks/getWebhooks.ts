"use server";

import { Role } from "@prisma/client";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";


export async function getWebhooks(userId: string, orgId: string) {
    void userId;

    await requireCurrentOrgRole(orgId, [Role.OWNER, Role.ADMIN, Role.DEVELOPER]);

    return prisma.webhookEndpoint.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
    });
}
