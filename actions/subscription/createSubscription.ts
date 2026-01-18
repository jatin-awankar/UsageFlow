"use server";

import { writeAuditLog } from "@/lib/audit";
import { permissions } from "@/lib/authz/permissions";
import { requireRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";

export async function createSubscription(
  userId: string,
  orgId: string,
  planId: string,
) {
  // const parsed = createSubscriptionSchema.safeParse(input);

  // if (!parsed.success) {
  //   return { success: false, error: "Invalid subscription data", status: 400 };
  // }

  await requireRole(userId, orgId, permissions.createSubscription);

  try {
    return prisma.$transaction(async (tx) => {
      // Deactivate existing active subscriptions
      await tx.subscription.updateMany({
        where: {
          orgId,
          status: "ACTIVE",
        },
        data: {
          status: "CANCELED",
          periodEnd: new Date(),
        },
      });

      // Create new active subscription
      const subscription = await tx.subscription.create({
        data: {
          externalCustomerId: userId,
          planId,
          orgId,
          status: "ACTIVE",
          periodStart: new Date(),
        },
      });

      await writeAuditLog({
        orgId,
        userId,
        action: "SUBSCRIPTION_CREATED",
        entity: "Subscription",
        entityId: subscription.id,
        metadata: {
          planId: planId,
        },
      });

      return { success: true, data: subscription, status: 201 };
    });
  } catch (err) {
    console.log(err);
    return { success: false, error: "Error Creating Subscription" };
  }
}
