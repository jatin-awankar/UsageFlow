"use server";

import prisma from "@/lib/prisma";
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

    return prisma.webhookDelivery.findMany({
        where: {
            endpoint: {
                orgId,
            },
        },
        include: {
            webhookEvent: true,
            endpoint: true,
        },
        orderBy: {
            createdAt: "desc",
        },
        take: 100,
    });
}

export async function getBillingWebhookEvents(orgId: string) {
    await requireCurrentOrgRole(orgId, [Role.OWNER, Role.ADMIN, Role.DEVELOPER]);
    return prisma.webhookEvent.findMany({
        where: { orgId, billingRecordVersionId: { not: null },
            type: { in: ["invoice.finalized", "invoice.revised"] } },
        select: { id: true, type: true, status: true, createdAt: true,
            targetEndpointIds: true, billingWebhookWork: {
                select: { endpointId: true, dueAt: true, attemptCount: true,
                    completedAt: true, terminal: true, endpoint: { select: { url: true, active: true } } },
            } },
        orderBy: { createdAt: "desc" }, take: 100,
    });
}
