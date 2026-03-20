"use server";

import prisma from "@/lib/prisma";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import { writeAuditLog } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function revokeApiKey(
    userId: string,
    orgId: string,
    apiKeyId: string
) {
    void userId;

    const { user } = await requireCurrentOrgRole(orgId, [
        Role.OWNER,
        Role.ADMIN,
        Role.DEVELOPER,
    ]);

    try {
        const result = await prisma.apiKey.updateMany({
            where: { id: apiKeyId, orgId },
            data: { active: false },
        });

        if (result.count === 0) {
            return { success: false, error: "API key not found" };
        }

        await writeAuditLog({
            orgId,
            userId: user.id,
            action: "API_KEY_REVOKED",
            entity: "ApiKey",
            entityId: apiKeyId,
        });

        return { success: true }
    } catch (err) {
        console.log(err);
        return { success: false, error: "Error revoking ApiKey" };
    }
}
