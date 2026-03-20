"use server";

import { createWebhookEvent } from "@/actions/webhooks/createWebhookEvent";
import { writeAuditLog } from "@/lib/audit";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";
import {
  InvoiceStatus,
  Role,
  SubscriptionStatus,
} from "@prisma/client";

export async function markInvoiceFailed(
  userId: string,
  orgId: string,
  invoiceId: string,
  reason?: string
) {
  if (!orgId || !invoiceId) {
    return { success: false, error: "Invalid request" };
  }

  try {
    void userId;
    const { user } = await requireCurrentOrgRole(orgId, [Role.OWNER, Role.ADMIN]);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { subscription: true },
    });

    if (!invoice || invoice.orgId !== orgId) {
      return { success: false, error: "Invoice not found" };
    }

    if (invoice.status !== InvoiceStatus.PENDING) {
      return {
        success: false,
        error: "Only pending invoices can be marked as failed",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.FAILED },
      });

      if (invoice.subscription.status === SubscriptionStatus.ACTIVE) {
        await tx.subscription.update({
          where: { id: invoice.subscriptionId },
          data: { status: SubscriptionStatus.PAUSED },
        });
      }
    });

    await Promise.all([
      writeAuditLog({
        orgId,
        userId: user.id,
        action: "INVOICE_FAILED",
        entity: "Invoice",
        entityId: invoiceId,
        metadata: { amount: invoice.amount, reason },
      }),
      writeAuditLog({
        orgId,
        userId: user.id,
        action: "SUBSCRIPTION_SUSPENDED",
        entity: "Subscription",
        entityId: invoice.subscriptionId,
        metadata: { invoiceId, reason },
      }),
      createWebhookEvent(orgId, "invoice.failed", {
        invoiceId,
        amount: invoice.amount,
        reason,
      }),
      createWebhookEvent(orgId, "subscription.suspended", {
        subscriptionId: invoice.subscriptionId,
        invoiceId,
        reason,
      }),
    ]);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Access denied";
    if (message === "UNAUTHORIZED") {
      return { success: false, error: "You must be signed in" };
    }
    if (message === "NOT_A_MEMBER") {
      return {
        success: false,
        error: "You are not a member of this organization",
      };
    }
    if (message === "INSUFFICIENT_ROLE") {
      return {
        success: false,
        error: "Only owners and admins can update invoice status",
      };
    }
    console.error("Failed to mark invoice as failed:", err);
    return {
      success: false,
      error: message === "Access denied"
        ? "Access denied"
        : "Failed to update invoice. Please try again.",
    };
  }
}
