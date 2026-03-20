"use server";

import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import { usageQueue } from "@/lib/queue";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function generateManualInvoice(
    userId: string,
    orgId: string,
    subscriptionId: string
) {
    if (!orgId || !subscriptionId) {
        return { success: false, error: "Invalid request" };
    }

    try {
        void userId;
        await requireCurrentOrgRole(orgId, [Role.OWNER, Role.ADMIN]);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Access denied";
        if (message === "UNAUTHORIZED") {
            return { success: false, error: "You must be signed in" };
        }
        if (message === "NOT_A_MEMBER") {
            return { success: false, error: "You are not a member of this organization" };
        }
        if (message === "INSUFFICIENT_ROLE") {
            return {
                success: false,
                error: "Only owners and admins can generate invoices",
            };
        }
        return { success: false, error: "Access denied" };
    }

    try {
        const subscription = await prisma.subscription.findFirst({
            where: {
                id: subscriptionId,
                orgId,
            },
            select: {
                id: true,
            },
        });

        if (!subscription) {
            return { success: false, error: "Subscription not found" };
        }

        await usageQueue.add("GENERATE_INVOICE", { subscriptionId });
        return { success: true };
    } catch (err) {
        console.error("Failed to queue invoice generation:", err);
        return {
            success: false,
            error: "Failed to generate invoice. Please try again.",
        };
    }
}
