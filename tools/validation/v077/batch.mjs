import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {loadCases} from './registry.mjs';
const [command,batch,...args]=process.argv.slice(2),plan=JSON.parse(readFileSync('docs/v077/evidence/T2-REMAINING-PLAN.json'));
if(!['list','run'].includes(command)||!plan.rows.some(x=>x.batch===batch))throw Error('USAGE: batch.mjs list|run T2-A-01');
if(args.some(x=>x!=='--retry-blocked'))throw Error('UNKNOWN_BATCH_OPTION');
const ledger=loadCases();const rows=plan.rows.filter(x=>x.batch===batch&&['NOT_RUN',...(args.includes('--retry-blocked')?['BLOCKED']:[])].includes(ledger.find(c=>c.id===x.id).electronUi));
if(command==='list'){console.log(JSON.stringify(rows,null,2));process.exit();}
if(!rows.length)throw Error('NO_NOT_RUN_CASES_IN_BATCH');
const check=spawnSync(process.execPath,['tools/validation/v077/environment.mjs','status'],{encoding:'utf8'});if(check.status!==0)throw Error('ENVIRONMENT_CHECK_FAILED');const env=JSON.parse(check.stdout);if(env.dependencies!=='REUSE'||!env.build?.valid)throw Error('VERIFIED_BUILD_REQUIRED: inspect environment status and prepare once');
const r=spawnSync(process.execPath,['tools/validation/v077/run.mjs','run','--ids',rows.map(x=>x.id).join(',')],{encoding:'utf8',timeout:rows.length*185000,maxBuffer:1024*1024});
const path=r.stdout?.match(/V077_E2E_REPORT=(.+)/)?.[1];if(!path)throw Error('BATCH_RUNNER_FAILED: '+r.stderr);
writeFileSync(path.replace('summary.json','batch-console.log'),r.stdout+'\n'+r.stderr);
const s=JSON.parse(readFileSync(path));console.log(JSON.stringify({report:path,selected:s.selectedCount,passed:s.passed,failed:s.failed,blocked:s.blocked,notRun:s.notRun,failures:s.rows.filter(x=>x.status!=='PASS').map(x=>({id:x.id,status:x.status,actual:x.actual??x.reason}))},null,2));process.exitCode=r.status;
