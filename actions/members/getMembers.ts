import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";

export async function getMembers(userId: string, orgId: string) {
    // Ensure user belongs to org
    await requireRole(userId, orgId, [
        Role.OWNER,
        Role.ADMIN,
        Role.DEVELOPER,
    ]);

    return prisma.membership.findMany({
        where: { orgId },
        include: {
            user: {
                select: {
                    email: true,
                },
            },
        },
        orderBy: {
            createdAt: "asc",
        },
    });
}
