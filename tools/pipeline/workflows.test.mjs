import test from'node:test';import assert from'node:assert/strict';import{readFileSync,readdirSync}from'node:fs';import{parseDocument, stringify}from'yaml';import{auditWorkflows}from'./security.mjs';
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
 for(const w of Object.values(workflows)){if(w === workflows['pr-trust.yml']){assert.deepEqual(w.on.pull_request_target.branches,['develop','main']);assert.deepEqual(Object.keys(w.jobs),['trust']);}else assert.equal(w.on.pull_request_target,undefined);assert.equal(w.on.push?.tags,undefined);if(w.on.push)assert.ok(w.on.push.branches.every(b=>['develop','main'].includes(b)));}
 const pr=workflows['pr-quality.yml'];assert.equal(pr.jobs['pr-gate'].if,'always()');assert.deepEqual(pr.jobs['pr-gate'].needs,['scope','quality']);assert.equal(pr.concurrency['cancel-in-progress'],true);
 assert.doesNotMatch(source['pr-quality.yml'],/windows-package\.ps1|package:portable:win|tools\/pipeline\/release\.mjs/);
});
test('RC serial reconciliation, package and final write job are blocked by quality/security/verification failures',()=>{
 const rc=workflows['develop-rc.yml'];assert.equal(rc.concurrency['cancel-in-progress'],false);assert.deepEqual(rc.jobs['windows-package'].needs,['preflight','quality','security']);assert.deepEqual(rc.jobs['artifact-verify'].needs,['preflight','quality','security','windows-package']);assert.deepEqual(rc.jobs['release-rc'].needs,['artifact-verify']);
 assert.deepEqual(Object.keys(workflows['stable-candidate.yml'].on),['workflow_dispatch']);assert.deepEqual(Object.keys(workflows['release-control.yml'].on),['workflow_dispatch']);assert.equal(workflows['stable-candidate.yml'].jobs['stable-draft'].steps[0].with['fetch-depth'],0);
 assert.throws(()=>auditWorkflows([['bad','jobs:\n  tests:\n    permissions:\n      contents: write\n']]));
});

const pin = 'actions/checkout@' + 'a'.repeat(40);
const fixture = (job = 'quality') => ({on: {pull_request: null}, permissions: {contents: 'read'}, jobs: {[job]: {'runs-on': 'ubuntu-latest', steps: [{uses: pin}]}}});
function bothEndings(name, text, pattern) {
 for (const value of [text.replace(/\r\n/g, '\n'), text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n')]) {
  if (pattern) assert.throws(() => auditWorkflows([[name, value]]), pattern);
  else assert.doesNotThrow(() => auditWorkflows([[name, value]]));
 }
}
test('production workflows have identical security decisions under LF and CRLF', () => {
 for (const [name, text] of Object.entries(source)) bothEndings(name, text);
});
test('only the designated publishing job in its own workflow can write contents', () => {
 for (const [name, job] of [['develop-rc.yml', 'release-rc'], ['stable-candidate.yml', 'stable-draft'], ['release-control.yml', 'release-control']]) {
  const w = fixture(job); w.jobs[job].permissions = {contents: 'write'};
  bothEndings(name, stringify(w));
  bothEndings('pr-quality.yml', stringify(w), /Write permission outside publishing job/);
  w.jobs.quality = w.jobs[job]; delete w.jobs[job];
  bothEndings(name, stringify(w), /Write permission outside publishing job \(quality, contents\)/);
 }
});
test('top-level and non-contents writes, write-all and expression permissions fail closed', () => {
 for (const permission of ['write-all', 'read-all', null, [], {contents: 'write'}, {contents: 'read', actions: 'write'}, {contents: '${{ inputs.permission }}'}]) {
  const w = fixture(); w.permissions = permission;
  bothEndings('develop-rc.yml', stringify(w), /Permissions|contents|Write permission|Invalid permission/);
 }
 for (const permission of ['write-all', null, [], {contents: 'write', actions: 'write'}]) {
  const w = fixture('release-rc'); w.jobs['release-rc'].permissions = permission;
  bothEndings('develop-rc.yml', stringify(w), /Permissions|Write permission/);
 }
});
test('flow maps, quoted keys, indentation and comments cannot change permission ownership', () => {
 const legal = `on: [push]\npermissions: {contents: read}\njobs:\n    'release-rc': # publishing job\n        runs-on: ubuntu-latest\n        permissions: {contents: write} # approved\n        steps: [{uses: '${pin}'}]\n`;
 bothEndings('.github/workflows/develop-rc.yml', legal);
 bothEndings('develop-rc.yml', legal.replace("'release-rc'", "'quality'"), /Write permission outside publishing job/);
 // Comments and shell text are not policy nodes and must not supply fake job context.
 const w = fixture(); w.jobs.quality.steps.push({run: 'echo "contents: write; pull_request_target:; uses: action@main"'});
 bothEndings('pr-quality.yml', '# release-rc:\n' + stringify(w));
 w.jobs.quality.permissions = {contents: 'write'};
 bothEndings('develop-rc.yml', '# release-rc:\n' + stringify(w), /Write permission outside publishing job/);
});
test('empty, missing, malformed and duplicate-key YAML is rejected', () => {
 assert.throws(() => auditWorkflows([]), /Workflow files required/);
 for (const text of ['', '# comment only', 'null', '[]', 'jobs: [', '---\n{}\n---\n{}', 'on: push\npermissions: {contents: read}\njobs: {}', 'on: push\npermissions: {contents: read}\njobs: []', 'on: push\npermissions: {contents: read}\njobs: {quality: null}', 'on: push\njobs: {quality: {runs-on: ubuntu-latest}}']) bothEndings('bad.yml', text, /workflow|Workflow|Permissions/);
 const base = stringify(fixture());
 for (const text of [base + 'jobs: {}\n', base.replace('contents: read', 'contents: read\n  contents: write'), base.replace('quality:', 'quality: {}\n  quality:')]) bothEndings('bad.yml', text, /Invalid workflow YAML/);
});
test('aliases, merge keys, custom tags and hostile object keys are rejected', () => {
 const base = stringify(fixture());
 for (const text of [base + 'copy: &policy {contents: read}\nother: *policy\n', base + 'copy: {<<: {contents: write}}\n', base + 'copy: !unknown value\n', base + '__proto__: {}\n']) bothEndings('bad.yml', text, /aliases|Unsafe workflow key|Invalid workflow YAML/);
});
test('dangerous event forms and inherited secrets are rejected structurally', () => {
 for (const event of ['pull_request_target', ['pull_request_target'], {pull_request_target: null}]) {
  const w = fixture(); w.on = event; bothEndings('bad.yml', stringify(w), /Unsafe workflow event/);
 }
 const w = fixture(); w.jobs.quality = {uses: 'owner/repo/.github/workflows/test.yml@' + 'b'.repeat(40), secrets: 'inherit'};
 bothEndings('bad.yml', stringify(w), /Unsafe inherited secrets/);
});
test('quoted, flow and reusable action references retain immutable SHA checks', () => {
 for (const uses of ['actions/checkout@v4', 'actions/checkout@main', 'actions/checkout@' + 'a'.repeat(39), 'actions/checkout@' + 'a'.repeat(41), '${{ inputs.action }}', 42]) {
  const w = fixture(); w.jobs.quality.steps[0].uses = uses;
  bothEndings('bad.yml', stringify(w), /Action must pin immutable SHA/);
  w.jobs.quality = {uses}; bothEndings('bad.yml', stringify(w), /Action must pin immutable SHA/);
 }
 const w = fixture(); w.jobs.quality = {uses: 'owner/repo/.github/workflows/test.yml@' + 'b'.repeat(40)};
 bothEndings('valid.yml', stringify(w));
 w.jobs.quality = {'runs-on': 'ubuntu-latest', steps: [{uses: './.github/actions/test'}]}; bothEndings('valid.yml', stringify(w));
});
