import { test, expect } from "@playwright/test";
import { Client } from "pg";

test("acceptance and pending intent commit together despite dispatch failure", async ({ request }) => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const send = (key: string) => request.post(`${process.env.CUSTOMER_TEST_BASE_URL}/api/track`, {
      headers: { "x-usageflow-api-key": "secret-org-c", "idempotency-key": key },
      data: { customerId: "customer-c", metric: "calls", amount: 3, timestamp: "2026-10-04T00:00:00.000Z" },
    });

    const key = process.env.LEDGER_TEST_FAIL_DISPATCH === "true" ? "intent-dispatch-failed" : "intent-dispatched";
    const first = await send(key);
    expect(first.status()).toBe(200);
    const result = await first.json();
    expect(result).toEqual({ success: true, eventId: expect.any(String), acceptance: "ACCEPTED" });
    const committed = await db.query(`SELECT e."billingTreatment", e."processingState", i."eventId"
      FROM "UsageEvent" e JOIN "LedgerProcessingIntent" i ON i."eventId" = e.id WHERE e.id = $1`, [result.eventId]);
    expect(committed.rows).toEqual([{ billingTreatment: "LEDGER_ONLY", processingState: "PENDING", eventId: result.eventId }]);
    const retry = await send(key);
    expect(retry.status()).toBe(200);
    expect(await retry.json()).toEqual(result);
    const intentCount = process.env.LEDGER_TEST_FAIL_DISPATCH === "true" ? 1 : 2;
    expect((await db.query(`SELECT count(*)::int AS n FROM "LedgerProcessingIntent"`)).rows[0].n).toBe(intentCount);

    if (process.env.LEDGER_TEST_FAIL_DISPATCH !== "true") {
      const { Queue } = await import("bullmq");
      const queue = new Queue("usageflow", { connection: { url: process.env.REDIS_URL! } });
      try {
        const job = await queue.getJob(`ledger-${result.eventId}`);
        expect(job?.name).toBe("PROCESS_LEDGER_EVENT");
        expect(job?.data).toEqual({ eventId: result.eventId });
        expect((await db.query(`SELECT "processingState" FROM "UsageEvent" WHERE id = $1`, [result.eventId])).rows[0].processingState).toBe("PENDING");
      } finally {
        await queue.close();
      }
    }

    await db.query(`CREATE FUNCTION reject_ledger_intent() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected transaction failure'; END $$`);
    await db.query(`CREATE TRIGGER reject_ledger_intent BEFORE INSERT ON "LedgerProcessingIntent" FOR EACH ROW EXECUTE FUNCTION reject_ledger_intent()`);
    try {
      const failed = await send(`intent-rollback-${intentCount}`);
      expect(failed.status()).toBe(500);
      expect((await db.query(`SELECT count(*)::int AS n FROM "UsageEvent" WHERE "idempotencyKey" = $1`, [`intent-rollback-${intentCount}`])).rows[0].n).toBe(0);
      expect((await db.query(`SELECT count(*)::int AS n FROM "LedgerProcessingIntent"`)).rows[0].n).toBe(intentCount);
    } finally {
      await db.query(`DROP TRIGGER reject_ledger_intent ON "LedgerProcessingIntent"`);
      await db.query(`DROP FUNCTION reject_ledger_intent()`);
    }
  } finally {
    await db.end();
  }
});
