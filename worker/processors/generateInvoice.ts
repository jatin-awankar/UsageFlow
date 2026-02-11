import prisma from "@/lib/prisma";
import { createWebhookEvent } from "@/actions/webhooks/createWebhookEvent";
import { writeAuditLog } from "@/lib/audit";

export async function processInvoice({
  subscriptionId,
}: {
  subscriptionId: string;
}) {
  // Load subscription + plan
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

  if (!subscription) return;

  const {
    orgId,
    periodStart,
    periodEnd,
    plan,
  } = subscription;

  if (!periodEnd) {
    console.warn("Subscription has no periodEnd", subscriptionId);
    return;
  }

  // Prevent duplicate invoices for same period
  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      subscriptionId,
      periodStart: periodStart,
      periodEnd: periodEnd,
    },
  });

  if (existingInvoice) {
    console.log("Invoice already exists for period", subscriptionId);
    return;
  }

  // Fetch aggregated usage for THIS billing period
  const usage = await prisma.aggregatedUsage.findMany({
    where: {
      subscriptionId,
      periodStart: periodStart,
    },
  });

  // Calculate total
  let total = plan.basePrice;

  for (const row of usage) {
    const pricing = plan.planMetrics.find(
      (pm) => pm.metric.key === row.metricKey
    );

    if (!pricing) continue;

    const overageUnits = Math.max(
      0,
      row.total - pricing.includedUnits
    );

    total += overageUnits * pricing.pricePerUnit;
  }

  // Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      amount: total,
      status: "PENDING",
      periodStart: periodStart,
      periodEnd: periodEnd,

      org: {
        connect: { id: orgId },
      },
      subscription: {
        connect: { id: subscriptionId },
      },
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

  // Emit webhook event
  await createWebhookEvent(orgId, "invoice.created", {
    invoiceId: invoice.id,
    amount: invoice.amount,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
  });

  console.log("Invoice generated", {
    invoiceId: invoice.id,
    amount: total,
  });
}
