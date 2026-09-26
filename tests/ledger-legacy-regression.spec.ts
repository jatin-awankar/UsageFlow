import { test, expect } from "@playwright/test";
import { Client } from "pg";
import { processAggregation } from "../worker/processors/aggregateUsage";
import { processInvoice } from "../worker/processors/generateInvoice";
import { processLedgerEvent } from "../worker/processors/processLedgerEvent";

test("processed Customer usage cannot change a recomputed legacy aggregate or recorded invoice", async ({ request }) => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const aggregate = async () => (await db.query(`SELECT total FROM "AggregatedUsage" WHERE "subscriptionId" = 'subscription-c' AND "metricKey" = 'CALLS'`)).rows;
    const invoice = async () => (await db.query(`SELECT id, amount FROM "Invoice" WHERE "subscriptionId" = 'subscription-c'`)).rows;

    await processAggregation({ orgId: "org-c", subscriptionId: "subscription-c" });
    expect(await aggregate()).toEqual([{ total: 7 }]);
    await processInvoice({ subscriptionId: "subscription-c" });
    const recordedInvoice = await invoice();
    expect(recordedInvoice).toEqual([{ id: expect.any(String), amount: 70 }]);

    const response = await request.post(`${process.env.CUSTOMER_TEST_BASE_URL}/api/track`, {
      headers: { "x-usageflow-api-key": "secret-org-c", "idempotency-key": "legacy-regression-customer-event" },
      data: { customerId: "customer-c", metric: "calls", amount: 100, timestamp: "2026-09-03T00:00:00.000Z" },
    });
    expect(response.status()).toBe(200);
    const { eventId } = await response.json();
    expect(eventId).toEqual(expect.any(String));
    await processLedgerEvent(eventId);
    expect((await db.query(`SELECT "billingTreatment", "processingState" FROM "UsageEvent" WHERE id = $1`, [eventId])).rows)
      .toEqual([{ billingTreatment: "LEDGER_ONLY", processingState: "PROCESSED" }]);

    await processAggregation({ orgId: "org-c", subscriptionId: "subscription-c" });
    expect(await aggregate()).toEqual([{ total: 7 }]);
    await processInvoice({ subscriptionId: "subscription-c" });
    expect(await invoice()).toEqual(recordedInvoice);
  } finally {
    await db.end();
  }
});
