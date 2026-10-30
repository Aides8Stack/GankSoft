// Archive actual runs, preserve every failed attempt, update ONLY frozen T2-A P0 IDs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {moduleForCase} from './modules.mjs';
const files=process.argv.slice(2);assert.ok(files.length);
const base=JSON.parse(readFileSync('docs/v077/evidence/T2-REMAINING-BASELINE.json'));
const selected=new Set(base.cases.filter(x=>x.priority==='P0').map(x=>x.id));assert.equal(selected.size,35);
const sha256=b=>createHash('sha256').update(b).digest('hex');
const runs=[],latest=new Map(),attempts=[];
for(const file of files){
 const s=JSON.parse(readFileSync(file));assert.equal(s.testLayer,'electronUi');const root=resolve(file,'..');assert.ok(root.startsWith(resolve('validation-results/v077/runs')+'/'));
 for(const row of s.rows)assert.ok(selected.has(row.id));
 execFileSync(process.execPath,['tools/validation/v077/promote.mjs',file],{stdio:'pipe'});
 const archived=[];
 for(const row of s.rows){
  const dir=join(root,row.id),entries=readdirSync(dir).filter(n=>statSync(join(dir,n)).isFile());
  const index=entries.map(n=>{const b=readFileSync(join(dir,n));return {path:row.id+'/'+n,bytes:b.length,sha256:sha256(b)};});
  let d;try{d=JSON.parse(readFileSync(join(dir,'diagnostics.json')));}catch{}
  const record={...row};delete record.consolePath;delete record.feedbackTrace;delete record.executionInputs;
  record.runId=s.runId;record.sourceSha=s.sourceSha;record.module=moduleForCase(row.id).id;
  record.scriptContext=s.worktree?'per-case input hashes captured':'Uncommitted test worktree on unchanged production baseline; initial runs predate per-case hash instrumentation. Do not identify these scripts as committed in baseline SHA.';
  record.feedback=d?.uiTrace?.slice(-6)??[];
  record.database=d?.database?{sha256:sha256(JSON.stringify(d.database)),tableRows:Object.fromEntries(Object.entries(d.database.tables).map(([k,v])=>[k,v.length])),media:d.database.media}:null;
  if(row.status!=='PASS')record.failureUi=(()=>{try{return readFileSync(join(dir,'failure-ui.txt'),'utf8');}catch{return null;}})();
  if(row.id==='FAULT-05'&&row.status==='FAIL')record.failureDiagnostics=d;
  archived.push(record);attempts.push({...record,fileIndex:index});latest.set(row.id,record);
 }
 runs.push({runId:s.runId,sourceSha:s.sourceSha,worktree:s.worktree??null,counts:{selected:s.selectedCount,passed:s.passed,failed:s.failed,blocked:s.blocked},rows:archived});
}
assert.equal(latest.size,35);
const ledger=JSON.parse(readFileSync('docs/v077/E2E-RESULTS.json'));
for(const [id,row]of latest){const x=ledger.cases.find(x=>x.id===id);assert.equal(x.electronUi,row.status);x.lastAutomation.evidenceLocation='docs/v077/evidence/T2-A-RESULTS.json#'+id;x.lastAutomation.scriptContext=row.scriptContext;if(row.status==='BLOCKED')x.lastAutomation.followUp='T2-W-01; true Windows physical input required';}
const inherited=JSON.parse(execFileSync('git',['show',base.sourceSha+':docs/v077/E2E-RESULTS.json'],{encoding:'utf8'}));
for(const old of inherited.cases.filter(x=>x.electronUi!=='NOT_RUN'))assert.deepEqual(ledger.cases.find(x=>x.id===old.id),old,'INHERITED_RESULT_CHANGED: '+old.id);
ledger.note='2026-10-30 T2-A: only 35 baseline P0 pending cases updated; original41 PASS/2 FAIL preserved byte-for-byte at case level. Linux GUI results never attest Windows CI or real Windows. Unique status authority; remaining plan is generated from this ledger.';
writeFileSync('docs/v077/E2E-RESULTS.json',JSON.stringify(ledger,null,2)+'\n');
const filesNow=readdirSync('tools/validation/v077',{recursive:true}).filter(p=>/\.(mjs|cjs)$/.test(p));
const savedScriptHashes=Object.fromEntries(filesNow.sort().map(p=>[p,sha256(readFileSync(join('tools/validation/v077',p)))]));
const counts=rows=>Object.fromEntries(['PASS','FAIL','BLOCKED','NOT_RUN'].map(s=>[s,rows.filter(x=>(x.status??x.electronUi)===s).length]));
const evidence={schema:'ganksoft.v077/t2a-evidence-1',baselineSha:base.sourceSha,productionSource:'src/electron/shared/package/lock unchanged; verified reusable build from 0d0c072117dfed45f6463789fb289e2153a18409',testSourcePolicy:'New tests executed from worktree. finalSavedScriptHashes identify saved scripts, not retroactive tested commits. Per-case input hashes exist on later runs. All attempts and corrections retained.',finalSavedScriptHashes:savedScriptHashes,runs,final:[...latest.values()],selectedCounts:counts([...latest.values()]),ledgerCounts:counts(ledger.cases),original41Pass2FailUnchanged:true,windowsLayersTouched:false};
writeFileSync('docs/v077/evidence/T2-A-RESULTS.json',JSON.stringify(evidence,null,2)+'\n');
const infra=attempts.filter(x=>x.status!=='PASS'&&x.kind!=='PLATFORM_REQUIRED'&&x.id!=='FAULT-05').map(x=>({...x,classification:'TEST_INFRA',resolved:latest.get(x.id).status==='PASS',finalStatus:latest.get(x.id).status}));
writeFileSync('docs/v077/evidence/T2-A-INFRA-ATTEMPTS.json',JSON.stringify({schema:'ganksoft.v077/t2a-infra-attempts-1',attempts:infra,note:'Includes revision fixture, strict locator, stale read/epoch, sender security, unsupported extra placement fields and actual click timeout. All original failed receipts retained; no production fix.'},null,2)+'\n');
const inbox=JSON.parse(readFileSync('docs/v077/DEFECT-INBOX.json'));
if(!inbox.items.some(x=>x.id==='T2A-FAULT-05-STAGED-IMAGE')){const r=latest.get('FAULT-05');assert.equal(r.status,'FAIL');inbox.items.push({id:'T2A-FAULT-05-STAGED-IMAGE',issue:null,modules:['editor','media','reliability'],cases:['FAULT-05'],severity:'P0',status:'OBSERVED_NOT_TRIAGED',kind:'RESOURCE_LIFECYCLE',source:'Linux real Electron GUI + deterministic media.stage hold; source worktree on '+base.sourceSha,symptom:'Rejected asynchronous paste inserts no stale image and publishes no reference, but an unreferenced staged PNG/settings metadata survives independent PID restart. Needs I3 contract assessment; inventory tracks staged resource, so this is not an untracked-file or cross-card data-loss claim.',rootCause:null,fixSha:null,verification:'FAIL',observations:[{runId:r.runId,platform:'linux',sourceSha:base.sourceSha,evidence:'docs/v077/evidence/T2-A-RESULTS.json#FAULT-05'}]});}
writeFileSync('docs/v077/DEFECT-INBOX.json',JSON.stringify(inbox,null,2)+'\n');
console.log(JSON.stringify({selected:evidence.selectedCounts,ledger:evidence.ledgerCounts,attempts:attempts.length,infraAttempts:infra.length,failed:[...latest.values()].filter(x=>x.status!=='PASS').map(x=>({id:x.id,status:x.status,actual:x.actual.split('\n')[0]}))}));
