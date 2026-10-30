// Isolated asynchronous Electron CASE pool. No installation/build/ledger writes in workers.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {availableParallelism,freemem} from 'node:os';
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {IMPLEMENTED,loadCases} from './registry.mjs';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
export function selectBatch(cases,plan,batch,handlers=IMPLEMENTED){
  assert.equal(cases.length,250,'Original 250 CASE ledger required');
  assert.equal(new Set(cases.map(x=>x.id)).size,250);
  const spec=plan.batches[batch];assert.ok(spec,'Unknown batch');
  const members=cases.filter(r=>r.priority==='P1'&&!plan.excluded.includes(r.id)&&
    (spec.ids?.includes(r.id)||(spec.groups?.includes(r.id.split('-')[0])&&!(spec.excludeIds??[]).includes(r.id))));
  const selected=members.filter(r=>r.electronUi==='NOT_RUN');
  for(const r of selected)assert.ok(handlers[r.id],'Unregistered CASE '+r.id);
  assert.ok(selected.length<=spec.maxPending,'Batch exceeds frozen limit');
  return {selected,skipped:members.filter(r=>r.electronUi!=='NOT_RUN').map(r=>({id:r.id,status:r.electronUi})),spec};
}
export async function pool(items,workers,fn){
  let next=0;const results=new Array(items.length);
  await Promise.all(Array.from({length:Math.min(workers,items.length)},async()=>{
    while(next<items.length){const index=next++;results[index]=await fn(items[index],index);}
  }));return results;
}
export function workerLimit(requested,{cpus=availableParallelism(),memory=freemem()}={}){
  assert.ok(Number.isInteger(requested)&&requested>=1&&requested<=4,'workers must be 1..4');
  let cap=cpus<4?2:4;if(memory<3*1024**3)cap=2;else if(memory<5*1024**3)cap=Math.min(cap,3);
  return Math.min(requested,cap);
}
function scripts(){return Object.fromEntries(readdirSync('tools/validation/v077',{recursive:true}).filter(p=>/\.(mjs|cjs)$/.test(p)).sort().map(p=>[p,hash(join('tools/validation/v077',p))]));}
function asyncChild(cmd,args,options={}){
  return new Promise(resolveChild=>{
    let stdout='',stderr='',timedOut=false,error=null;
    const child=spawn(cmd,args,{...options,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});
    const kill=()=>{try{if(process.platform!=='win32')process.kill(-child.pid,'SIGKILL');else child.kill('SIGKILL');}catch{}};
    const timer=setTimeout(()=>{timedOut=true;kill();},180000);
    child.stdout.on('data',b=>{if(stdout.length<4*1024*1024)stdout+=b;});
    child.stderr.on('data',b=>{if(stderr.length<4*1024*1024)stderr+=b;});
    child.on('error',e=>{error=String(e);});
    child.on('close',(code,signal)=>{clearTimeout(timer);kill();resolveChild({code,signal,timedOut,error,stdout,stderr});});
  });
}
export function classify(real,execution){
  if(execution.error||execution.timedOut||!real||real.cleanupError)return 'TEST_INFRA';
  if(real.status==='PASS')return execution.code===0&&real.layer==='electronUi'&&real.steps?.length&&real.evidence?.length?'PASS':'TEST_INFRA';
  if(real.status==='BLOCKED')return 'BLOCKED';
  // Assertion failures remain unclassified until reviewed against logs/UI/data.
  return 'TEST_INFRA';
}
async function main(){
  const [command='list',...args]=process.argv.slice(2);assert.ok(['list','run'].includes(command));
  for(let i=0;i<args.length;i+=2)assert.ok(['--batch','--workers'].includes(args[i])&&args[i+1],'Invalid option');
  const opt=(n,d)=>{const i=args.indexOf('--'+n);return i<0?d:args[i+1];};
  const batch=opt('batch','B1'),plan=json('docs/v077/P1-FIVE-BATCHES.json');
  const {selected,skipped,spec}=selectBatch(loadCases(),plan,batch);
  const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const workers=workerLimit(Number(opt('workers','4')));
  console.log(JSON.stringify({batch,sourceSha:sha,workers,selectedCount:selected.length,ids:selected.map(r=>r.id),skipped},null,2));
  if(command==='list')return;
  if(spec.windowsRequired)assert.equal(process.platform,'win32','True Windows environment required');
  const env=await asyncChild(process.execPath,['tools/validation/v077/environment.mjs','status']);
  const state=JSON.parse(env.stdout);assert.equal(state.dependencies,'REUSE');assert.equal(state.build.valid,true,'Prepare exactly once before workers');
  const gitStatus=()=>execFileSync('git',['status','--porcelain','--','tools/validation/v077','tests/fixtures','src','shared','electron'],{encoding:'utf8'}).trim();
  assert.equal(gitStatus(),'','Commit test harness before freezing execution');
  const hashes=scripts(),runId='P1-'+batch+'-'+new Date().toISOString().replace(/[:.]/g,'-');
  const root=resolve('validation-results/v077/runs',runId);mkdirSync(root,{recursive:true});
  const identity={sourceSha:sha,scriptHashes:hashes,build:json('validation-results/v077/cache/runtime-manifest.json'),planSha256:hash('docs/v077/P1-FIVE-BATCHES.json')};
  writeFileSync(join(root,'identity.json'),JSON.stringify(identity,null,2)+'\n');
  const failures=new Map();
  const rows=await pool(selected,workers,async item=>{
    const script=IMPLEMENTED[item.id];
    if((failures.get(script)??0)>=3)return {id:item.id,status:'NOT_RUN',classification:'NOT_RUN',reason:'Three consecutive infrastructure failures in handler; circuit open'};
    assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha,'Frozen SHA changed');
    assert.deepEqual(scripts(),hashes,'Frozen scripts changed');
    const dir=join(root,item.id);mkdirSync(dir,{recursive:true});
    const execution=await asyncChild(process.execPath,['--experimental-strip-types',resolve('tools/validation/v077',script),item.id,dir],{env:{...process.env,GANKSOFT_V077_CASE:item.id}});
    writeFileSync(join(dir,'console.log'),execution.stdout+'\nSTDERR:\n'+execution.stderr);
    let real=null;try{real=json(join(dir,'case.json'));assert.equal(real.id,item.id);}catch{real=null;}
    const classification=classify(real,execution);
    failures.set(script,classification==='TEST_INFRA'?(failures.get(script)??0)+1:0);
    const row={...(real??{id:item.id}),status:classification==='TEST_INFRA'?'NOT_RUN':real.status,classification,
      reason:classification==='TEST_INFRA'?'Needs infrastructure/product review; no automatic product FAIL':real?.reason,
      executionInputs:hashes,consolePath:join(dir,'console.log'),evidenceDirectory:dir,
      execution:{code:execution.code,signal:execution.signal,timedOut:execution.timedOut,error:execution.error}};
    writeFileSync(join(dir,'worker-result.json'),JSON.stringify(row,null,2)+'\n');
    console.log(item.id+': '+classification);return row;
  });
  assert.equal(new Set(rows.map(x=>x.id)).size,selected.length,'Duplicate final result');
  const count=k=>rows.filter(r=>r.classification===k).length;
  const summary={schema:'ganksoft.v077/automation-run-1',sourceSha:sha,platform:process.platform,runId,testLayer:'electronUi',
    batch,workers,planned:spec.maxPending,selectedCount:selected.length,actualExecuted:rows.filter(r=>r.execution).length,
    passed:count('PASS'),productFailure:count('PRODUCT_FAILURE'),testInfra:count('TEST_INFRA'),blocked:count('BLOCKED'),
    notRun:rows.filter(r=>r.status==='NOT_RUN').length,failed:count('PRODUCT_FAILURE'),
    worktree:{baselineSha:sha,gitStatus:gitStatus(),scriptHashes:hashes},resultDirectory:root,skipped,rows};
  writeFileSync(join(root,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  console.log('V077_E2E_REPORT='+join(root,'summary.json'));
  console.log(JSON.stringify({executed:summary.actualExecuted,pass:summary.passed,testInfra:summary.testInfra,blocked:summary.blocked,notRun:summary.notRun}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
