import { test, expect } from "@playwright/test";
import { Client } from "pg";

const baseURL = process.env.CUSTOMER_TEST_BASE_URL!;
const receipt = process.env.LEDGER_TEST_RECEIPT_TIME!;

test("Customer usage acceptance commits a stable receipt and rejects invalid new events", async ({ request }) => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const send = (key: string | undefined, data: Record<string, unknown>) => request.post(`${baseURL}/api/track`, {
      headers: { "x-usageflow-api-key": "secret-org-c", ...(key === undefined ? {} : { "idempotency-key": key }) },
      data: { metric: "calls", amount: 3, customerId: "customer-c", ...data },
    });
    const count = async () => Number((await db.query(`SELECT count(*)::int AS n FROM "UsageEvent"`)).rows[0].n);

    if (receipt === "2026-10-04T00:00:00.001Z") {
      const before = await count();
      expect((await send("after-close", { timestamp: "2026-09-30T23:59:59.999Z" })).status()).toBe(400);
      expect(await count()).toBe(before);
      return;
    }

    for (const [key, timestamp] of [["sept-close", "2026-09-30T23:59:59.999Z"], ["oct-start", "2026-10-01T00:00:00.000Z"], ["future-limit", "2026-10-04T00:05:00.000Z"]] as const) {
      const response = await send(key, { timestamp });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true, eventId: expect.any(String), acceptance: "ACCEPTED" });
      const row = (await db.query(`SELECT e.*, c."externalId", c.active AS "customerActive" FROM "UsageEvent" e JOIN "Customer" c ON c.id = e."billedCustomerId" WHERE e.id = $1`, [body.eventId])).rows[0];
      expect(row).toMatchObject({ orgId: "org-c", subscriptionId: "subscription-c", customerId: "customer-c", externalId: "customer-c", customerActive: true, metricKey: "CALLS", amount: 3, billingTreatment: "LEDGER_ONLY", processingState: "PENDING", idempotencyKey: key });
      expect(row.timestamp.toISOString()).toBe(timestamp);
      expect(row.receivedAt.toISOString()).toBe(receipt);
    }

    for (const [key, data] of [[undefined, { timestamp: receipt }], [" ", { timestamp: receipt }], ["no-time", {}], ["bad-time", { timestamp: "nope" }], ["zero", { timestamp: receipt, amount: 0 }], ["fraction", { timestamp: receipt, amount: 1.5 }], ["old", { timestamp: "2026-08-31T23:59:59.999Z" }], ["too-future", { timestamp: "2026-10-04T00:05:00.001Z" }]] as const) {
      const before = await count();
      expect((await send(key, data)).status()).toBe(400);
      expect(await count()).toBe(before);
    }
    expect(await count()).toBe(3);
  } finally {
    await db.end();
  }
});
