import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseDocument} from 'yaml';
import {trustedPR} from './pr-trust.mjs';
import {auditWorkflows} from './security.mjs';
const sha = 'a'.repeat(40), repo = 'Aides8Stack/GankSoft';
function mock({files=[{filename:'src/App.vue'}], edit={}, manual=false, env={}, actor='Aides8Stack', move=false}={}) {
 const statuses=[], failures=[]; let calls=0;
 const pr={number:4,state:'open',changed_files:files.length,head:{sha,repo:{full_name:repo}},base:{sha:'b'.repeat(40),ref:'develop',repo:{full_name:repo}},user:{login:'Aides8Stack'},...edit};
 const args={github:{rest:{pulls:{get:async()=>({data:move && calls++ ? {...pr,head:{...pr.head,sha:'c'.repeat(40)}} : pr}),listFiles:()=>{}},repos:{createCommitStatus:async data=>{statuses.push(data);}}},paginate:async()=>files},context:{repo:{owner:'Aides8Stack',repo:'GankSoft'},eventName:manual?'workflow_dispatch':'pull_request_target',ref:'refs/heads/main',payload:{pull_request:{number:4,user:{login:'fake-payload'}}},actor,runId:1},core:{setFailed:message=>failures.push(message)},env:{PR_NUMBER:'4',EXPECTED_SHA:sha,CONFIRM:`review ${sha}`,...env}};
 return {args,statuses,failures};
}
test('trusted metadata permits normal owner application/docs PRs without executing content', async()=>{
 for(const filename of ['src/App.vue','docs/guide.md','README.md']){const f=mock({files:[{filename,patch:'process.exit(0); ${ malicious }'}]});await trustedPR(f.args);assert.deepEqual(f.statuses.map(s=>s.state),['pending','success']);assert.equal(f.failures.length,0);assert.ok(f.statuses.every(s=>s.sha===sha&&s.context==='pr-trust'));}
});
test('forks, foreign authors, wrong base and closed PRs cannot self-authorize with forged payloads', async()=>{
 for(const edit of [{head:{sha,repo:{full_name:'attacker/GankSoft'}}},{user:{login:'attacker'}},{state:'closed'},{base:{ref:'attacker',repo:{full_name:repo}}}]){const f=mock({edit});await trustedPR(f.args);assert.equal(f.statuses.at(-1).state,'failure');assert.equal(f.failures.length,1);}
});
test('self-edited scope, gate, tests, scripts, locks and renamed control files require exact SHA review',async()=>{
 for(const filename of ['.github/workflows/pr-quality.yml','tools/pipeline/pr.mjs','tools/ci/quality.mjs','tests/core.test.ts','package.json','package-lock.json','tsconfig.json','.npmrc','.gitmodules','vite.config.ts']){
  const f=mock({files:[{filename}]});await trustedPR(f.args);assert.match(f.failures[0],/CI_POLICY_REVIEW_REQUIRED/);assert.equal(f.statuses.at(-1).state,'failure');
 }
 const f=mock({files:[{filename:'docs/fake.md',previous_filename:'tests/core.test.ts'}]});await trustedPR(f.args);assert.equal(f.statuses.at(-1).state,'failure');
});
test('explicit owner review is bound to default main, current SHA and exact confirmation',async()=>{
 const good=mock({manual:true,files:[{filename:'tools/pipeline/pr.mjs'}]});await trustedPR(good.args);assert.equal(good.statuses.at(-1).state,'success');
 for(const settings of [{actor:'attacker'},{env:{EXPECTED_SHA:'c'.repeat(40)}},{env:{CONFIRM:'review latest'}}]){const f=mock({manual:true,...settings});await trustedPR(f.args);assert.equal(f.statuses.at(-1).state,'failure');}
 const f=mock({manual:true});f.args.context.ref='refs/heads/feature/evil';await assert.rejects(trustedPR(f.args),/default main/);assert.equal(f.statuses.length,0);
});
test('truncated metadata, deleted repos and changing PR identity fail closed',async()=>{
 for(const settings of [{edit:{changed_files:3000}},{edit:{changed_files:3}},{edit:{head:{sha,repo:null}}},{move:true}]){const f=mock(settings);await trustedPR(f.args);assert.equal(f.statuses.at(-1).state,'failure');}
 const f=mock();f.args.github.paginate=async()=>{throw Error('API unavailable');};await trustedPR(f.args);assert.equal(f.statuses.at(-1).state,'failure');
});
test('production target workflow embeds tested code exactly and has only API status write authority',async()=>{
 const text=readFileSync('.github/workflows/pr-trust.yml','utf8'),w=parseDocument(text).toJS();
 assert.deepEqual(Object.keys(w.jobs),['trust']);assert.deepEqual(w.jobs.trust.permissions,{contents:'read','pull-requests':'read',statuses:'write'});assert.equal(w.jobs.trust.steps.length,1);
 const step=w.jobs.trust.steps[0];assert.equal(step.uses,'actions/github-script@ed597411d8f924073f98dfc5c65a23a2325f34cd');
 const source=readFileSync('tools/pipeline/pr-trust.mjs','utf8');const body=source.slice(source.indexOf('export async function')).replace('export async function','async function')+'\nawait trustedPR({github, context, core, env: process.env});\n';assert.equal(step.with.script,body);
 assert.doesNotMatch(text,/checkout@|download-artifact@|secrets\.|secrets: inherit|npm ci|execSync|eval\(|require\(/);
 const f=mock();await vm.runInNewContext('(async()=>{'+body+'})()', {...f.args,process:{env:f.args.env}});assert.equal(f.statuses.at(-1).state,'success');
 auditWorkflows([['pr-trust.yml',text]]);for(const bad of [text.replace('statuses: write','contents: write'),text.replace("'pr-trust'","'other-context'"),text+'\n# unreviewed change\n'])assert.throws(()=>auditWorkflows([['pr-trust.yml',bad]]));
});
test('PR scope executes immutable trusted policy, never the candidate policy script, without shared caches',()=>{
 const w=parseDocument(readFileSync('.github/workflows/pr-quality.yml','utf8')).toJS(),steps=w.jobs.scope.steps;
 assert.equal(steps[0].with.ref,'999a184b53dc415c38661b84c56a1643d03f78eb');assert.equal(steps[0].with.path,'trusted-policy');assert.equal(steps[1].with.path,'candidate');
 assert.equal(steps.at(-1).run,'node ../trusted-policy/tools/pipeline/pr.mjs');assert.equal(steps.at(-1)['working-directory'],'candidate');assert.equal(w.permissions.contents,'read');
 for(const job of Object.values(w.jobs))for(const step of job.steps??[]){assert.equal(step.with?.['persist-credentials'],step.uses?.startsWith('actions/checkout@')?false:undefined);assert.equal(step.with?.cache,undefined);}
});
