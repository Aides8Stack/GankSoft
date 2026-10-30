import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {IMPLEMENTED,loadCases} from '../tools/validation/v077/registry.mjs';
import {MODULES,moduleForCase,moduleCases,validateModules} from '../tools/validation/v077/modules.mjs';

const cases=loadCases();
test('v077 all canonical 250 cases are assigned to one business module',()=>{
  assert.deepEqual(validateModules(cases),{modules:12,groups:20,cases:cases.length});
  assert.equal(new Set(MODULES.flatMap(m=>m.groups)).size,20);
  for(const row of cases)assert.ok(moduleForCase(row.id),'Missing module for '+row.id);
});
test('v077 module baselines and error/feedback paths point to registered cases',()=>{
  for(const module of MODULES){
    assert.ok(module.baseline.length>0);
    assert.ok(module.negative.length>0);
    assert.ok(module.flow.length>0&&module.feedback.length>0&&module.persist.length>0);
    const normal=moduleCases(cases,module.id,{baseline:true});
    for(const id of module.baseline)assert.ok(normal.some(x=>x.id===id),id);
    assert.ok(moduleCases(cases,module.id,{baseline:true,includeNegative:true}).length>=normal.length);
  }
});
test('v077 module selector lists cases without claiming module PASS',()=>{
  const result=spawnSync(process.execPath,['tools/validation/v077/run.mjs',
    'list','--module','cards','--baseline'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const list=JSON.parse(result.stdout);
  assert.equal(list.module,'cards');
  assert.deepEqual(list.uncoveredIDs,moduleCases(cases,'cards',{baseline:true}).filter(x=>!IMPLEMENTED[x.id]).map(x=>x.id));
  assert.equal(list.implementedIDs.includes('NEW-17'),!!IMPLEMENTED['NEW-17']);
  assert.equal(list.selected,list.implemented+list.unmapped);
});
test('v077 minimal synthetic sample is tracked and has no personal data',()=>{
  const fixture=JSON.parse(readFileSync('tests/fixtures/ganksoft/v077-minimal.json','utf8'));
  assert.equal(fixture.schemaVersion,606);
  assert.equal(fixture.neverUsePersonalData,true);
  assert.deepEqual(fixture.profiles.map(x=>x.key),['question','qa','direct']);
  assert.equal(fixture.profiles[0].options[fixture.profiles[0].correctIndex],'测试正确项');
});
test('v077 defect inbox starts as reports, not fabricated current-version FAIL',()=>{
  const inbox=JSON.parse(readFileSync('docs/v077/DEFECT-INBOX.json','utf8'));
  assert.equal(inbox.schema,'ganksoft.v077/defect-inbox-1');
  assert.ok(inbox.items.some(x=>x.issue===21));
  for(const item of inbox.items){
    assert.ok(['P0','P1','P2'].includes(item.severity));
    assert.ok(item.id && item.cases.length && item.modules.length);
  }
});
