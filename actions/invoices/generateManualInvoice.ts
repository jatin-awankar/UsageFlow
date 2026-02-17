"use server";

import { requireRole } from "@/lib/authz/requireRole";
import { usageQueue } from "@/lib/queue";
import { Role } from "@prisma/client";

export async function generateManualInvoice(
    userId: string,
    orgId: string,
    subscriptionId: string
) {
    if (!userId || !orgId || !subscriptionId) {
        return { success: false, error: "Invalid request" };
    }

    try {
        await requireRole(userId, orgId, [Role.OWNER, Role.ADMIN]);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Access denied";
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