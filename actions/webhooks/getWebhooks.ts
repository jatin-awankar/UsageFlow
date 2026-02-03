import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";


export async function getWebhooks(userId: string, orgId: string) {
    await requireRole(userId, orgId, [Role.OWNER, Role.ADMIN, Role.DEVELOPER]);

    return prisma.webhookEndpoint.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
    });
}