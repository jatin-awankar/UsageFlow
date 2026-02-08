// worker/processors/aggregateUsage.ts
import prisma from "@/lib/prisma";

export async function processAggregation({
  orgId,
  subscriptionId,
}: {
  orgId: string;
  subscriptionId: string;
}) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const usage = await prisma.usageEvent.groupBy({
    by: ["metricKey"],
    where: {
      orgId,
      subscriptionId,
      timestamp: { gte: periodStart },
    },
    _sum: { amount: true },
  });

  for (const row of usage) {
    await prisma.aggregatedUsage.upsert({
      where: {
        orgId_subscriptionId_metricKey_periodStart: {
          orgId,
          subscriptionId,
          metricKey: row.metricKey,
          periodStart,
        },
      },
      update: { total: row._sum.amount ?? 0 },
      create: {
        orgId,
        subscriptionId,
        metricKey: row.metricKey,
        periodStart,
        periodEnd: now,
        total: row._sum.amount ?? 0,
      },
    });
  }
}
