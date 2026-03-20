"use server";

import { permissions } from "@/lib/authz/permissions";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
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
  void userId;

  const { user } = await requireCurrentOrgRole(orgId, permissions.createSubscription);

  const plan = await prisma.plan.findFirst({
    where: {
      id: planId,
      orgId,
    },
    select: {
      id: true,
    },
  });

  if (!plan) {
    return { success: false, error: "Plan not found" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
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
          externalCustomerId: user.id,
          planId: plan.id,
          orgId,
          status: "ACTIVE",
          periodStart,
          periodEnd,
        },
      });

      // 3️⃣ Audit log
      await tx.auditLog.create({
        data: {
          orgId,
          userId: user.id,
          action: "SUBSCRIPTION_CREATED",
          entity: "Subscription",
          entityId: subscription.id,
          metadata: {
            planId: plan.id,
            periodStart,
            periodEnd,
          },
        },
      });

      return { subscription, now, periodStart, periodEnd };
    });

    try {
      await createWebhookEvent(orgId, "subscription.activated", {
        subscriptionId: result.subscription.id,
        planId: plan.id,
        activatedAt: result.now.toISOString(),
        periodStart: result.periodStart,
        periodEnd: result.periodEnd,
      });
    } catch (error) {
      console.error("Subscription created, but webhook dispatch failed", error);
    }

    return { success: true, data: result.subscription, status: 201 };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Error Creating Subscription" };
  }
}
