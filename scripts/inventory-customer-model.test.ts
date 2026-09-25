import assert from "node:assert/strict";
import test from "node:test";
import type { QueryResultRow } from "pg";
import { INVENTORY_SQL, runInventory, summarize } from "./inventory-customer-model.ts";

const fixture = {
  org_id: "org-a", subscriptions: "2", subscription_identifier_missing: "1",
  subscription_identifier_matches_user_id: "1", subscription_identifier_unverified: "0", usage_events: "4",
  event_identifier_missing: "1", event_identifier_blank: "1",
  event_identifier_matches_user_id: "1", event_identifier_unverified: "1",
  distinct_unverified_identifiers: "1", invoices: "2", duplicate_invoice_period_groups: "1",
};

test("inventory counts missing, user-ID-like and unverified identifiers without mapping them", () => {
  const report = summarize([fixture]);
  assert.equal(report.organizationCount, 1);
  assert.equal(report.totals.usage_events, 4);
  assert.equal(report.totals.event_identifier_missing, 1);
  assert.equal(report.totals.event_identifier_blank, 1);
  assert.equal(report.totals.event_identifier_matches_user_id, 1);
  assert.equal(report.totals.event_identifier_unverified, 1);
  assert.match(report.classification, /warning, not a mapping/);
  assert.deepEqual(summarize([]).totals.invoices, 0);
});

test("inventory SQL never equates subscription externalCustomerId with event customerId", () => {
  assert.match(INVENTORY_SQL, /EXISTS \(SELECT 1 FROM "User" u WHERE u.id = s\."externalCustomerId"\)/);
  assert.doesNotMatch(INVENTORY_SQL, /s\."externalCustomerId"\s*=\s*e\."customerId"/);
});

test("queries run in a verified read-only snapshot and always roll back", async () => {
  const calls: string[] = [];
  const db = {
    async connect() { calls.push("connect"); },
    async query<R extends QueryResultRow = QueryResultRow>(sql: string): Promise<{ rows: R[] }> {
      calls.push(sql);
      if (sql === "SHOW transaction_read_only") return { rows: [{ transaction_read_only: "on" } as unknown as R] };
      if (sql === INVENTORY_SQL) return { rows: [fixture as unknown as R] };
      return { rows: [] };
    },
    async end() { calls.push("end"); },
  };
  const report = await runInventory(db);
  assert.equal(report.totals.invoices, 2);
  assert.equal(calls[1], "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  assert.deepEqual(calls.slice(-2), ["ROLLBACK", "end"]);
});

test("inventory refuses an unverified read-only connection", async () => {
  const calls: string[] = [];
  const db = {
    async connect() {},
    async query(sql: string) { calls.push(sql); return { rows: [] }; },
    async end() { calls.push("end"); },
  };
  await assert.rejects(runInventory(db), /Read-only transaction/);
  assert.deepEqual(calls.slice(-2), ["ROLLBACK", "end"]);
});
