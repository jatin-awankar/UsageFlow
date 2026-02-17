// worker/processors/generateInvoice.ts
import { writeAuditLog } from "@/lib/audit";
import { usageQueue } from "@/lib/queue";
import prisma from "@/lib/prisma";

export async function processInvoice({
  subscriptionId,
}: {
  subscriptionId: string;
}) {
  if (!subscriptionId) {
    throw new Error("subscriptionId is required");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
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
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  const { orgId, periodStart, periodEnd, plan } = subscription;

  if (!periodEnd) {
    throw new Error(`Subscription ${subscriptionId} has no periodEnd`);
  }

  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      subscriptionId,
      periodStart,
      periodEnd,
    },
  });

  if (existingInvoice) {
    console.log("Invoice already exists for period", subscriptionId);
    return;
  }

  const usage = await prisma.aggregatedUsage.findMany({
    where: {
      subscriptionId,
      periodStart,
    },
  });

  let total = plan.basePrice;

  for (const row of usage) {
    const pricing = plan.planMetrics.find(
      (pm) => pm.metric.key === row.metricKey
    );

    if (!pricing) continue;

    const overageUnits = Math.max(0, row.total - pricing.includedUnits);
    total += overageUnits * pricing.pricePerUnit;
  }

  const invoice = await prisma.invoice.create({
    data: {
      amount: total,
      status: "PENDING",
      periodStart,
      periodEnd,
      orgId,
      subscriptionId,
    },
  });

  await writeAuditLog({
    orgId,
    action: "INVOICE_GENERATED",
    entity: "Invoice",
    entityId: invoice.id,
    metadata: {
      amount: invoice.amount,
      subscriptionId,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
    },
  });

  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      orgId,
      type: "invoice.created",
      payload: {
        invoiceId: invoice.id,
        amount: invoice.amount,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
      },
    },
  });

  await usageQueue.add(
    "DELIVER_WEBHOOK",
    { webhookEventId: webhookEvent.id },
    {
      attempts: 5,
      backoff: {
        type: "exponential" as const,
        delay: 5000,
      },
    }
  );

  console.log("Invoice generated", {
    invoiceId: invoice.id,
    amount: total,
  });
}
