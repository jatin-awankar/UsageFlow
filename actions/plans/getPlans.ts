"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";

export async function getPlans(userId: string, orgId: string) {
    await requireRole(userId, orgId, [
        Role.OWNER,
        Role.ADMIN,
        Role.DEVELOPER,
        Role.VIEWER,
    ]);

    return prisma.plan.findMany({
        where: { orgId },
        include: {
            planMetrics: {
                include: {
                    metric: true,
                },
            },
        },
        orderBy: { createdAt: "asc" },
    });
}
