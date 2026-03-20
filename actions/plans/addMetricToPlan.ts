"use server";

import prisma from "@/lib/prisma";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import { writeAuditLog } from "@/lib/audit";
import { Role } from "@prisma/client";

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
    void userId;

    const { user } = await requireCurrentOrgRole(orgId, [Role.OWNER, Role.ADMIN]);

    if (
        !Number.isInteger(data.includedUnits) ||
        data.includedUnits < 0 ||
        !Number.isInteger(data.pricePerUnit) ||
        data.pricePerUnit < 0
    ) {
        return { success: false, error: "Invalid pricing values" };
    }

    try {
        const [plan, metric] = await Promise.all([
            prisma.plan.findFirst({
                where: {
                    id: data.planId,
                    orgId,
                },
                select: { id: true },
            }),
            prisma.metric.findFirst({
                where: {
                    id: data.metricId,
                    orgId,
                },
                select: { id: true },
            }),
        ]);

        if (!plan) {
            return { success: false, error: "Plan not found" };
        }

        if (!metric) {
            return { success: false, error: "Metric not found" };
        }

        const existing = await prisma.planMetric.findUnique({
            where: {
                planId_metricId: {
                    planId: data.planId,
                    metricId: data.metricId,
                },
            },
        });

        if (existing) {
            return { success: false, error: "Metric already attached to this plan" };
        }

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
            userId: user.id,
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
