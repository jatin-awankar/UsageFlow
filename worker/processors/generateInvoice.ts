// worker/processors/generateInvoice.ts
import { prisma } from "@/lib/prisma";
import { usageQueue } from "@/lib/queue";

export async function processInvoice({ subscriptionId }: { subscriptionId: string }) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: { include: { planMetrics: { include: { metric: true } } } },
    },
  });

  if (!subscription) return;

  const usage = await prisma.aggregatedUsage.findMany({
    where: { subscriptionId },
  });

  let total = subscription.plan.basePrice;

  for (const row of usage) {
    const pricing = subscription.plan.planMetrics.find(
      (pm) => pm.metric.key === row.metricKey
    );
    if (!pricing) continue;

    const overage = Math.max(0, row.total - pricing.includedUnits);
    total += overage * pricing.pricePerUnit;
  }

  const invoice = await prisma.invoice.create({
    data: {
      orgId: subscription.orgId,
      subscriptionId,
      amount: total,
      status: "PENDING",
      periodStart: subscription.periodStart,
      periodEnd: subscription.periodEnd,
    },
  });


const endpoints = await prisma.webhookEndpoint.findMany({
  where: {
    orgId: subscription.orgId,
    active: true,
    events: { has: "invoice.created" },
  },
});

for (const endpoint of endpoints) {
  const event = await prisma.webhookEvent.create({
    data: {
      type: "invoice.created",
      payload: {
        invoiceId: invoice.id,
        amount: invoice.amount,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
      },
      orgId: subscription.orgId,
      endpointId: endpoint.id,
      status: "PENDING",
    },
  });

  await usageQueue.add("DELIVER_WEBHOOK", {
    webhookEventId: event.id,
  });
}

}
