import { test, expect } from "@playwright/test";
import { Client } from "pg";

test("committed pending ledger work survives application rollback", async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const result = await db.query(`SELECT e."processingState", i."eventId"
      FROM "UsageEvent" e JOIN "LedgerProcessingIntent" i ON i."eventId" = e.id
      WHERE e."orgId" = $1 AND e."idempotencyKey" = $2`, ["org-c", "intent-dispatch-failed"]);
    expect(result.rows).toEqual([{ processingState: "PENDING", eventId: expect.any(String) }]);
  } finally {
    await db.end();
  }
});
