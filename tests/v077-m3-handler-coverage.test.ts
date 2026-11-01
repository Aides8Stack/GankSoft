import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {IMPLEMENTED,loadCases} from '../tools/validation/v077/registry.mjs';

const manifest=JSON.parse(readFileSync('docs/v077/evidence/T2-MERGED-PLAN.json','utf8'));
const phase=manifest.phases.find(s=>s.id==='T2-M3');
const ids=phase.checkpoints.flatMap(c=>c.ids);
const ledger=loadCases();
const required=[['M3-01',12],['M3-02',9],['M3-03',12],['M3-04',9],['M3-05',5]];

test('T2-M3 exactly covers 47 planned CASE IDs with zero missing or double-counted handler',()=>{
  assert.equal(phase.count,47);
  assert.equal(ids.length,47);
  assert.equal(new Set(ids).size,47);
  assert.deepEqual(phase.checkpoints.map(c=>[c.id,c.ids.length]),required);
  for(const id of ids){
    const handler=IMPLEMENTED[id];
    assert.match(handler??'',/^scenarios\/m3-(planner|review|knowledge|markdown|analytics)\.mjs$/,id+' has no real handler');
    const path='tools/validation/v077/'+handler;
    assert.ok(existsSync(path),id+' handler missing');
    const source=readFileSync(path,'utf8');
    assert.ok(source.includes('executeCase('),id+' not in real isolated Electron harness');
    assert.ok(source.includes('assert.'),id+' has no outcome checks');
    assert.ok(source.includes('evidence(ctx)'),id+' missing feedback/diagnostics trace');
    assert.ok(source.includes("'"+id+"'"),id+' must have actual execution branch');
    assert.equal(ledger.find(x=>x.id===id)?.electronUi,'NOT_RUN',id+' must NOT be promoted by registration');
  }
});
test('M3 all new GUI script modules pass Node syntax-check',()=>{
  for(const path of [...new Set(ids.map(id=>'tools/validation/v077/'+IMPLEMENTED[id])),'tools/validation/v077/scenarios/m3-support.mjs']){
    const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
    assert.equal(result.status,0,path+': '+result.stderr);
  }
});
test('M3 high-risk assertions cannot be replaced by empty navigational smoke',()=>{
  const root='tools/validation/v077/scenarios/';
  const plan=readFileSync(root+'m3-planner.mjs','utf8');
  const review=readFileSync(root+'m3-review.mjs','utf8');
  const knowledge=readFileSync(root+'m3-knowledge.mjs','utf8');
  const markdown=readFileSync(root+'m3-markdown.mjs','utf8');
  const analytics=readFileSync(root+'m3-analytics.mjs','utf8');
  assert.match(plan,/Existing plans|dueAt|dueAt|scheduleRows/);
  assert.match(review,/0,'again'/);
  assert.match(review,/59,'again'/);
  assert.match(review,/60,'hard'/);
  assert.match(review,/74,'hard'/);
  assert.match(review,/75,'good'/);
  assert.match(review,/89,'good'/);
  assert.match(review,/90,'easy'/);
  assert.match(review,/100,'easy'/);
  assert.match(review,/ReviewEvent|event\.eventId|learning\.history\.get/);
  assert.match(knowledge,/No parent|cycle|Descendant-parent|Self-parent/);
  assert.match(markdown,/知识 Markdown|MARKDOWN|导入|native|预览/);
  assert.match(markdown,/readFileSync\(file,'utf8'\)/);
  assert.match(analytics,/ReviewEvent|history|average|eventCount/);
});
test('new M3 scenarios do not claim Windows native evidence and do not touch PASS ledger',()=>{
  for(const id of ids)assert.equal(ledger.find(x=>x.id===id)?.electronUi,'NOT_RUN');
  const source=readFileSync('tools/validation/v077/scenarios/m3-support.mjs','utf8');
  assert.match(source,/threeModes/);
  assert.match(source,/reviewCard/);
  assert.match(source,/openPlanner/);
  assert.match(source,/openOutline/);
  assert.match(source,/openExchange/);
});
