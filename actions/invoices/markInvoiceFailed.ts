"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { writeAuditLog } from "@/lib/audit";
import { createWebhookEvent } from "@/actions/webhooks/createWebhookEvent";
import { Role, InvoiceStatus, SubscriptionStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";

export async function markInvoiceFailed(
    orgId: string,
    invoiceId: string,
    reason?: string
) {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    await requireRole(user.id, orgId, [Role.OWNER, Role.ADMIN]);

    // 1️⃣ Load invoice + subscription
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { subscription: true },
    });

    if (!invoice || invoice.orgId !== orgId) {
        throw new Error("Invoice not found");
    }

    if (invoice.status !== InvoiceStatus.PENDING) {
        throw new Error("Invoice cannot be marked as failed");
    }

    // 2️⃣ Update invoice status
    const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.FAILED },
    });

    // 3️⃣ Suspend subscription (ONLY if active)
    if (invoice.subscription.status === SubscriptionStatus.ACTIVE) {
        await prisma.subscription.update({
            where: { id: invoice.subscriptionId },
            data: { status: SubscriptionStatus.PAUSED },
        });
    }

    // 4️⃣ Audit logs
    await writeAuditLog({
        orgId,
        action: "SUBSCRIPTION_SUSPENDED",
        entity: "Subscription",
        entityId: invoice.subscriptionId,
        metadata: {
            invoiceId,
            reason,
        },
    });

    await writeAuditLog({
        orgId,
        action: "INVOICE_FAILED",
        entity: "Invoice",
        entityId: invoiceId,
        metadata: {
            amount: invoice.amount,
            reason,
        },
    });

    // 5️⃣ Webhooks
    await createWebhookEvent(orgId, "invoice.failed", {
        invoiceId,
        amount: invoice.amount,
        reason,
    });

    await createWebhookEvent(orgId, "subscription.suspended", {
        subscriptionId: invoice.subscriptionId,
        invoiceId,
        reason,
    });

    return updatedInvoice;
}
