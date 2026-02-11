import prisma from "@/lib/prisma";

type AggregateJobData = {
  orgId: string;
  subscriptionId: string;
};

export async function processAggregation({
  orgId,
  subscriptionId,
}: AggregateJobData) {
  console.log("Aggregating usage", { orgId, subscriptionId });

  // 1️⃣ Load subscription
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    console.warn("Subscription not found", subscriptionId);
    return;
  }

  const periodStart = subscription.periodStart;
  const periodEnd = subscription.periodEnd;

  if (!periodEnd) {
    console.warn("Subscription has no periodEnd", subscriptionId);
    return;
  }

  // 2️⃣ Fetch usage events for billing window
  const events = await prisma.usageEvent.findMany({
    where: {
      orgId,
      subscriptionId,
      timestamp: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
    select: {
      metricKey: true,
      amount: true,
    },
  });

  if (events.length === 0) {
    console.log("No usage events to aggregate");
    return;
  }

  // 3️⃣ Group by metricKey
  const totals = new Map<string, number>();

  for (const event of events) {
    totals.set(
      event.metricKey,
      (totals.get(event.metricKey) ?? 0) + event.amount
    );
  }

  // 4️⃣ Upsert aggregated usage (USING YOUR UNIQUE CONSTRAINT)
  for (const [metricKey, total] of totals.entries()) {
    await prisma.aggregatedUsage.upsert({
      where: {
        orgId_subscriptionId_metricKey_periodStart: {
          orgId,
          subscriptionId,
          metricKey,
          periodStart,
        },
      },
      update: {
        total,
        periodEnd,
      },
      create: {
        orgId,
        subscriptionId,
        metricKey,
        periodStart,
        periodEnd,
        total,
      },
    });
  }

  console.log("Aggregation complete", {
    metrics: totals.size,
  });

}
