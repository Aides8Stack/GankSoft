import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {IMPLEMENTED,loadCases} from '../tools/validation/v077/registry.mjs';
const plan=JSON.parse(readFileSync('docs/v077/evidence/T2-MERGED-PLAN.json','utf8'));
const phase=plan.phases.find(x=>x.id==='T2-M1');
const ids=phase.checkpoints.flatMap(c=>c.ids);
const before=loadCases();
test('T2-M1 all 47 original IDs have registered GUI handlers with no duplicates',()=>{
  assert.equal(ids.length,47);
  assert.equal(new Set(ids).size,47);
  for(const id of ids){
    const handler=IMPLEMENTED[id];
    assert.ok(handler?.startsWith('scenarios/m1-'),id+' missing M1 module handler');
    const source='tools/validation/v077/'+handler;
    assert.ok(existsSync(source),id+' handler file absent');
    assert.ok(readFileSync(source,'utf8').includes('executeCase('),id+' cannot be declared as a real GUI scenario');
    assert.equal(before.find(c=>c.id===id)?.electronUi,'NOT_RUN','Registering scripts cannot modify test results');
  }
});
test('M1 scripts parse under local Node without launching Electron',()=>{
  for(const path of new Set(ids.map(id=>'tools/validation/v077/'+IMPLEMENTED[id]))){
    const run=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
    assert.equal(run.status,0,path+': '+run.stderr);
  }
});
test('M1 true fresh Schema606 fixture is a test-only injectable lifecycle path',()=>{
  const helpers=readFileSync('tools/validation/v077/helpers.mjs','utf8');
  const support=readFileSync('tools/validation/v077/scenarios/m1-support.mjs','utf8');
  assert.match(helpers,/options\.fixtureFactory \?\? b2Fixture/);
  assert.match(support,/prepareFreshUnified/);
  assert.match(support,/gank-b2-lifecycle-/);
  assert.match(support,/synthetic606/);
});
