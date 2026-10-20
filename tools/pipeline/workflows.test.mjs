import test from'node:test';import assert from'node:assert/strict';import{readFileSync,readdirSync}from'node:fs';import{parseDocument}from'yaml';import{auditWorkflows}from'./security.mjs';
const source=Object.fromEntries(readdirSync('.github/workflows').filter(n=>n.endsWith('.yml')).map(n=>[n,readFileSync('.github/workflows/'+n,'utf8')]));
const workflows=Object.fromEntries(Object.entries(source).map(([n,s])=>{const d=parseDocument(s,{uniqueKeys:true});assert.deepEqual(d.errors,[]);return[n,d.toJS()];}));
test('all workflows parse uniquely, use immutable Actions, minimal permission and valid dependency DAG',()=>{
 assert.ok(!workflows['quality.yml']);for(const [name,w]of Object.entries(workflows)){
 assert.equal(w.permissions.contents,'read');const visiting=new Set(),done=new Set();
 function visit(job){assert.ok(w.jobs[job],name+' '+job);if(done.has(job))return;assert.ok(!visiting.has(job),'acyclic needs');visiting.add(job);for(const d of [].concat(w.jobs[job].needs??[]))visit(d);visiting.delete(job);done.add(job);}for(const j of Object.keys(w.jobs))visit(j);
 for(const [job,j]of Object.entries(w.jobs)){if(j.permissions?.contents==='write')assert.ok(['release-rc','stable-draft','release-control'].includes(job));for(const step of j.steps??[]){if(step.uses)assert.match(step.uses,/@[a-f0-9]{40}$/);assert.equal(step['continue-on-error'],undefined);}}
 }auditWorkflows(Object.entries(source));
});
test('event ownership has exactly one PR workflow, one develop push, no feature push or tag loop',()=>{
 assert.deepEqual(Object.keys(workflows['pr-quality.yml'].on),['pull_request']);assert.deepEqual(workflows['develop-rc.yml'].on.push.branches,['develop']);assert.deepEqual(workflows['main-quality.yml'].on.push.branches,['main']);
 assert.equal(Object.values(workflows).filter(w=>w.on.pull_request).length,1);
 for(const w of Object.values(workflows)){assert.equal(w.on.pull_request_target,undefined);assert.equal(w.on.push?.tags,undefined);if(w.on.push)assert.ok(w.on.push.branches.every(b=>['develop','main'].includes(b)));}
 const pr=workflows['pr-quality.yml'];assert.equal(pr.jobs['pr-gate'].if,'always()');assert.deepEqual(pr.jobs['pr-gate'].needs,['scope','quality']);assert.equal(pr.concurrency['cancel-in-progress'],true);
 assert.doesNotMatch(source['pr-quality.yml'],/windows-package\.ps1|package:portable:win|tools\/pipeline\/release\.mjs/);
});
test('RC serial reconciliation, package and final write job are blocked by quality/security/verification failures',()=>{
 const rc=workflows['develop-rc.yml'];assert.equal(rc.concurrency['cancel-in-progress'],false);assert.deepEqual(rc.jobs['windows-package'].needs,['preflight','quality','security']);assert.deepEqual(rc.jobs['artifact-verify'].needs,['preflight','quality','security','windows-package']);assert.deepEqual(rc.jobs['release-rc'].needs,['artifact-verify']);
 assert.deepEqual(Object.keys(workflows['stable-candidate.yml'].on),['workflow_dispatch']);assert.deepEqual(Object.keys(workflows['release-control.yml'].on),['workflow_dispatch']);assert.equal(workflows['stable-candidate.yml'].jobs['stable-draft'].steps[0].with['fetch-depth'],0);
 assert.throws(()=>auditWorkflows([['bad','jobs:\n  tests:\n    permissions:\n      contents: write\n']]));
});
