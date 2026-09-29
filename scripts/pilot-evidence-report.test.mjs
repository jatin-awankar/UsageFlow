import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

function reportFixture(edit) {
 const root=mkdtempSync(join(tmpdir(),'pilot-report-'));
 const run='12345678-abc', dir=join(root,run);mkdirSync(dir);
 const data={runId:run,commit:'a'.repeat(40),startedAt:'2026-09-29T00:00:00Z',endedAt:'2026-09-29T00:01:00Z',countPerScenario:1,failures:[],scenarios:Object.fromEntries(['baseline','worker-stop','worker-crash','redis-job-loss','redis-outage'].map(name=>[name,{sample:{attempted:1,committedOriginals:1},journalExpected:{count:1},recoverySeconds:1,fullReconciliationSeconds:2,failures:[]}]))};
 edit(data,dir);
 writeFileSync(join(dir,'fault-evidence.json'),JSON.stringify(data));
 const result=spawnSync(process.execPath,['scripts/pilot-evidence-report.mjs'],{env:{...process.env,PILOT_EVIDENCE_DIR:root},encoding:'utf8'});
 const report=JSON.parse(readFileSync(join(root,'combined-report.json')));
 rmSync(root,{recursive:true,force:true});return {result,report};
}

test('missing fault scenario fails the report check',()=>{
 const {report}=reportFixture(data=>{delete data.scenarios['worker-crash']});
 assert.equal(report.check.status,'fail');
 assert.match(report.check.problems.join(' '),/missing worker-crash scenario/);
});

test('failed run remains present with its sample and failure',()=>{
 const {report}=reportFixture(data=>{data.failures=['injected fault timed out']});
 assert.equal(report.runs.length,1);
 assert.deepEqual(report.runs[0].failures,['injected fault timed out']);
 assert.equal(report.runs[0].scenarios.baseline.sample.attempted,1);
});

test('failed run with an omitted fault scenario fails the report check',()=>{
 const {report}=reportFixture(data=>{data.failures=['worker timed out'];delete data.scenarios['worker-crash']});
 assert.match(report.check.problems.join(' '),/missing worker-crash scenario/);
});

test('completed run with a hash but no journal filename fails artifact verification',()=>{
 const {report}=reportFixture(data=>{data.journal={sha256:'a'.repeat(64),bytes:10}});
 assert.match(report.check.problems.join(' '),/missing journal artifact filename/);
});

test('priced usage reconciles quantity independently of rated money',()=>{
 const root=mkdtempSync(join(tmpdir(),'pilot-priced-'));
 const id='87654321-def', dir=join(root,id);mkdirSync(dir);
 const data={mode:'--volume',runId:id,startedAt:'2026-09-29T00:00:00Z',endedAt:'2026-09-29T00:01:00Z',failures:[],requested:{distinctEvents:2},achieved:{uniquePersistedEvents:2,resolvedCommittedOriginals:2},totals:{expectedQuantity:3,rawQuantity:3,projectedQuantity:3,ratedQuantity:3,ratedAmount:6,expectedRatedAmount:6,primaryCustomerCount:2}};
 writeFileSync(join(dir,'volume-evidence.json'),JSON.stringify(data));
 spawnSync(process.execPath,['scripts/pilot-evidence-report.mjs'],{env:{...process.env,PILOT_EVIDENCE_DIR:root},encoding:'utf8'});
 const report=JSON.parse(readFileSync(join(root,'combined-report.json')));
 rmSync(root,{recursive:true,force:true});
 assert.doesNotMatch(report.check.problems.join(' '),/quantity reconciliation difference/);
});

test('failed volume run still reports its quantity discrepancy',()=>{
 const root=mkdtempSync(join(tmpdir(),'pilot-failed-volume-'));
 const id='abcdef12-345', dir=join(root,id);mkdirSync(dir);
 const data={mode:'--volume',runId:id,startedAt:'2026-09-29T00:00:00Z',endedAt:'2026-09-29T00:01:00Z',failures:['sender HTTP 500'],requested:{distinctEvents:2},achieved:{uniquePersistedEvents:2,resolvedCommittedOriginals:2},totals:{expectedQuantity:3,rawQuantity:2,projectedQuantity:2,ratedQuantity:2,ratedAmount:4,primaryCustomerCount:2}};
 writeFileSync(join(dir,'volume-evidence.json'),JSON.stringify(data));
 spawnSync(process.execPath,['scripts/pilot-evidence-report.mjs'],{env:{...process.env,PILOT_EVIDENCE_DIR:root},encoding:'utf8'});
 const report=JSON.parse(readFileSync(join(root,'combined-report.json')));
 rmSync(root,{recursive:true,force:true});
 assert.match(report.check.problems.join(' '),/quantity reconciliation difference/);
});
