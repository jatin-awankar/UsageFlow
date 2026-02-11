"use server";

import { writeAuditLog } from "@/lib/audit";
import { permissions } from "@/lib/authz/permissions";
import { requireRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";
import { createWebhookEvent } from "@/actions/webhooks/createWebhookEvent";

function addOneMonth(date: Date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
}

export async function createSubscription(
  userId: string,
  orgId: string,
  planId: string,
) {
  await requireRole(userId, orgId, permissions.createSubscription);

  try {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      const periodStart = now;
      const periodEnd = addOneMonth(now);

      // 1️⃣ Cancel existing active subscriptions
      await tx.subscription.updateMany({
        where: {
          orgId,
          status: "ACTIVE",
        },
        data: {
          status: "CANCELED",
          periodEnd: now,
        },
      });

      // 2️⃣ Create new active subscription
      const subscription = await tx.subscription.create({
        data: {
          externalCustomerId: userId,
          planId,
          orgId,
          status: "ACTIVE",
          periodStart,
          periodEnd,
        },
      });

      // 3️⃣ Audit log
      await writeAuditLog({
        orgId,
        userId,
        action: "SUBSCRIPTION_CREATED",
        entity: "Subscription",
        entityId: subscription.id,
        metadata: {
          planId,
          periodStart,
          periodEnd,
        },
      });

      // 4️⃣ Webhook
      await createWebhookEvent(orgId, "subscription.activated", {
        subscriptionId: subscription.id,
        planId,
        activatedAt: now.toISOString(),
        periodStart,
        periodEnd,
      });

      return { success: true, data: subscription, status: 201 };
    });
  } catch (err) {
    console.error(err);
    return { success: false, error: "Error Creating Subscription" };
  }
}
