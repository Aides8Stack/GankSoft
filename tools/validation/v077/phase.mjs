import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {IMPLEMENTED,PLATFORM_GATED,loadCases} from './registry.mjs';

const file=new URL('../../../docs/v077/evidence/T2-MERGED-PLAN.json',import.meta.url);
const history=new URL('../../../docs/v077/evidence/T2-REMAINING-PLAN.json',import.meta.url);
const plan=JSON.parse(readFileSync(file,'utf8'));
const legacy=JSON.parse(readFileSync(history,'utf8'));
const all=loadCases();
const live=new Map(all.map(c=>[c.id,c]));
const [command='audit',phaseId,...args]=process.argv.slice(2);
if(!['audit','list','run'].includes(command))
  throw Error('USAGE: phase.mjs audit | list T2-M1 | run T2-M1 [--checkpoint M1-01] [--retry-blocked]');
const checkpointOption=args.indexOf('--checkpoint');
const checkpointId=checkpointOption<0?null:args[checkpointOption+1];
const retryBlocked=args.includes('--retry-blocked');
if(checkpointOption>=0 && (!checkpointId||checkpointId.startsWith('--')))
  throw Error('MISSING_CHECKPOINT_ID');
for(let i=0;i<args.length;i++){
  if(args[i]==='--retry-blocked')continue;
  if(args[i]==='--checkpoint'){i++;continue;}
  throw Error('UNKNOWN_OPTION: '+args[i]);
}
const phase=plan.phases.find(p=>p.id===phaseId);
if(command!=='audit'&&!phase)throw Error('UNKNOWN_PHASE: '+phaseId);

function assertPlan(){
  const expected=legacy.rows.filter(x=>x.priority!=='P0').map(x=>x.id);
  const assigned=plan.phases.flatMap(p=>p.checkpoints.flatMap(c=>c.ids));
  if(expected.length!==172||assigned.length!==172||new Set(assigned).size!==172
    ||plan.phases.length!==5||expected.some(id=>!assigned.includes(id))
    ||assigned.some(id=>!live.has(id)))throw Error('MERGED_COVERAGE_INVALID');
  if(plan.phases.map(p=>p.count).join(',')!=='47,29,47,40,9')
    throw Error('MERGED_COUNTS_INVALID');
  for(const p of plan.phases){
    if(!p.checkpoints.length||p.count!==p.checkpoints.reduce((n,c)=>n+c.ids.length,0))
      throw Error('CHECKPOINT_COUNT_INVALID: '+p.id);
  }
  if(plan.windowsBlockedP0Followup.length!==3
    ||plan.windowsBlockedP0Followup.some(id=>assigned.includes(id)||!live.has(id)))
    throw Error('WINDOWS_P0_FOLLOWUP_INVALID');
}
assertPlan();
const stats=ids=>Object.fromEntries(['PASS','FAIL','BLOCKED','NOT_RUN']
  .map(status=>[status,ids.filter(id=>live.get(id).electronUi===status).length]));
const info=p=>({
  id:p.id,title:p.title,count:p.count,status:stats(p.checkpoints.flatMap(c=>c.ids)),
  checkpoints:p.checkpoints.map(c=>({id:c.id,count:c.ids.length,status:stats(c.ids),
    missingHandlers:c.ids.filter(id=>!IMPLEMENTED[id]&&!PLATFORM_GATED.includes(id))}))
});
if(command==='audit'){
  console.log(JSON.stringify({result:'PLAN_VALIDATED',phases:plan.phases.map(p=>({
    id:p.id,count:p.count,status:info(p).status,checkpoints:p.checkpoints.length})),
    windowsBlockedP0Followup:{ids:plan.windowsBlockedP0Followup,
      status:stats(plan.windowsBlockedP0Followup),excludedFrom172:true}},null,2));
  process.exit(0);
}
if(command==='list'){
  console.log(JSON.stringify({...info(phase),windowsBlockedP0Followup:phase.requiresWindows?
    {ids:plan.windowsBlockedP0Followup,status:stats(plan.windowsBlockedP0Followup),excludedFrom172:true}:null},null,2));
  process.exit(0);
}
if(retryBlocked&&!phase.requiresWindows)throw Error('RETRY_BLOCKED_ONLY_FOR_WINDOWS');
if(phase.requiresWindows&&process.platform!=='win32')
  throw Error('WINDOWS_ENVIRONMENT_REQUIRED: do not sign off native cases from Linux');

const checkpoints=phase.checkpoints.slice();
if(phase.requiresWindows&&retryBlocked)
  checkpoints.unshift({id:'M5-P0-FOLLOWUP',ids:plan.windowsBlockedP0Followup});
if(checkpointId&&!checkpoints.some(c=>c.id===checkpointId))
  throw Error('UNKNOWN_CHECKPOINT: '+checkpointId);
let current=null;
for(const c of checkpoints){
  if(checkpointId&&c.id!==checkpointId)continue;
  const pending=c.ids.filter(id=>live.get(id).electronUi==='NOT_RUN'
    ||(retryBlocked&&live.get(id).electronUi==='BLOCKED'));
  if(pending.length){current={id:c.id,ids:pending};break;}
}
if(!current){
  console.log(JSON.stringify({phase:phase.id,status:'NO_PENDING_CASES',retryBlocked}));
  process.exit(0);
}
const missing=current.ids.filter(id=>!IMPLEMENTED[id]
  &&!(phase.requiresWindows&&PLATFORM_GATED.includes(id)));
if(missing.length){
  console.log(JSON.stringify({phase:phase.id,checkpoint:current.id,status:'NEEDS_GUI_HANDLERS',
    missing,planned:current.ids.length,
    instruction:'Implement and register genuine Electron GUI handlers, commit them before testing; no false PASS.'},null,2));
  process.exit(2);
}

const envCall=spawnSync(process.execPath,['tools/validation/v077/environment.mjs','status'],
  {encoding:'utf8',maxBuffer:1024*1024});
if(envCall.status!==0)throw Error('ENVIRONMENT_CHECK_FAILED: '+String(envCall.stderr||'').slice(-400));
const env=JSON.parse(envCall.stdout);
if(env.dependencies!=='REUSE'||!env.build?.valid)
  throw Error('VERIFIED_BUILD_REQUIRED: run environment.mjs prepare only for invalid/missing cached inputs');
const run=spawnSync(process.execPath,
  ['tools/validation/v077/run.mjs','run','--ids',current.ids.join(',')],
  {encoding:'utf8',timeout:current.ids.length*185000,maxBuffer:4*1024*1024});
const report=run.stdout?.match(/V077_E2E_REPORT=(.+)/)?.[1]?.trim();
if(!report)throw Error('GUI_RUNNER_DID_NOT_WRITE_REPORT: '+String(run.stderr||run.stdout||'').slice(-1000));
writeFileSync(report.replace(/summary\.json$/,'merged-phase-console.log'),
  String(run.stdout||'')+'\n'+String(run.stderr||''));
const result=JSON.parse(readFileSync(report,'utf8'));
console.log(JSON.stringify({phase:phase.id,checkpoint:current.id,report,
  selected:result.selectedCount,passed:result.passed,failed:result.failed,
  blocked:result.blocked,notRun:result.notRun,
  failures:result.rows.filter(x=>x.status!=='PASS')
    .map(x=>({id:x.id,status:x.status,reason:x.actual??x.reason})),
  next:'Review collect.mjs dry-run; collect, promote genuine results, save a GitHub checkpoint, then run the same phase again.'},null,2));
process.exitCode=run.status??2;
