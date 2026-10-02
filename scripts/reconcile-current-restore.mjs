import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const migrationDir = join(root, 'prisma/migrations');
const requiredColumns = [
  ['Customer', 'orgId'], ['Customer', 'externalId'],
  ['UsageEvent', 'customerId'], ['UsageEvent', 'billedCustomerId'], ['UsageEvent', 'billingTreatment'],
  ['Subscription', 'externalCustomerId'], ['Invoice', 'subscriptionId'],
  ['BillingRecord', 'billedCustomerId'], ['WebhookEvent', 'billingRecordVersionId'],
];

export function checkManifest(manifest, archive, now = new Date()) {
  if (manifest.kind !== 'usageflow-isolated-production-restore' || manifest.isolated !== true) throw Error('An isolated production restore manifest is required');
  if (!manifest.sourceEvidence || !manifest.restoreEvidence) throw Error('Source and restore provenance evidence references are required');
  if (!manifest.backupPath || !manifest.backupSha256 || !manifest.archiveCreatedAt || !manifest.sourceCapturedAt) throw Error('Backup path, checksum, archive time, and source capture time are required');
  if (!manifest.database || !manifest.readOnlyRole || !manifest.restoreId) throw Error('Expected database, inventory role, and restore ID are required');
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(manifest.sourceCapturedAt) || !Number.isFinite(Date.parse(manifest.sourceCapturedAt))) throw Error('sourceCapturedAt must be an ISO UTC timestamp');
  const ageHours = (now.getTime() - Date.parse(manifest.sourceCapturedAt)) / 3600000;
  if (ageHours < 0 || ageHours > 48) throw Error(`Backup age ${ageHours.toFixed(1)} hours exceeds the 48-hour representative-copy limit`);
  if (archive.sha256 !== manifest.backupSha256) throw Error('Backup SHA-256 mismatch');
  if (archive.createdAt !== manifest.archiveCreatedAt) throw Error('Backup archive creation time mismatch');
  const headerTime = Date.parse(archive.createdAt);
  if (!Number.isFinite(headerTime) || Math.abs(headerTime - Date.parse(manifest.sourceCapturedAt)) > 24 * 3600000) throw Error('Source capture time is inconsistent with the archive header');
  if (manifest.database === 'postgres' || manifest.database === 'template1') throw Error('Inventory database must be a named isolated restore');
  return { ageHours, sourceCapturedAt: manifest.sourceCapturedAt, backupSha256: archive.sha256, archiveCreatedAt: archive.createdAt };
}

export async function inspectArchive(path) {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(path)) { hash.update(chunk); bytes += chunk.length; }
  const listing = execFileSync('pg_restore', ['-l', path], { encoding: 'utf8', timeout: 15000, env: { ...process.env, TZ: 'UTC' } });
  const createdAt = listing.match(/^; Archive created at (.+)$/m)?.[1];
  if (!createdAt || !listing.includes(';     Format: CUSTOM')) throw Error('Expected a valid PostgreSQL custom archive with creation metadata');
  return { sha256: hash.digest('hex'), createdAt, bytes };
}

export function localUrl(url) {
  const parsed = new URL(url);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw Error('PostgreSQL URL required');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) throw Error('Only a loopback isolated restore is allowed');
  if (parsed.search || parsed.hash) throw Error('Connection URL options and fragments are not allowed');
  return parsed;
}

export async function localMigrations() {
  const names = (await readdir(migrationDir, { withFileTypes: true })).filter(x => x.isDirectory()).map(x => x.name).sort();
  return Promise.all(names.map(async name => ({
    name, checksum: createHash('sha256').update(await readFile(join(migrationDir, name, 'migration.sql'))).digest('hex'),
  })));
}

export function verifyMigrations(expected, actual) {
  const byName = new Map(actual.map(row => [row.migration_name, row]));
  const failures = [];
  for (const item of expected) {
    const row = byName.get(item.name);
    if (!row || !row.finished_at || row.rolled_back_at) failures.push(`Migration missing or incomplete: ${item.name}`);
    else if (row.checksum !== item.checksum) failures.push(`Migration checksum mismatch: ${item.name}`);
  }
  for (const row of actual) if (!expected.some(x => x.name === row.migration_name) && !row.rolled_back_at) failures.push(`Unexpected applied migration: ${row.migration_name}`);
  if (failures.length) throw Error(failures.join('; '));
  return { applied: expected.length, latest: expected.at(-1)?.name ?? null };
}

export function verifyRole(row, manifest) {
  if (!row || row.database !== manifest.database || row.role !== manifest.readOnlyRole) throw Error('Database or inventory role differs from the manifest');
  if (row.server_address && !['127.0.0.1', '::1'].includes(row.server_address)) throw Error('Database connection is not loopback');
  if (row.transaction_read_only !== 'on' || row.default_transaction_read_only !== 'on' || !row.role_default_read_only) throw Error('Inventory transaction and role must default to read only');
  if (row.superuser || row.create_db || row.create_role || row.replication || row.bypass_rls || row.db_create || row.db_temp || row.schema_create || row.any_table_write) throw Error('Inventory role has elevated or write-capable privileges');
  if (!row.can_select || row.can_insert || row.can_update || row.can_delete || row.can_truncate || row.can_references || row.can_trigger) throw Error('Inventory role must have SELECT only on the inventoried tables');
}

const ROLE_SQL = `SELECT current_database() AS database, current_user AS role, host(inet_server_addr()) AS server_address,
  current_setting('transaction_read_only') AS transaction_read_only,
  current_setting('default_transaction_read_only') AS default_transaction_read_only,
  (coalesce('default_transaction_read_only=on' = ANY(r.rolconfig), false) OR EXISTS (
    SELECT 1 FROM pg_db_role_setting s WHERE s.setrole = r.oid
    AND s.setdatabase = (SELECT oid FROM pg_database WHERE datname = current_database())
    AND 'default_transaction_read_only=on' = ANY(s.setconfig))) AS role_default_read_only,
  r.rolsuper AS superuser, r.rolcreatedb AS create_db, r.rolcreaterole AS create_role,
  r.rolreplication AS replication, r.rolbypassrls AS bypass_rls,
  has_database_privilege(current_user, current_database(), 'CREATE') AS db_create,
  has_database_privilege(current_user, current_database(), 'TEMP') AS db_temp,
  EXISTS (SELECT 1 FROM pg_namespace n WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
    AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'
    AND has_schema_privilege(current_user, n.oid, 'CREATE')) AS schema_create,
  EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    AND (has_table_privilege(current_user, c.oid, 'INSERT') OR has_table_privilege(current_user, c.oid, 'UPDATE')
      OR has_table_privilege(current_user, c.oid, 'DELETE') OR has_table_privilege(current_user, c.oid, 'TRUNCATE')
      OR has_table_privilege(current_user, c.oid, 'REFERENCES') OR has_table_privilege(current_user, c.oid, 'TRIGGER'))) AS any_table_write,
  bool_and(has_table_privilege(current_user, t.name, 'SELECT')) AS can_select,
  bool_or(has_table_privilege(current_user, t.name, 'INSERT')) AS can_insert,
  bool_or(has_table_privilege(current_user, t.name, 'UPDATE')) AS can_update,
  bool_or(has_table_privilege(current_user, t.name, 'DELETE')) AS can_delete,
  bool_or(has_table_privilege(current_user, t.name, 'TRUNCATE')) AS can_truncate,
  bool_or(has_table_privilege(current_user, t.name, 'REFERENCES')) AS can_references,
  bool_or(has_table_privilege(current_user, t.name, 'TRIGGER')) AS can_trigger
FROM pg_roles r CROSS JOIN (VALUES ('"Organization"'), ('"User"'), ('"Customer"'), ('"Subscription"'), ('"UsageEvent"'), ('"Invoice"'), ('"BillingRecord"'), ('"BillingRecordSnapshot"'), ('"BillingRecordVersion"'), ('"BillingRecordAdjustment"'), ('"BillingFinalizationRequest"'), ('"BillingRevisionRequest"'), ('"WebhookEndpoint"'), ('"WebhookEvent"'), ('"WebhookDelivery"'), ('"BillingWebhookWork"'), ('"BillingWebhookReplay"'), ('"_prisma_migrations"')) t(name)
WHERE r.rolname = current_user GROUP BY r.oid, r.rolconfig, r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolreplication, r.rolbypassrls`;

export const INVENTORY_SQL = `SELECT o.id AS org_id,
  (SELECT count(*) FROM "Customer" c WHERE c."orgId" = o.id) AS customers,
  (SELECT count(*) FROM "Customer" c WHERE c."orgId" = o.id AND c.active) AS active_customers,
  (SELECT count(*) FROM "Subscription" s WHERE s."orgId" = o.id) AS subscriptions,
  (SELECT count(*) FROM "Subscription" s WHERE s."orgId" = o.id AND (s."externalCustomerId" IS NULL OR btrim(s."externalCustomerId") = '')) AS subscription_missing,
  (SELECT count(*) FROM "Subscription" s WHERE s."orgId" = o.id AND EXISTS (SELECT 1 FROM "User" u WHERE u.id = s."externalCustomerId")) AS subscription_user_id,
  (SELECT count(*) FROM "Subscription" s WHERE s."orgId" = o.id AND s."externalCustomerId" IS NOT NULL AND btrim(s."externalCustomerId") <> '' AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = s."externalCustomerId")) AS subscription_unverified,
  (SELECT count(*) FROM "UsageEvent" e WHERE e."orgId" = o.id) AS usage_events,
  (SELECT count(*) FROM "UsageEvent" e WHERE e."orgId" = o.id AND e."customerId" IS NULL) AS event_missing,
  (SELECT count(*) FROM "UsageEvent" e WHERE e."orgId" = o.id AND e."customerId" IS NOT NULL AND btrim(e."customerId") = '') AS event_blank,
  (SELECT count(*) FROM "UsageEvent" e WHERE e."orgId" = o.id AND EXISTS (SELECT 1 FROM "User" u WHERE u.id = e."customerId")) AS event_user_id,
  (SELECT count(*) FROM "UsageEvent" e WHERE e."orgId" = o.id AND e."customerId" IS NOT NULL AND btrim(e."customerId") <> '' AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = e."customerId")) AS event_unverified,
  (SELECT count(*) FROM "UsageEvent" e WHERE e."orgId" = o.id AND e."billingTreatment" = 'LEGACY') AS legacy_events,
  (SELECT count(*) FROM "UsageEvent" e WHERE e."orgId" = o.id AND e."billingTreatment" = 'LEGACY' AND e."billedCustomerId" IS NOT NULL) AS legacy_with_customer_link,
  (SELECT count(*) FROM "UsageEvent" e WHERE e."orgId" = o.id AND e."billingTreatment" = 'LEDGER_ONLY') AS ledger_only_events,
  (SELECT count(*) FROM "UsageEvent" e WHERE e."orgId" = o.id AND e."billingTreatment" = 'LEDGER_ONLY' AND e."billedCustomerId" IS NULL) AS ledger_missing_customer,
  (SELECT count(*) FROM "Invoice" i WHERE i."orgId" = o.id) AS invoices,
  (SELECT coalesce(sum(i.amount),0) FROM "Invoice" i WHERE i."orgId" = o.id) AS invoice_amount,
  (SELECT count(*) FROM (SELECT i."subscriptionId", i."periodStart", i."periodEnd" FROM "Invoice" i WHERE i."orgId" = o.id GROUP BY 1,2,3 HAVING count(*) > 1) d) AS duplicate_invoice_period_groups,
  (SELECT count(*) FROM "BillingRecord" b WHERE b."orgId" = o.id) AS billing_records,
  (SELECT count(*) FROM "WebhookEvent" w WHERE w."orgId" = o.id) AS webhook_events,
  (SELECT count(*) FROM "BillingWebhookReplay" r WHERE r."orgId" = o.id) AS webhook_replays
FROM "Organization" o ORDER BY o.id`;

const independentSql = `SELECT kind, org_id, count(*)::text AS n FROM (
  SELECT 'customers' AS kind, "orgId" AS org_id FROM "Customer" UNION ALL
  SELECT 'subscriptions', "orgId" FROM "Subscription" UNION ALL
  SELECT 'usage_events', "orgId" FROM "UsageEvent" UNION ALL
  SELECT 'invoices', "orgId" FROM "Invoice" UNION ALL
  SELECT 'billing_records', "orgId" FROM "BillingRecord" UNION ALL
  SELECT 'webhook_events', "orgId" FROM "WebhookEvent" UNION ALL
  SELECT 'webhook_replays', "orgId" FROM "BillingWebhookReplay"
) rows GROUP BY kind, org_id`;

const evidenceSql = `SELECT
  (SELECT count(*) FROM "BillingRecordSnapshot") AS billing_snapshots,
  (SELECT count(*) FROM "BillingRecordVersion") AS billing_versions,
  (SELECT coalesce(sum(amount),0)::text FROM "BillingRecordVersion") AS billing_version_amount,
  (SELECT count(*) FROM "BillingRecordAdjustment") AS billing_adjustments,
  (SELECT count(*) FROM "BillingFinalizationRequest") AS finalization_requests,
  (SELECT count(*) FROM "BillingRevisionRequest") AS revision_requests,
  (SELECT count(*) FROM "WebhookEndpoint") AS webhook_endpoints,
  (SELECT count(*) FROM "BillingWebhookWork") AS webhook_work,
  (SELECT count(*) FROM "WebhookDelivery") AS webhook_deliveries`;

const fields = ['customers','active_customers','subscriptions','subscription_missing','subscription_user_id','subscription_unverified','usage_events','event_missing','event_blank','event_user_id','event_unverified','legacy_events','legacy_with_customer_link','ledger_only_events','ledger_missing_customer','invoices','invoice_amount','duplicate_invoice_period_groups','billing_records','webhook_events','webhook_replays'];
function integer(value, label) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw Error(`Invalid nonnegative integer: ${label}`);
  return n;
}
export function reconcile(rows, independent) {
  const byOrg = new Map();
  for (const row of rows) {
    const result = Object.fromEntries(fields.map(key => [key, integer(row[key], key)]));
    if (result.subscription_missing + result.subscription_user_id + result.subscription_unverified !== result.subscriptions) throw Error('Subscription identifier categories do not partition all rows');
    if (result.event_missing + result.event_blank + result.event_user_id + result.event_unverified !== result.usage_events) throw Error('Event identifier categories do not partition all rows');
    if (result.legacy_events + result.ledger_only_events !== result.usage_events || result.ledger_missing_customer) throw Error('Billing treatment categories are inconsistent');
    if (result.active_customers > result.customers || result.legacy_with_customer_link > result.legacy_events) throw Error('Customer classification exceeds its population');
    byOrg.set(row.org_id, result);
  }
  for (const row of independent) {
    if (!byOrg.has(row.org_id) || byOrg.get(row.org_id)[row.kind] !== integer(row.n, row.kind)) throw Error(`Independent ${row.kind} count mismatch`);
  }
  for (const [id, counts] of byOrg) for (const kind of ['customers','subscriptions','usage_events','invoices','billing_records','webhook_events','webhook_replays']) {
    if (counts[kind] && !independent.some(row => row.org_id === id && row.kind === kind)) throw Error(`Independent ${kind} count missing`);
  }
  return {
    organizationCount: byOrg.size,
    totals: Object.fromEntries(fields.map(key => [key, [...byOrg.values()].reduce((n, row) => n + row[key], 0)])),
    organizations: [...byOrg].map(([id, counts]) => ({ organizationRef: createHash('sha256').update(id).digest('hex').slice(0, 16), ...counts })),
    classification: 'Raw identifiers remain unmapped. LEGACY events, including those with a customer link, remain excluded from Customer billing. Subscription.externalCustomerId is never evidence of a billed Customer.',
  };
}

export async function run(db, manifest, archive, expectedMigrations) {
  const backup = checkManifest(manifest, archive);
  await db.connect();
  let begun = false;
  try {
    await db.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY'); begun = true;
    await db.query("SET LOCAL statement_timeout = '30s'");
    await db.query("SET LOCAL lock_timeout = '2s'");
    verifyRole((await db.query(ROLE_SQL)).rows[0], manifest);
    const migrationRows = (await db.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"')).rows;
    const migrations = verifyMigrations(expectedMigrations, migrationRows);
    const columns = (await db.query('SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = \'public\'')).rows;
    for (const [table, column] of requiredColumns) if (!columns.some(x => x.table_name === table && x.column_name === column)) throw Error(`Current schema column missing: ${table}.${column}`);
    const rows = (await db.query(INVENTORY_SQL)).rows;
    const independent = (await db.query(independentSql)).rows;
    const inventory = reconcile(rows, independent);
    const evidenceRow = (await db.query(evidenceSql)).rows[0];
    if (!evidenceRow) throw Error('Billing and webhook evidence counts unavailable');
    const evidence = Object.fromEntries(Object.entries(evidenceRow).map(([key, value]) => [key, key === 'billing_version_amount' ? value : integer(value, key)]));
    return { generatedAt: new Date().toISOString(), restoreId: manifest.restoreId, backup, migrations, role: { name: manifest.readOnlyRole, selectOnly: true, transactionReadOnly: true }, inventory, evidence };
  } finally {
    try { if (begun) await db.query('ROLLBACK'); } finally { await db.end(); }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const manifestPath = process.argv[2];
    if (!manifestPath || !process.env.INVENTORY_DATABASE_URL) throw Error('Usage: INVENTORY_DATABASE_URL=<loopback read-only URL> npm run reconcile:current-restore -- <private-manifest.json>');
    localUrl(process.env.INVENTORY_DATABASE_URL);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const archive = await inspectArchive(manifest.backupPath);
    checkManifest(manifest, archive);
    const { Client } = await import('pg');
    const db = new Client({ connectionString: process.env.INVENTORY_DATABASE_URL, application_name: 'usageflow-current-restore-reconciliation', options: '-c default_transaction_read_only=on' });
    console.log(JSON.stringify(await run(db, manifest, archive, await localMigrations()), null, 2));
  } catch (error) {
    console.error(`Reconciliation refused: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
