"use server";

import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";
import { updateOrganizationSchema } from "@/lib/validators";

export async function updateOrganization(
    orgId: string,
    input: unknown,
    userId: string
) {
    void userId;

    const { user } = await requireCurrentOrgRole(orgId, [Role.OWNER, Role.ADMIN]);

    const parsed = updateOrganizationSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Invalid input",
        };
    }

    const name = parsed.data.name.trim();

    // Prevent duplicate org names (case-insensitive)
    const existingOrg = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Organization"
    WHERE LOWER(name) = LOWER(${name})
      AND id != ${orgId}
    LIMIT 1
  `;

    if (existingOrg.length > 0) {
        return {
            success: false,
            error: "An organization with this name already exists",
        };
    }

    try {
        const org = await prisma.organization.update({
            where: { id: orgId },
            data: { name },
        });

        await writeAuditLog({
            orgId,
            userId: user.id,
            action: "ORG_UPDATED",
            entity: "Organization",
            entityId: orgId,
            metadata: { name },
        });

        return { success: true, data: org };
    } catch (error) {
        return {
            success: false,
            error: (error as string | "Failed to update organization"),
        };
    }
}
