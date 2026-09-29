import { createHash } from 'node:crypto';
import { createReadStream, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const root = resolve(process.env.PILOT_EVIDENCE_DIR || '/tmp/usageflow-pilot-evidence');
const output = resolve(process.env.PILOT_REPORT_PATH || join(root, 'combined-report.json'));
const modes = ['volume', 'burst', 'fault', 'export', 'restore'];
const scenarios = ['baseline', 'worker-stop', 'worker-crash', 'redis-job-loss', 'redis-outage'];
const problems = [];
const fail = (run, message) => problems.push(`${run}: ${message}`);
const read = path => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; } };
const hash = path => new Promise((ok, bad) => { const h=createHash('sha256'); const s=createReadStream(path); s.on('data', x=>h.update(x)); s.on('error',bad); s.on('end',()=>ok({bytes:statSync(path).size,sha256:h.digest('hex')})); });
const status = (measured, pass) => measured == null ? 'unmeasured' : pass ? 'pass' : 'fail';
const sum = xs => xs.reduce((a,x)=>a+x,0);
function reconcile(run, label, values) { const [first,...rest]=values; if(values.some(x=>!Number.isFinite(x)) || rest.some(x=>x!==first)) fail(run, `${label} reconciliation difference: ${values.join('/')}`); }
function targetSummary(run) {
 const a=run?.achieved, t=run?.totals, l=run?.latency;
 return {
  organizationMonthly100000:{status:status(a?.uniquePersistedEvents,a?.uniquePersistedEvents>=100000 && !run.failures.length),measured:a?.uniquePersistedEvents??null,denominator:100000},
  customerMonthly20000:{status:status(t?.primaryCustomerCount,t?.primaryCustomerCount>=20000 && !run.failures.length),measured:t?.primaryCustomerCount??null,denominator:20000},
  burst10PerSecond:{status:run.mode==='--burst'?status(a?.acceptedUniquePerSecond,a?.acceptedUniquePerSecond>=10 && !run.failures.length):'unmeasured',measured:run.mode==='--burst'?a?.acceptedUniquePerSecond??null:null,denominator:10,durationSeconds:run.requested?.burstDurationSeconds??null},
  processingWithin60Seconds:{status:status(l?.bothWithin60SecondsFraction,l?.bothWithin60SecondsFraction===1 && !run.failures.length),measured:l?.bothWithin60Seconds??null,denominator:l?.projectedAtMinusReceivedAt?.denominator??null},
  ingestionRestorationWithin4Hours:{status:'unmeasured',measured:null,denominator:14400}
 };
}
async function artifacts(dir, evidence, runId, exportEvidence) {
 const result={};
 for(const f of readdirSync(dir).filter(x=>/journal\.jsonl$|postgres\.dump$|export-rows\.jsonl$|evidence\.json$/.test(x))){
  const actual=await hash(join(dir,f));
  let declared;
  if(f.includes('journal')) declared=evidence?.journal;
  if(f==='postgres.dump') declared=evidence?.backup;
  if(f==='export-rows.jsonl') declared=exportEvidence?.rowsSha256?{bytes:exportEvidence.rowsBytes,sha256:exportEvidence.rowsSha256}:undefined;
  const match=declared?.sha256 ? declared.sha256===actual.sha256 && declared.bytes===actual.bytes : null;
  if(match===false) fail(runId,`${f} hash or byte length mismatch`);
  if(match===null && evidence?.endedAt && (f.includes('journal')||f==='postgres.dump'||f==='export-rows.jsonl')) fail(runId,`${f} missing declared hash`);
  result[f]={...actual,declaredSha256:declared?.sha256??null,verified:match};
 }
 return result;
}
const runs=[];
for(const id of readdirSync(root).sort()) {
 if(!/^[0-9a-f]{8}-[0-9a-f]{3}$/.test(id)) continue;
 const dir=join(root,id); if(!statSync(dir).isDirectory())continue;
 const files=readdirSync(dir), primary=files.find(x=>['volume-evidence.json','burst-evidence.json','fault-evidence.json','export-load-evidence.json','restore-evidence.json'].includes(x));
 const data=primary?read(join(dir,primary)):null, exportData=files.includes('export-evidence.json')?read(join(dir,'export-evidence.json')):null;
 const mode=primary?.replace('-load-evidence.json','').replace('-evidence.json','') || (files.some(x=>x.includes('fault'))?'fault':files.some(x=>x.includes('restore'))?'restore':files.some(x=>x.includes('sender-journal'))?'unknown':'setup');
 const failures=[...(data?.failures||[])];
 if(!primary) failures.push('No completed evidence report; interrupted setup or run');
 if(primary && !data) failures.push('Evidence JSON cannot be parsed');
 if(primary && !data?.endedAt) failures.push('Interrupted run: no completion timestamp');
 if(['volume','burst','export'].includes(mode) && data?.endedAt && (!Number.isFinite(data.totals?.expectedQuantity)||!Number.isFinite(data.totals?.projectedQuantity))) failures.push('Legacy evidence lacks complete quantity reconciliation');
 if(mode==='fault' && data?.scenarios && scenarios.some(name=>data.scenarios[name] && !data.scenarios[name].sample?.attempted)) failures.push('Incomplete fault scenario or sample');
 const run={id,mode,command:mode==='setup'||mode==='unknown'?null:`npm run test:pilot-evidence -- --${mode==='fault'?'faults':mode}`,commit:data?.environment?.commit||data?.commit||data?.versions?.applicationCommit||null,startedAt:data?.startedAt||statSync(dir).birthtime.toISOString(),endedAt:data?.endedAt||null,configuration:data?.environment|| (data?.versions ? {versions:data.versions,hostLimits:'unmeasured in this retained run',queueAndNetwork:'local synthetic Docker; exact placement unmeasured'} : null),failures,artifacts:{},targets:null};
 run.artifacts=await artifacts(dir,data,id,exportData);
 if(data?.endedAt){
  for(const artifact of [data.journal?.file, data.backup?.file, exportData?.rowsFile].filter(Boolean)) {
   if(artifact!==basename(artifact)) fail(id,`unsafe declared artifact path ${artifact}`);
   else if(!run.artifacts[artifact]) fail(id,`missing declared artifact ${artifact}`);
  }
  if(['volume','burst','export','fault','restore'].includes(mode) && !data.journal?.sha256) fail(id,'missing journal hash');
  if(mode==='restore' && !data.backup?.sha256) fail(id,'missing backup hash');
 }
 if(mode==='volume'||mode==='burst'||mode==='export') {
  Object.assign(run,{requested:data?.requested??null,achieved:data?.achieved??null,latency:data?.latency??null,totals:data?.totals??null,backlogAtSendEnd:data?.backlogAtSendEnd??null,finalBacklog:data?.finalBacklog??null});
  run.targets=targetSummary(data);
  if(data?.totals && !failures.length) { const q=data.totals; reconcile(id,'quantity', [q.expectedQuantity,q.rawQuantity,q.projectedQuantity,q.ratedQuantity,q.ratedAmount]); }
  if(data?.achieved?.resolvedCommittedOriginals!=null && !failures.length && data.achieved.resolvedCommittedOriginals!==data.achieved.uniquePersistedEvents) fail(id,'original ID count differs from persisted count');
  if(mode==='export') {
   run.export=exportData?{creationMs:exportData.creationMs,paginationMs:exportData.paginationMs,pages:exportData.pages,rowCount:exportData.rowCount,uniqueIds:exportData.uniqueIds,httpErrors:exportData.httpErrors,failures:exportData.failures,acceptedDuringCreation:exportData.acceptedDuringCreation,concurrentIncluded:exportData.concurrentIncluded,concurrentExcluded:exportData.concurrentExcluded,rating:exportData.rating,snapshotTotals:exportData.snapshotTotals,groupedTotals:exportData.groupedTotals,rowsHash:run.artifacts['export-rows.jsonl']??null}:null;
   if(!exportData && !failures.length) fail(id,'missing export scenario');
   if(exportData && !failures.length) {
    if(exportData.failures?.length||exportData.httpErrors?.length) fail(id,'export failed');
    reconcile(id,'export rows',[exportData.rowCount,exportData.uniqueIds,exportData.ids?.length]);
    if(exportData.acceptedDuringCreation!==exportData.concurrentIncluded+exportData.concurrentExcluded) fail(id,'unexplained concurrent export count');
    if(exportData.rating?.ratedAmount!==exportData.rating?.expectedAmount) fail(id,'export rating difference');
   }
  }
  if(data && !failures.length && (!data.journal?.sha256||!data.environment?.commit)) fail(id,'missing journal hash or commit');
 }
 if(mode==='fault') {
  run.samplePerScenario=data?.countPerScenario??null;run.scenarios={};
  for(const name of scenarios){const s=data?.scenarios?.[name]; if(s?.failures?.length) failures.push(...s.failures.map(x=>`${name}: ${x}`));run.scenarios[name]=s?{sample:s.sample??null,expected:s.journalExpected??null,workerQueueRecoverySeconds:s.faultToDrainSeconds??s.recoverySeconds??null,fullReconciliationSeconds:s.fullReconciliationSeconds??null,timedOut:s.timedOut??null,queueDrainedAtFinal:s.queueDrainedAtFinal??null,faultAt:s.faultAt??null,recoveryStartedAt:s.recoveryStartedAt??null,recoveryEndedAt:s.recoveryEndedAt??null,checkpoints:s.checkpoints?.map(c=>({at:c.at,name:c.name,totals:c.totals,backlog:c.backlog,queue:c.queue,failures:c.failures}))??null,failures:s.failures??[]}:null;
   if(data&&!failures.length&&!s)fail(id,`missing ${name} scenario`);
   if(s&&!failures.length){if(!s.sample?.attempted)fail(id,`${name} missing sample size`);if(s.timedOut===true && Number.isFinite(s.fullReconciliationSeconds))fail(id,`${name} timeout has finite recovery`);if(!Number.isFinite(s.recoverySeconds)&&!Number.isFinite(s.faultToDrainSeconds)&&s.timedOut!==true)fail(id,`${name} missing recovery status`);if(s.journalExpected?.count!=null && s.journalExpected.count!==s.sample?.committedOriginals)fail(id,`${name} reconciliation difference`);}
  }
 }
 if(mode==='restore'){
  const pre=data?.preReplay,post=data?.postReplay,c=pre?.classifications;
  run.sample={acceptedOriginalIds:(c?.survived?.length??0)+(c?.absent?.length??0)+(c?.unresolved?.length??0),preReplayAbsent:c?.absent?.length??null};
  run.recovery={backupGapSeconds:pre?.backupGapSeconds??null,preReplay:{survivedOriginalIds:c?.survived??null,absentOriginalIds:c?.absent??null,unresolvedOriginalIds:c?.unresolved??null,absentOriginalCount:pre?.absentOriginalCount??null,absentOriginalQuantity:pre?.absentOriginalQuantity??null,oldestAbsentAcceptanceToOutageSeconds:pre?.oldestAbsentAcceptanceToOutageSeconds??null},postReplay:{remainingOriginalIdLoss:post?.remainingOriginalIdLoss??null,replacementIds:post?.replayCreatedReplacementIds??null,replayedQuantity:post?.replayedQuantity??null,unrecoveredQuantity:post?.unrecoveredQuantity??null},ingestionRtoSeconds:data?.ingestionRtoSeconds??null,fullReconciliationRtoSeconds:data?.fullReconciliationRtoSeconds??null,timeoutOrFailure:failures.length?failures:'none',commands:data?.commands??null,versions:data?.versions??null,writesPaused:data?.writesPaused??null,clocks:data?.clocks??null};
  run.targets={organizationMonthly100000:{status:'unmeasured'},customerMonthly20000:{status:'unmeasured'},burst10PerSecond:{status:'unmeasured'},processingWithin60Seconds:{status:'unmeasured'},ingestionRestorationWithin4Hours:{status:status(data?.ingestionRtoSeconds,data?.ingestionRtoSeconds<=14400&&!failures.length),measured:data?.ingestionRtoSeconds??null,denominator:14400}};
  if(data&&!failures.length){
   if(!c || !Array.isArray(c.survived)||!Array.isArray(c.absent)||!Array.isArray(c.unresolved)) fail(id,'missing original ID classifications');
   else {const all=[...c.survived,...c.absent,...c.unresolved];if(all.some(x=>!x.originalId||!x.key||!Number.isFinite(x.quantity))||new Set(all.map(x=>x.key)).size!==all.length)fail(id,'incomplete or duplicate original ID classifications');reconcile(id,'pre-replay loss count',[c.absent.length,pre.absentOriginalCount]);reconcile(id,'pre-replay loss quantity',[sum(c.absent.map(x=>x.quantity)),pre.absentOriginalQuantity]);if(c.absent.length && post?.remainingOriginalIdLoss?.length===0)fail(id,'unsupported zero original-ID loss claim');}
   if(!Number.isFinite(data.ingestionRtoSeconds)||!Number.isFinite(data.fullReconciliationRtoSeconds))fail(id,'missing RTO or timeout status');
   if(post){reconcile(id,'post-replay count',[post.expectedCount,post.rawCount,post.projectedCount,post.ratedCount]);reconcile(id,'post-replay quantity',[post.expectedQuantity,post.rawQuantity,post.projectedQuantity,post.ratedQuantity,post.ratedAmount]);if(post.remainingOriginalIdLoss?.length!==c?.absent?.length)fail(id,'post-replay original ID loss differs from pre-replay absence');if(post.unrecoveredQuantity===0&&post.replayedQuantity!==pre.absentOriginalQuantity)fail(id,'zero unrecovered quantity unsupported by replay');}
  }
 }
 runs.push(run);
}
for(const mode of modes)if(!runs.some(x=>x.mode===mode))fail('inventory',`missing ${mode} run`);
if(!runs.some(x=>x.mode==='fault'&&scenarios.every(s=>x.scenarios?.[s])))fail('inventory','no fault run contains all scenarios');
const report={schemaVersion:1,generatedAt:new Date().toISOString(),sourceRoot:root,scope:'Retained local synthetic runs only; no production guarantee or pilot gate change',runCount:runs.length,check:{status:problems.length?'fail':'pass',problems},runs};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(`Pilot evidence report: ${output}`);console.log(`${runs.length} runs (${runs.filter(x=>x.failures.length).length} failed/incomplete); report check ${report.check.status.toUpperCase()}`);
for(const p of problems)console.error(p);
if(problems.length)process.exitCode=1;
