import assert from 'node:assert/strict';
import test from 'node:test';
import { checkManifest, localUrl, reconcile, run, verifyMigrations, verifyRole, INVENTORY_SQL } from './reconcile-current-restore.mjs';

const manifest = {
  kind: 'usageflow-isolated-production-restore', isolated: true,
  sourceEvidence: 'private operator capture record', restoreEvidence: 'private restore log',
  sourceCapturedAt: '2026-10-01T12:00:00Z', archiveCreatedAt: '2026-10-01 12:00:00 UTC',
  backupPath: '/private/copy.dump', backupSha256: 'a'.repeat(64),
  database: 'usageflow_restore_20261001', readOnlyRole: 'usageflow_inventory', restoreId: 'example-restore',
};

test('preflight requires recent source evidence, archive integrity, and isolation', () => {
  const archive = { sha256: 'a'.repeat(64), createdAt: manifest.archiveCreatedAt };
  assert.equal(checkManifest(manifest, archive, new Date('2026-10-02T12:00:00Z')).ageHours, 24);
  assert.throws(() => checkManifest({ ...manifest, isolated: false }, archive, new Date('2026-10-02T12:00:00Z')), /isolated/);
  assert.throws(() => checkManifest(manifest, { ...archive, sha256: 'b'.repeat(64) }, new Date('2026-10-02T12:00:00Z')), /SHA-256/);
  assert.throws(() => checkManifest(manifest, archive, new Date('2026-10-04T12:00:00Z')), /48-hour/);
  assert.throws(() => localUrl('postgresql://inventory:secret@db.example.com/copy'), /loopback/);
  assert.throws(() => localUrl('postgresql://inventory:secret@127.0.0.1/copy?host=db.example.com'), /options/);
  assert.equal(localUrl('postgresql://inventory:secret@127.0.0.1/copy').hostname, '127.0.0.1');
});

test('migration state must match every repository migration checksum', () => {
  const expected = [{ name: 'one', checksum: 'abc' }];
  assert.deepEqual(verifyMigrations(expected, [{ migration_name: 'one', checksum: 'abc', finished_at: new Date(), rolled_back_at: null }]), { applied: 1, latest: 'one' });
  assert.throws(() => verifyMigrations(expected, [{ migration_name: 'one', checksum: 'bad', finished_at: new Date(), rolled_back_at: null }]), /checksum/);
  assert.throws(() => verifyMigrations(expected, []), /incomplete/);
  assert.throws(() => verifyMigrations(expected, [{ migration_name: 'extra', checksum: 'abc', finished_at: new Date(), rolled_back_at: null }]), /Unexpected/);
});

test('inventory role must be SELECT-only, without database or schema write privileges', () => {
  const role = { database: manifest.database, role: manifest.readOnlyRole, server_address: '127.0.0.1',
    transaction_read_only: 'on', default_transaction_read_only: 'on', role_default_read_only: true,
    superuser: false, create_db: false, create_role: false, replication: false, bypass_rls: false,
    db_create: false, db_temp: false, schema_create: false, any_table_write: false,
    can_select: true, can_insert: false, can_update: false, can_delete: false,
    can_truncate: false, can_references: false, can_trigger: false };
  assert.doesNotThrow(() => verifyRole(role, manifest));
  assert.throws(() => verifyRole({ ...role, can_update: true }, manifest), /SELECT only/);
  assert.throws(() => verifyRole({ ...role, db_temp: true }, manifest), /write-capable/);
  assert.throws(() => verifyRole({ ...role, any_table_write: true }, manifest), /write-capable/);
  assert.throws(() => verifyRole({ ...role, transaction_read_only: 'off' }, manifest), /read only/);
});

test('a write-capable role stops before inventory SQL and rolls back', async () => {
  const now = new Date();
  const currentManifest = { ...manifest, sourceCapturedAt: now.toISOString(), archiveCreatedAt: now.toISOString() };
  const calls = [];
  const db = {
    async connect() { calls.push('connect'); },
    async query(sql) {
      calls.push(sql);
      if (sql.includes('FROM pg_roles')) return { rows: [{ database: manifest.database, role: manifest.readOnlyRole,
        server_address: '127.0.0.1', transaction_read_only: 'on', default_transaction_read_only: 'on',
        role_default_read_only: true, can_select: true, can_insert: true }] };
      return { rows: [] };
    },
    async end() { calls.push('end'); },
  };
  await assert.rejects(run(db, currentManifest, { sha256: manifest.backupSha256, createdAt: now.toISOString() }, []), /SELECT only/);
  assert.equal(calls[1], 'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  assert.deepEqual(calls.slice(-2), ['ROLLBACK', 'end']);
  assert.ok(!calls.includes(INVENTORY_SQL));
});

test('current-schema counts partition ambiguous identifiers and exclude linked LEGACY rows', () => {
  const row = { org_id: 'private-org', customers: '1', active_customers: '1', subscriptions: '2',
    subscription_missing: '0', subscription_user_id: '2', subscription_unverified: '0',
    usage_events: '4', event_missing: '1', event_blank: '1', event_user_id: '1', event_unverified: '1',
    legacy_events: '3', legacy_with_customer_link: '1', ledger_only_events: '1', ledger_missing_customer: '0',
    invoices: '1', invoice_amount: '10', duplicate_invoice_period_groups: '0',
    billing_records: '1', webhook_events: '1', webhook_replays: '0' };
  const independent = ['customers','subscriptions','usage_events','invoices','billing_records','webhook_events'].map(kind => ({ kind, org_id: row.org_id, n: row[kind] }));
  const report = reconcile([row], independent);
  assert.equal(report.totals.legacy_with_customer_link, 1);
  assert.match(report.classification, /remain excluded/);
  assert.equal(report.organizations[0].organizationRef.length, 16);
  assert.ok(!JSON.stringify(report).includes(row.org_id));
  assert.doesNotMatch(INVENTORY_SQL, /s\."externalCustomerId"\s*=\s*e\."customerId"/);
  assert.throws(() => reconcile([{ ...row, event_unverified: '0' }], independent), /partition/);
  assert.throws(() => reconcile([row], independent.filter(x => x.kind !== 'invoices')), /Independent invoices count missing/);
});
