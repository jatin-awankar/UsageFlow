"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";

export async function getWebhookLogs(
    userId: string,
    orgId: string
) {
    await requireRole(userId, orgId, [
        Role.OWNER,
        Role.ADMIN,
        Role.DEVELOPER,
    ]);

    return prisma.webhookDelivery.findMany({
        where: {
            endpoint: {
                orgId,
            },
        },
        include: {
            webhookEvent: true,
            endpoint: true,
        },
        orderBy: {
            createdAt: "desc",
        },
        take: 100,
    });
}
