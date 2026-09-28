"use server";

import { Role } from "@prisma/client";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import { listWebhookEndpoints } from "@/lib/webhooks/views";


export async function getWebhooks(userId: string, orgId: string) {
    void userId;

    await requireCurrentOrgRole(orgId, [Role.OWNER, Role.ADMIN, Role.DEVELOPER]);

    return listWebhookEndpoints(orgId);
}
