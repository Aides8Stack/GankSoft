import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const plan=JSON.parse(readFileSync('docs/v077/evidence/T2-MERGED-PLAN.json','utf8'));
const history=JSON.parse(readFileSync('docs/v077/evidence/T2-REMAINING-PLAN.json','utf8'));
const all=plan.phases.flatMap(x=>x.checkpoints.flatMap(c=>c.ids));

test('five stages cover exactly 172 historical P1/P2 without duplication',()=>{
  const expected=history.rows.filter(r=>r.priority!=='P0').map(r=>r.id);
  assert.equal(all.length,172);
  assert.equal(new Set(all).size,172);
  assert.deepEqual(all.slice().sort(),expected.slice().sort());
  assert.deepEqual(plan.phases.map(x=>[x.id,x.count]),
    [['T2-M1',47],['T2-M2',29],['T2-M3',47],['T2-M4',40],['T2-M5',9]]);
});
test('three Windows-blocked P0 cases are extra follow-ups, not new cases',()=>{
  assert.deepEqual(plan.windowsBlockedP0Followup.slice().sort(),['CLIP-03','CLIP-09','NEW-13']);
  assert.ok(plan.windowsBlockedP0Followup.every(id=>!all.includes(id)));
});
test('merged CLI audit and list do not invoke the native Electron runtime',()=>{
  const a=spawnSync(process.execPath,['tools/validation/v077/phase.mjs','audit'],{encoding:'utf8'});
  assert.equal(a.status,0,a.stderr);
  assert.equal(JSON.parse(a.stdout).result,'PLAN_VALIDATED');
  const b=spawnSync(process.execPath,['tools/validation/v077/phase.mjs','list','T2-M1'],{encoding:'utf8'});
  assert.equal(b.status,0,b.stderr);
  const v=JSON.parse(b.stdout);
  assert.equal(v.count,47);
  assert.equal(v.checkpoints.reduce((n,c)=>n+c.count,0),47);
});
