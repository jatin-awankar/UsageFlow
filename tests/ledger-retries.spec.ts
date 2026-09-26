import { test, expect } from "@playwright/test";
import { Client } from "pg";

const baseURL = process.env.CUSTOMER_TEST_BASE_URL!;
const close = process.env.LEDGER_TEST_RECEIPT_TIME === "2026-10-04T00:00:00.001Z";

test("Organization-scoped retries preserve the original acceptance and immutable contents", async ({ request }) => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const send = (org: string, key: string, data: Record<string, unknown> = {}) => request.post(`${baseURL}/api/track`, {
      headers: { "x-usageflow-api-key": `secret-${org}`, "idempotency-key": key },
      data: { customerId: "customer-c", metric: " calls ", amount: 3, timestamp: "2026-09-30T23:59:59.999Z", ...data },
    });
    const count = async () => Number((await db.query(`SELECT count(*)::int AS n FROM "UsageEvent"`)).rows[0].n);
    const accepted = { success: true, eventId: expect.any(String), acceptance: "ACCEPTED" };

    if (!close) {
      const first = await send("org-c", "retry", { metadata: { source: "first" } });
      expect(first.status()).toBe(200);
      expect(await first.json()).toEqual(accepted);
      const original = await first.json();
      const equivalent = await send("org-c", "retry", { metric: "CALLS", timestamp: "2026-10-01T05:29:59.999+05:30", metadata: { source: "second" } });
      expect(equivalent.status()).toBe(200);
      expect(await equivalent.json()).toEqual(original);
      const concurrent = await Promise.all(Array.from({ length: 8 }, () => send("org-c", "race", { metadata: { source: "race" } })));
      expect(concurrent.map((response) => response.status())).toEqual(Array(8).fill(200));
      const raceResults = await Promise.all(concurrent.map((response) => response.json()));
      expect(raceResults[0]).toEqual(accepted);
      expect(raceResults.every((result) => JSON.stringify(result) === JSON.stringify(raceResults[0]))).toBe(true);
      const mixed = await Promise.all([send("org-c", "mixed-race", { amount: 3 }), send("org-c", "mixed-race", { amount: 4 })]);
      expect(mixed.map((response) => response.status()).sort()).toEqual([200, 409]);
      const winningAmount = mixed[0].status() === 200 ? 3 : 4;
      const winningResult = await mixed[mixed[0].status() === 200 ? 0 : 1].json();
      expect(winningResult).toEqual(accepted);
      expect(await (await send("org-c", "mixed-race", { amount: winningAmount })).json()).toEqual(winningResult);
      expect((await send("org-c", "mixed-race", { amount: winningAmount === 3 ? 4 : 3 })).status()).toBe(409);
      expect(Number((await db.query(`SELECT count(*)::int AS n FROM "UsageEvent" WHERE "orgId" = 'org-c' AND "idempotencyKey" = 'mixed-race'`)).rows[0].n)).toBe(1);
      for (const change of [{ customerId: "other-c" }, { metric: "other" }, { amount: 4 }, { timestamp: "2026-09-30T23:59:59.998Z" }]) {
        const before = await count();
        const response = await send("org-c", "retry", change);
        expect(response.status()).toBe(409);
        expect(await count()).toBe(before);
      }
      const secondOrg = await send("org-d", "retry");
      expect(secondOrg.status()).toBe(200);
      expect(await secondOrg.json()).toEqual(accepted);
      expect((await secondOrg.json()).eventId).not.toBe(original.eventId);
      expect(await count()).toBe(4);
      const row = (await db.query(`SELECT metadata, "billableFingerprint" FROM "UsageEvent" WHERE id = $1`, [original.eventId])).rows[0];
      expect(row.metadata).toEqual({ source: "first" });
      expect(row.billableFingerprint).toBeTruthy();
      return;
    }

    await db.query(`UPDATE "Customer" SET active = false WHERE "orgId" = 'org-c'`);
    await db.query(`UPDATE "Subscription" SET status = 'CANCELED' WHERE id = 'subscription-c'`);
    const original = (await db.query(`SELECT id FROM "UsageEvent" WHERE "orgId" = 'org-c' AND "idempotencyKey" = 'retry'`)).rows[0].id;
    const retry = await send("org-c", "retry");
    expect(retry.status()).toBe(200);
    expect(await retry.json()).toEqual({ success: true, eventId: original, acceptance: "ACCEPTED" });
    const changed = await send("org-c", "retry", { amount: 4 });
    expect(changed.status()).toBe(409);
    for (const invalid of [{ amount: 0 }, { timestamp: "invalid" }, { metric: " " }]) {
      expect((await send("org-c", "retry", invalid)).status()).toBe(400);
    }
    expect((await send("org-c", "new-after-close")).status()).toBe(400);
    expect(await count()).toBe(4);
  } finally {
    await db.end();
  }
});
