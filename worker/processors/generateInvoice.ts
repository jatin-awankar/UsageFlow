// worker/processors/generateInvoice.ts
import { createWebhookEvent } from "@/actions/webhooks/createWebhookEvent";
import { writeAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";

export async function processInvoice({
  subscriptionId,
}: {
  subscriptionId: string;
}) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: {
        include: {
          planMetrics: { include: { metric: true } },
        },
      },
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

  const orgId = subscription.orgId;

  const invoice = await prisma.invoice.create({
    data: {
      orgId,
      subscriptionId,
      amount: total,
      status: "PENDING",
      periodStart: subscription.periodStart,
      periodEnd: subscription.periodEnd!,
    },
  });

  // Audit log
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

  await createWebhookEvent(orgId, "invoice.created", {
    invoiceId: invoice.id,
    amount: invoice.amount,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
  });

}
