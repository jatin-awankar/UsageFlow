"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { writeAuditLog } from "@/lib/audit";
import { Role } from "@/generated/prisma/enums";

export async function revokeApiKey(
    userId: string,
    orgId: string,
    apiKeyId: string
) {
    await requireRole(userId, orgId, [
        Role.OWNER,
        Role.ADMIN,
        Role.DEVELOPER,
    ]);

    try {
        await prisma.apiKey.update({
            where: { id: apiKeyId },
            data: { active: false },
        });

        await writeAuditLog({
            orgId,
            userId,
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
