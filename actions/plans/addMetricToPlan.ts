"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { writeAuditLog } from "@/lib/audit";
import { Role } from "@/generated/prisma/enums";

export async function addMetricToPlan(
    userId: string,
    orgId: string,
    data: {
        planId: string;
        metricId: string;
        includedUnits: number;
        pricePerUnit: number;
    }
) {
    await requireRole(userId, orgId, [Role.OWNER, Role.ADMIN]);

    try {
        const planMetric = await prisma.planMetric.create({
            data: {
                planId: data.planId,
                metricId: data.metricId,
                includedUnits: data.includedUnits,
                pricePerUnit: data.pricePerUnit,
            },
        });

        await writeAuditLog({
            orgId,
            userId,
            action: "PLAN_METRIC_ADDED",
            entity: "PlanMetric",
            entityId: planMetric.id,
            metadata: {
                pricePerUnit: data.pricePerUnit,
                includedUnits: data.includedUnits
            },
        });

        return { success: true, data: planMetric };
    } catch (err) {
        console.log(err);
        return { success: false, error: "Error adding metric to Plan" };
    }
}
