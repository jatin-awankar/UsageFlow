import assert from "node:assert/strict";
import prisma from "../lib/prisma";
import { processAggregation } from "../worker/processors/aggregateUsage";
import { processInvoice } from "../worker/processors/generateInvoice";

const orgId = "billing-treatment-org";
const subscriptionId = "billing-treatment-subscription";
const periodStart = new Date("2026-09-01T00:00:00.000Z");
const periodEnd = new Date("2026-10-01T00:00:00.000Z");
const timestamp = new Date("2026-09-02T00:00:00.000Z");

async function total() {
  const row = await prisma.aggregatedUsage.findUniqueOrThrow({
    where: {
      orgId_subscriptionId_metricKey_periodStart: {
        orgId, subscriptionId, metricKey: "CALLS", periodStart,
      },
    },
  });
  return row.total;
}

async function main() {
  await prisma.organization.create({ data: { id: orgId, name: "Synthetic billing treatment" } });
  await prisma.customer.create({ data: { id: "mapped-customer", orgId, externalId: "customer-1" } });
  await prisma.plan.create({ data: { id: "plan", name: "Legacy", basePrice: 0, billingPeriod: "MONTHLY", orgId } });
  await prisma.metric.create({ data: { id: "metric", name: "Calls", key: "CALLS", unit: "calls", orgId } });
  await prisma.planMetric.create({ data: { id: "plan-metric", planId: "plan", metricId: "metric", includedUnits: 0, pricePerUnit: 10 } });
  await prisma.subscription.create({ data: {
    id: subscriptionId, status: "ACTIVE", periodStart, periodEnd, orgId, planId: "plan",
  } });
  await prisma.apiKey.create({ data: { id: "key", name: "Synthetic", hashedKey: "synthetic-hash", orgId } });

  const event = { metricKey: "CALLS", timestamp, orgId, subscriptionId, apiKeyId: "key" };
  await prisma.usageEvent.create({ data: { ...event, id: "historical", amount: 7, customerId: "unverified-raw-id" } });
  await processAggregation({ orgId, subscriptionId });
  assert.equal(await total(), 7);
  await processInvoice({ subscriptionId });
  const invoice = await prisma.invoice.findFirstOrThrow({ where: { subscriptionId, periodStart } });
  assert.equal(invoice.amount, 70, "the recorded invoice must derive from the historical aggregate");

  await prisma.usageEvent.update({ where: { id: "historical" }, data: { billedCustomerId: "mapped-customer" } });
  await processAggregation({ orgId, subscriptionId });
  assert.equal(await total(), 7, "mapping alone must preserve the recomputed legacy quantity");
  assert.equal((await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).amount, 70);
  assert.equal((await prisma.usageEvent.findUniqueOrThrow({ where: { id: "historical" } })).billingTreatment, "LEGACY");

  await prisma.usageEvent.create({ data: { ...event, id: "later-legacy", amount: 3 } });
  await processAggregation({ orgId, subscriptionId });
  assert.equal(await total(), 10, "mapped historical quantity must survive later recomputation");

  await prisma.usageEvent.create({ data: {
    ...event, id: "ledger-only", amount: 100, customerId: "customer-1",
    billedCustomerId: "mapped-customer", billingTreatment: "LEDGER_ONLY",
  } });
  await prisma.usageEvent.create({ data: { ...event, id: "trigger", amount: 2 } });
  await processAggregation({ orgId, subscriptionId });
  assert.equal(await total(), 12, "ledger-only quantity must never enter the legacy aggregate");
  await processInvoice({ subscriptionId });
  assert.equal((await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).amount, 70);
  assert.equal(await prisma.invoice.count({ where: { subscriptionId } }), 1);

  await prisma.usageEvent.updateMany({ where: { orgId, subscriptionId }, data: { billingTreatment: "LEDGER_ONLY" } });
  await processAggregation({ orgId, subscriptionId });
  assert.equal(await prisma.aggregatedUsage.count({ where: { orgId, subscriptionId, periodStart } }), 0,
    "recomputation must remove a stale aggregate when no legacy events remain");
  console.log("legacy billing treatment integration checks passed");
}

main().finally(() => prisma.$disconnect());
