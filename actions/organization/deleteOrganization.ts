"use server";

import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";

export async function deleteOrganization(
    userId: string,
    orgId: string,
) {
    // RBAC: OWNER only
    await requireRole(userId, orgId, [Role.OWNER]);

    try {
        await prisma.$transaction(async (tx) => {
            // Write audit log FIRST
            await writeAuditLog({
                orgId,
                userId,
                action: "ORG_DELETED",
                entity: "Organization",
                entityId: orgId,
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
