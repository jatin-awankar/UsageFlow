import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const [directory, runId, exitStatus] = process.argv.slice(2);
if (!/^[0-9a-f]{8}-[0-9a-f]{3}$/.test(runId || '')) throw Error('Invalid run ID');
const path = join(directory, 'restore-evidence.json');
let evidence;
try { evidence = JSON.parse(await readFile(path, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; evidence = { runId, failures: [] }; }
if (evidence.runId !== runId) throw Error('Run ID mismatch');
evidence.failures ||= [];
evidence.failures.push({ action: 'runner', at: new Date().toISOString(), exitStatus: Number(exitStatus), error: 'Restore runner exited before successful completion' });
evidence.ingestionRtoSeconds ??= null;
evidence.fullReconciliationRtoSeconds ??= null;
for (const [field, file] of [['journal', 'restore-journal.jsonl'], ['backup', 'postgres.dump']]) {
  try { const bytes = await readFile(join(directory, file)); evidence[field] = { file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; }
  catch (error) { if (error.code !== 'ENOENT') throw error; evidence[field] = { file, unavailable: 'artifact not created' }; }
}
await writeFile(path, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
