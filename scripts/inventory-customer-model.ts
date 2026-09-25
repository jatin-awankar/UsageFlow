import type { QueryResultRow } from "pg";

type Database = {
  connect(): Promise<void>;
  query<R extends QueryResultRow = QueryResultRow>(sql: string): Promise<{ rows: R[] }>;
  end(): Promise<void>;
};

type InventoryRow = {
  org_id: string;
  subscriptions: string;
  subscription_identifier_missing: string;
  subscription_identifier_matches_user_id: string;
  subscription_identifier_unverified: string;
  usage_events: string;
  event_identifier_missing: string;
  event_identifier_blank: string;
  event_identifier_matches_user_id: string;
  event_identifier_unverified: string;
  distinct_unverified_identifiers: string;
  invoices: string;
  duplicate_invoice_period_groups: string;
};

export const INVENTORY_SQL = `
SELECT o.id AS org_id,
  (SELECT count(*) FROM "Subscription" s WHERE s."orgId" = o.id) AS subscriptions,
  (SELECT count(*) FROM "Subscription" s WHERE s."orgId" = o.id AND (s."externalCustomerId" IS NULL OR btrim(s."externalCustomerId") = '')) AS subscription_identifier_missing,
  (SELECT count(*) FROM "Subscription" s WHERE s."orgId" = o.id AND EXISTS (SELECT 1 FROM "User" u WHERE u.id = s."externalCustomerId")) AS subscription_identifier_matches_user_id,
  (SELECT count(*) FROM "Subscription" s WHERE s."orgId" = o.id AND s."externalCustomerId" IS NOT NULL AND btrim(s."externalCustomerId") <> '' AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = s."externalCustomerId")) AS subscription_identifier_unverified,
  (SELECT count(*) FROM "UsageEvent" e WHERE e."orgId" = o.id) AS usage_events,
  (SELECT count(*) FROM "UsageEvent" e WHERE e."orgId" = o.id AND e."customerId" IS NULL) AS event_identifier_missing,
  (SELECT count(*) FROM "UsageEvent" e WHERE e."orgId" = o.id AND e."customerId" IS NOT NULL AND btrim(e."customerId") = '') AS event_identifier_blank,
  (SELECT count(*) FROM "UsageEvent" e WHERE e."orgId" = o.id AND EXISTS (SELECT 1 FROM "User" u WHERE u.id = e."customerId")) AS event_identifier_matches_user_id,
  (SELECT count(*) FROM "UsageEvent" e WHERE e."orgId" = o.id AND e."customerId" IS NOT NULL AND btrim(e."customerId") <> '' AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = e."customerId")) AS event_identifier_unverified,
  (SELECT count(DISTINCT e."customerId") FROM "UsageEvent" e WHERE e."orgId" = o.id AND e."customerId" IS NOT NULL AND btrim(e."customerId") <> '' AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = e."customerId")) AS distinct_unverified_identifiers,
  (SELECT count(*) FROM "Invoice" i WHERE i."orgId" = o.id) AS invoices,
  (SELECT count(*) FROM (SELECT i."subscriptionId", i."periodStart", i."periodEnd" FROM "Invoice" i WHERE i."orgId" = o.id GROUP BY 1, 2, 3 HAVING count(*) > 1) duplicates) AS duplicate_invoice_period_groups
FROM "Organization" o ORDER BY o.id`;

const fields = [
  "subscriptions", "subscription_identifier_missing", "subscription_identifier_matches_user_id", "subscription_identifier_unverified",
  "usage_events", "event_identifier_missing", "event_identifier_blank",
  "event_identifier_matches_user_id", "event_identifier_unverified",
  "distinct_unverified_identifiers", "invoices", "duplicate_invoice_period_groups",
] as const;
type CountField = (typeof fields)[number];

function count(value: string, field: string): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(`Invalid count for ${field}`);
  return number;
}

export function summarize(rows: InventoryRow[]) {
  const organizations = rows.map((row) => {
    const counts = Object.fromEntries(fields.map((field) => [field, count(row[field], field)])) as Record<CountField, number>;
    return { orgId: row.org_id, ...counts };
  });
  const totals = Object.fromEntries(fields.map((field) => [field, organizations.reduce((sum, org) => sum + org[field], 0)])) as Record<CountField, number>;
  return {
    classification: "No billed-customer table exists. Every nonblank event or subscription customer identifier remains unverified; matching a current User ID is a warning, not a mapping.",
    organizationCount: organizations.length,
    totals,
    organizations,
  };
}

export async function runInventory(db: Database) {
  await db.connect();
  let inTransaction = false;
  try {
    await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    inTransaction = true;
    await db.query("SET LOCAL statement_timeout = '15s'");
    await db.query("SET LOCAL lock_timeout = '2s'");
    const mode = await db.query<{ transaction_read_only: string }>("SHOW transaction_read_only");
    if (mode.rows[0]?.transaction_read_only !== "on") throw new Error("Read-only transaction could not be verified");
    const result = await db.query<InventoryRow>(INVENTORY_SQL);
    return summarize(result.rows);
  } finally {
    if (inTransaction) await db.query("ROLLBACK");
    await db.end();
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const url = process.env.INVENTORY_DATABASE_URL;
  if (!url) {
    console.error("Set INVENTORY_DATABASE_URL explicitly. The script never reads DATABASE_URL or .env.");
    process.exitCode = 2;
  } else {
    const { Client } = await import("pg");
    const db = new Client({ connectionString: url, application_name: "usageflow-customer-inventory", options: "-c default_transaction_read_only=on" });
    runInventory(db).then((report) => console.log(JSON.stringify(report, null, 2))).catch((error) => {
      console.error(`Inventory failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    });
  }
}
