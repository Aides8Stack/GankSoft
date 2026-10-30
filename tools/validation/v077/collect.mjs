// Stage T -> I: collect test observations without modifying source, issues or PASS ledger.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,sep,relative,dirname} from 'node:path';
import {loadCases} from './registry.mjs';
import {moduleForCase} from './modules.mjs';

const args=process.argv.slice(2);
const opt=name=>{const i=args.indexOf('--'+name);return i<0?null:args[i+1];};
const summaryArg=opt('summary'),write=args.includes('--write'),dryRun=args.includes('--dry-run');
if(!summaryArg || (write===dryRun))throw Error(
  'USAGE: node collect.mjs --summary validation-results/v077/runs/<run>/summary.json --dry-run | --write');
const root=resolve('validation-results/v077/runs')+sep;
const file=resolve(summaryArg);
if(!file.startsWith(root)||file.split(sep).includes('..'))
  throw Error('V077_DEFECT_SOURCE_OUTSIDE_RUNS');
const report=JSON.parse(readFileSync(file,'utf8'));
if(report.schema!=='ganksoft.v077/automation-run-1'||report.testLayer!=='electronUi'||
  !Array.isArray(report.rows)||!report.sourceSha||!report.runId||
  !['linux','win32','darwin'].includes(report.platform))
  throw Error('V077_DEFECT_SOURCE_INVALID');
const ledger=loadCases(),lookup=new Map(ledger.map(r=>[r.id,r]));
const inboxPath=resolve('docs/v077/DEFECT-INBOX.json');
const inbox=JSON.parse(readFileSync(inboxPath,'utf8'));
if(inbox.schema!=='ganksoft.v077/defect-inbox-1'||!Array.isArray(inbox.items))
  throw Error('V077_DEFECT_INBOX_INVALID');
const makeSummary=x=>String(x??'').split('\n').slice(0,2).join(' | ')
  .replace(/[A-Za-z]:[\\/][^\s]+/g,'<path>').replace(/\/(?:tmp|home|Users)\/[^\s]+/g,'<path>')
  .slice(0,280);
let newItems=0,observations=0,skipped=0;
for(const row of report.rows){
  if(row.status!=='FAIL'&&row.status!=='BLOCKED'){skipped++;continue;}
  const spec=lookup.get(row.id);
  if(!spec || !moduleForCase(row.id))throw Error('V077_DEFECT_UNKNOWN_CASE: '+row.id);
  const signature=makeSummary(row.actual??row.reason??row.error??'NO_DETAIL');
  const hash=createHash('sha256').update(row.id+'\0'+signature).digest('hex').slice(0,12);
  const id='AUTO-'+row.id+'-'+hash;
  let target=inbox.items.find(item=>item.id===id);
  if(!target){
    target={id,issue:null,modules:[moduleForCase(row.id).id],cases:[row.id],
      severity:spec.priority,status:'OBSERVED_NOT_TRIAGED',
      kind:row.status==='BLOCKED'?'TEST_OR_ENV_BLOCKER':'UNCLASSIFIED_TEST_FAILURE',
      source:'automated Electron result; needs independent review',symptom:signature,
      rootCause:null,fixSha:null,verification:'NOT_RUN',observations:[]};
    inbox.items.push(target);newItems++;
  }
  target.observations??=[];
  const observation={sourceSha:report.sourceSha,platform:report.platform,runId:report.runId,
    status:row.status,actual:signature,evidence:relative(resolve('validation-results/v077/runs'),file)};
  if(!target.observations.some(x=>x.runId===observation.runId&&
    x.sourceSha===observation.sourceSha&&x.platform===observation.platform)){
    target.observations.push(observation);observations++;
  }
}
if(write)writeFileSync(inboxPath,JSON.stringify(inbox,null,2)+'\n');
console.log(JSON.stringify({status:write?'INBOX_UPDATED':'DRY_RUN',
  sourceSha:report.sourceSha,runId:report.runId,newItems,observations,
  skippedSuccessfulOrNotRun:skipped,output:write?relative('.',inboxPath):'NOT_WRITTEN',
  note:'Observations only; no automatic diagnosis or test-status promotion'},null,2));
