"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { writeAuditLog } from "@/lib/audit";
import { createWebhookEvent } from "@/actions/webhooks/createWebhookEvent";
import { Role, InvoiceStatus } from "@prisma/client";

export async function markInvoicePaid(
    userId: string,
    orgId: string,
    invoiceId: string
) {
    await requireRole(userId, orgId, [Role.OWNER, Role.ADMIN]);

    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
    });

    if (!invoice || invoice.orgId !== orgId) {
        throw new Error("Invoice not found");
    }

    if (invoice.status !== InvoiceStatus.PENDING) {
        throw new Error("Invoice cannot be marked as paid");
    }

    const updated = await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.PAID },
    });

    // Audit log
    await writeAuditLog({
        orgId,
        action: "INVOICE_PAID",
        entity: "Invoice",
        entityId: invoiceId,
        metadata: {
            amount: invoice.amount,
            periodStart: invoice.periodStart,
            periodEnd: invoice.periodEnd,
        },
    });

    // Webhook
    await createWebhookEvent(orgId, "invoice.paid", {
        invoiceId,
        amount: invoice.amount,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
    });

    return updated;
}
