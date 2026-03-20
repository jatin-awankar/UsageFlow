"use server";

import prisma from "@/lib/prisma";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";

export async function deleteOrganization(
    userId: string,
    orgId: string,
) {
    void userId;

    const { user } = await requireCurrentOrgRole(orgId, [Role.OWNER]);

    try {
        await prisma.$transaction(async (tx) => {
            await tx.auditLog.create({
                data: {
                    orgId,
                    userId: user.id,
                    action: "ORG_DELETED",
                    entity: "Organization",
                    entityId: orgId,
                },
            });

            // Delete organization
            // (ensure Prisma schema has cascade deletes OR handle manually)
            await tx.organization.delete({
                where: { id: orgId },
            });
        });

        return { success: true };
    } catch (error) {
        console.error("Delete org failed:", error);
        return {
            success: false,
            error: "Failed to delete organization",
        };
    }
}
