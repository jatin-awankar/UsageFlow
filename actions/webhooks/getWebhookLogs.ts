"use server";

import { listBillingWebhookEvents, listWebhookDeliveryLogs } from "@/lib/webhooks/views";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";

export async function getWebhookLogs(
    userId: string,
    orgId: string
) {
    void userId;

    await requireCurrentOrgRole(orgId, [
        Role.OWNER,
        Role.ADMIN,
        Role.DEVELOPER,
    ]);

    return listWebhookDeliveryLogs(orgId);
}

export async function getBillingWebhookEvents(orgId: string) {
    await requireCurrentOrgRole(orgId, [Role.OWNER, Role.ADMIN, Role.DEVELOPER]);
    return listBillingWebhookEvents(orgId);
}
