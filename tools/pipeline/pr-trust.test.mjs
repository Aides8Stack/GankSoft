import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseDocument, stringify} from 'yaml';
import {trustedPR} from './pr-trust.mjs';
import {auditWorkflows} from './security.mjs';
const sha = 'a'.repeat(40), repo = 'Aides8Stack/GankSoft';
const lf = text => text.replace(/\r\n/g, '\n');
const withEol = (text, eol) => lf(text).replace(/\n/g, eol);
function workflow(text) {
 const doc = parseDocument(text, {uniqueKeys: true});
 assert.deepEqual(doc.errors, [], 'attack fixtures must remain valid, unique-key YAML');
 return doc.toJS();
}
function embeddedBody(source) {
 const normalized = lf(source), start = normalized.indexOf('export async function');
 assert.ok(start >= 0, 'trusted function declaration must exist');
 return normalized.slice(start).replace('export async function','async function')+'\nawait trustedPR({github, context, core, env: process.env});\n';
}
function assertEmbeddedScript(text, source) {
 const script = workflow(text).jobs.trust.steps[0].with.script;
 assert.equal(lf(script), embeddedBody(source)); // No trim or whitespace/content relaxation.
 return lf(script);
}
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
 const source=readFileSync('tools/pipeline/pr-trust.mjs','utf8');const body=assertEmbeddedScript(text,source);
 assert.doesNotMatch(text,/checkout@|download-artifact@|secrets\.|secrets: inherit|npm ci|execSync|eval\(|require\(/);
 const f=mock();await vm.runInNewContext('(async()=>{'+body+'})()', {...f.args,process:{env:f.args.env}});assert.equal(f.statuses.at(-1).state,'success');
 auditWorkflows([['pr-trust.yml',text]]);
 const write=workflow(text);delete write.jobs.trust.permissions.statuses;write.jobs.trust.permissions.contents='write';
 const altered=workflow(text);altered.jobs.trust.steps[0].with.script+='\nthrow Error("unreviewed code");\n';
 assert.equal(workflow(stringify(write)).jobs.trust.permissions.contents,'write');
 assert.notEqual(workflow(stringify(altered)).jobs.trust.steps[0].with.script,step.with.script);
 for(const bad of [stringify(write),stringify(altered),text+'\n# unreviewed change\n'])assert.throws(()=>auditWorkflows([['pr-trust.yml',bad]]));
});
test('embedded script equality accepts LF/CRLF only and still detects content or whitespace edits',()=>{
 const text=readFileSync('.github/workflows/pr-trust.yml','utf8'),source=readFileSync('tools/pipeline/pr-trust.mjs','utf8');
 for(const sourceEol of ['\n','\r\n'])for(const workflowEol of ['\n','\r\n']){
  const candidate=withEol(text,workflowEol),module=withEol(source,sourceEol);
  assert.doesNotThrow(()=>assertEmbeddedScript(candidate,module));
  for(const edit of [script=>script+' ',script=>script.replace("'Aides8Stack/GankSoft'","'attacker/GankSoft'")]){
   const altered=workflow(candidate),original=altered.jobs.trust.steps[0].with.script;
   altered.jobs.trust.steps[0].with.script=edit(original);assert.notEqual(altered.jobs.trust.steps[0].with.script,original);
   assert.throws(()=>assertEmbeddedScript(withEol(stringify(altered),workflowEol),module),assert.AssertionError);
  }
 }
});
test('PR scope executes immutable trusted policy, never the candidate policy script, without shared caches',()=>{
 const w=parseDocument(readFileSync('.github/workflows/pr-quality.yml','utf8')).toJS(),steps=w.jobs.scope.steps;
 assert.equal(steps[0].with.ref,'999a184b53dc415c38661b84c56a1643d03f78eb');assert.equal(steps[0].with.path,'trusted-policy');assert.equal(steps[1].with.path,'candidate');
 assert.equal(steps.at(-1).run,'node ../trusted-policy/tools/pipeline/pr.mjs');assert.equal(steps.at(-1)['working-directory'],'candidate');assert.equal(w.permissions.contents,'read');
 for(const job of Object.values(w.jobs))for(const step of job.steps??[]){assert.equal(step.with?.['persist-credentials'],step.uses?.startsWith('actions/checkout@')?false:undefined);assert.equal(step.with?.cache,undefined);}
});

test('public PR workflows cannot inherit publishing grants or reference repository secrets',()=>{
 const text=readFileSync('.github/workflows/pr-quality.yml','utf8');
 const rcText=readFileSync('.github/workflows/develop-rc.yml','utf8');
 for(const eol of ['\n','\r\n']){
  const original=withEol(text,eol);assert.doesNotThrow(()=>auditWorkflows([['pr-quality.yml',original]]));
  const topWrite=workflow(original);assert.equal(topWrite.permissions.contents,'read');topWrite.permissions.contents='write';
  const badTop=withEol(stringify(topWrite),eol);assert.equal(workflow(badTop).permissions.contents,'write');
  assert.throws(()=>auditWorkflows([['pr-quality.yml',badTop]]),/Top-level contents must be read/);
  const jobWrite=workflow(original);jobWrite.jobs.quality.permissions={contents:'write'};
  const badJob=withEol(stringify(jobWrite),eol);assert.equal(workflow(badJob).jobs.quality.permissions.contents,'write');
  assert.throws(()=>auditWorkflows([['pr-quality.yml',badJob]]),/must remain read-only/);
  const secrets=workflow(original),scope=secrets.jobs.scope.steps.find(s=>s.id==='scope');
  assert.equal(scope.env.GITHUB_TOKEN,'${{ github.token }}');scope.env.GITHUB_TOKEN='${{ secrets.PUBLISH_TOKEN }}';
  const badSecrets=withEol(stringify(secrets),eol);assert.equal(workflow(badSecrets).jobs.scope.steps.find(s=>s.id==='scope').env.GITHUB_TOKEN,'${{ secrets.PUBLISH_TOKEN }}');
  assert.throws(()=>auditWorkflows([['pr-quality.yml',badSecrets]]),/cannot reference repository secrets/);
  const rc=workflow(withEol(rcText,eol));assert.deepEqual(rc.on.push.branches,['develop']);
  delete rc.on.push;rc.on.pull_request={branches:['develop']};
  const badRC=withEol(stringify(rc),eol),roundTrip=workflow(badRC);
  assert.equal(roundTrip.on.push,undefined);assert.deepEqual(roundTrip.on.pull_request.branches,['develop']);assert.equal(roundTrip.jobs['release-rc'].permissions.contents,'write');
  assert.throws(()=>auditWorkflows([['develop-rc.yml',badRC]]),/must remain read-only/);
 }
});
