// Owner-authorized independent R1/R2/R3 runs. Never append attempts to old P1 batches.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,globSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {IMPLEMENTED,loadCases} from './registry.mjs';
import {pool,workerLimit,asyncChild,classify,scripts} from './p1-parallel.mjs';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const [command='list',checkpoint='R1',retry]=process.argv.slice(2);
assert.ok(['list','run'].includes(command)&&['R1','R2','R3','C1','C2'].includes(checkpoint));
const c1=['EDITOR-11','EDITOR-12','EDITOR-13','CLIP-10','PLAN-08','REVIEW-15','MEDIA-02','FAULT-11'];
const c2=['HOME-03','HOME-04','HOME-05','HOME-06','HOME-07','HOME-08','AN-02','AN-03','AN-04','AN-05','AN-08','SET-05','SET-06','SET-07','SET-08','SET-09','SET-10','SET-11'];
const r2=['CAT-07','NEW-08','PLAN-08','REVIEW-07','REVIEW-08','REVIEW-09','REVIEW-12','REVIEW-13','REVIEW-14','REVIEW-15','MEDIA-02','EX-13','BACK-09','FAULT-11'];
const b2=json('docs/v077/P1-FIVE-BATCHES.json').batches.B2;
const excluded=new Set(['BACK-14',...Array.from({length:9},(_,i)=>'WIN-0'+(i+1)),'NEW-13','CLIP-03','CLIP-09']);
const selected=loadCases().filter(r=>r.electronUi==='NOT_RUN'&&!excluded.has(r.id)&&
  (checkpoint==='C1'?c1.includes(r.id):checkpoint==='C2'?c2.includes(r.id):checkpoint==='R1'?r.priority==='P1'&&b2.groups.includes(r.id.split('-')[0]):checkpoint==='R2'?r2.includes(r.id):r.priority==='P2'&&['HOME','AN','SET'].includes(r.id.split('-')[0])));
for(const r of selected)assert.ok(IMPLEMENTED[r.id],r.id);
assert.ok(selected.length<=({R1:34,R2:14,R3:18,C1:8,C2:18})[checkpoint]);
console.log(JSON.stringify({checkpoint,count:selected.length,ids:selected.map(x=>x.id)},null,2));
if(command==='run'){
  // One new attempt per CASE per checkpoint, regardless of historical P1 retry state.
  const prior=globSync('validation-results/v077/runs/REMAINING-'+checkpoint+'-*/**/worker-result.json');
  const consumed=new Set(prior.map(p=>json(p).id));
  if(retry){
    assert.equal(retry,'--retry-infra');assert.ok(['C1','C2'].includes(checkpoint));
    assert.equal(globSync('validation-results/v077/runs/REMAINING-'+checkpoint+'-RETRY-*/summary.json').length,0,'Only one targeted retry');
    const reviews=globSync('validation-results/v077/runs/REMAINING-'+checkpoint+'-*/reviewed-summary.json').filter(p=>!p.includes('-RETRY-'));
    assert.equal(reviews.length,1);const rows=json(reviews[0]).rows;
    for(const item of selected){const row=rows.find(r=>r.id===item.id);assert.equal(row?.classification,'TEST_INFRA');assert.ok(row.reviewReason,'Independent infra diagnosis required');}
  }
  assert.ok(retry||!selected.some(x=>consumed.has(x.id)),'Independent checkpoint attempt already consumed; no unlimited retry');
  const state=JSON.parse((await asyncChild(process.execPath,['tools/validation/v077/environment.mjs','status'])).stdout);
  assert.equal(state.dependencies,'REUSE');assert.equal(state.build.valid,true);
  const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const status=()=>execFileSync('git',['status','--porcelain','--','tools/validation/v077','tests/fixtures','src','shared','electron'],{encoding:'utf8'}).trim();
  assert.equal(status(),'','Commit harness before execution');
  const hashes=scripts(),runId='REMAINING-'+checkpoint+(retry?'-RETRY':'')+'-'+new Date().toISOString().replace(/[:.]/g,'-');
  const root=resolve('validation-results/v077/runs',runId);mkdirSync(root,{recursive:true});
  writeFileSync(join(root,'identity.json'),JSON.stringify({sourceSha:sha,scriptHashes:hashes,build:json('validation-results/v077/cache/runtime-manifest.json')},null,2)+'\n');
  const workers=workerLimit(4);let capacity=workers;
  const rows=await pool(selected,workers,async item=>{
    assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
    assert.deepEqual(scripts(),hashes);assert.equal(status(),'');
    const dir=join(root,item.id);mkdirSync(dir,{recursive:true});
    const execution=await asyncChild(process.execPath,['--experimental-strip-types',resolve('tools/validation/v077',IMPLEMENTED[item.id]),item.id,dir],{env:{...process.env,GANKSOFT_V077_CASE:item.id}});
    writeFileSync(join(dir,'console.log'),execution.stdout+'\nSTDERR:\n'+execution.stderr);
    let real;try{real=json(join(dir,'case.json'));assert.equal(real.id,item.id);}catch{real=null;}
    const classification=classify(real,execution);
    if(execution.timedOut||real?.kind==='TEST_ENVIRONMENT')capacity=Math.min(capacity,2);
    const row={...(real??{id:item.id}),status:classification==='TEST_INFRA'?'NOT_RUN':real.status,classification,
      evidenceDirectory:dir,execution:{code:execution.code,signal:execution.signal,timedOut:execution.timedOut,error:execution.error}};
    writeFileSync(join(dir,'worker-result.json'),JSON.stringify(row,null,2)+'\n');
    console.log(item.id+': '+classification);return row;
  },()=>capacity);
  assert.equal(new Set(rows.map(x=>x.id)).size,selected.length);
  const summary={schema:'ganksoft.v077/automation-run-1',sourceSha:sha,platform:process.platform,runId,testLayer:'electronUi',checkpoint,workers,actualExecuted:rows.length,worktree:{baselineSha:sha,gitStatus:status(),scriptHashes:hashes},resultDirectory:root,rows};
  writeFileSync(join(root,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  console.log('V077_E2E_REPORT='+join(root,'summary.json'));
}
