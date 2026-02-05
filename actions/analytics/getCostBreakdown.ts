// app/actions/analytics/getCostBreakdown.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";

export async function getCostBreakdown(
  userId: string,
  orgId: string,
  subId: string
) {
  // 🔐 Authorization (read-only access for all roles)
  await requireRole(userId, orgId, [
    Role.OWNER,
    Role.ADMIN,
    Role.DEVELOPER,
    Role.VIEWER,
  ]);

  /**
   * 1️⃣ Find the ACTIVE subscription for this org
   * Subscription context is derived server-side
   */
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subId,
      orgId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      orgId: true,
      plan: {
        select: {
          basePrice: true,
          planMetrics: {
            select: {
              includedUnits: true,
              pricePerUnit: true,
              metric: {
                select: {
                  key: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!subscription) {
    return { success: false, error: "No active subscription found", status: 404 }
  }

  /**
   * 2️⃣ Fetch aggregated usage for THIS subscription
   */
  const usage = await prisma.aggregatedUsage.findMany({
    where: {
      orgId,
      subscriptionId: subscription.id,
    },
    select: {
      metricKey: true,
      total: true,
    },
  });

  /**
   * 3️⃣ Compute per-metric cost breakdown
   */
  const breakdown = usage.map((row) => {
    const pricing = subscription.plan.planMetrics.find(
      (pm) => pm.metric.key === row.metricKey
    );

    const included = pricing?.includedUnits ?? 0;
    const pricePerUnit = pricing?.pricePerUnit ?? 0;

    const overage = Math.max(0, row.total - included);
    const cost = overage * pricePerUnit;

    return {
      metric: row.metricKey,
      used: row.total,
      included,
      overage,
      pricePerUnit,
      cost,
    };
  });

  /**
   * 4️⃣ Final totals
   */
  const basePrice = subscription.plan.basePrice;
  const usageCost = breakdown.reduce((sum, r) => sum + r.cost, 0);

  return {
    basePrice,
    usageCost,
    total: basePrice + usageCost,
    breakdown,
  };
}
