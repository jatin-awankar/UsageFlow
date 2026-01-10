// app/actions/analytics/getCostBreakdown.ts
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { AppError } from "@/lib/errors";
import { Role } from "@/generated/prisma/enums";

export async function getCostBreakdown(
  userId: string,
  orgId: string
) {
  // 🔐 Authorization
  await requireRole(userId, orgId, [
    Role.OWNER,
    Role.ADMIN,
    Role.DEVELOPER,
    Role.VIEWER,
  ]);

  // ✅ Find ACTIVE subscription for org
  const subscription = await prisma.subscription.findFirst({
    where: {
      orgId,
      status: "ACTIVE",
    },
    include: {
      plan: {
        include: {
          planMetrics: {
            include: { metric: true },
          },
        },
      },
    },
  });

  if (!subscription) {
    throw new AppError("No active subscription found", 404);
  }

  const usage = await prisma.aggregatedUsage.findMany({
    where: {
      orgId,
      subscriptionId: subscription.id,
    },
  });

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

  const basePrice = subscription.plan.basePrice;
  const usageCost = breakdown.reduce((sum, r) => sum + r.cost, 0);

  return {
    basePrice,
    usageCost,
    total: basePrice + usageCost,
    breakdown,
  };
}
