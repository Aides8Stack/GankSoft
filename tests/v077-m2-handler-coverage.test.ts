import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {IMPLEMENTED,loadCases} from '../tools/validation/v077/registry.mjs';

const merged=JSON.parse(readFileSync('docs/v077/evidence/T2-MERGED-PLAN.json','utf8'));
const phase=merged.phases.find(x=>x.id==='T2-M2');
const caseIds=phase.checkpoints.flatMap(c=>c.ids);
const ledger=loadCases();
const paths=new Set(caseIds.map(id=>'tools/validation/v077/'+IMPLEMENTED[id]));

test('all 29 original M2 CASEs have exactly one registered, existing GUI handler',()=>{
  assert.equal(phase.count,29);
  assert.equal(caseIds.length,29);
  assert.equal(new Set(caseIds).size,29);
  assert.deepEqual(phase.checkpoints.map(x=>x.ids.length),[19,8,2]);
  for(const id of caseIds){
    assert.ok(IMPLEMENTED[id]?.startsWith('scenarios/m2-'),'Missing or unrelated M2 handler: '+id);
    const path='tools/validation/v077/'+IMPLEMENTED[id];
    assert.ok(existsSync(path),id+' file does not exist');
    const source=readFileSync(path,'utf8');
    assert.ok(source.includes('executeCase('),id+' does not use real isolated Electron harness');
    assert.ok(source.includes('getByRole(')||source.includes('editor(ctx,'),id+' missing GUI driver');
    assert.ok(source.includes('assert.'),id+' missing assertions');
    assert.ok(source.includes('evidence(ctx)'),id+' missing feedback evidence');
    assert.ok(source.includes("'"+id+"'"),id+' missing dedicated execution branch/contract');
    assert.equal(ledger.find(row=>row.id===id)?.electronUi,'NOT_RUN',
      id+' must stay NOT_RUN until real Electron execution');
  }
});
test('M2 scenarios and helpers parse under Node syntax checker',()=>{
  for(const path of [...paths,'tools/validation/v077/scenarios/m2-support.mjs']){
    const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
    assert.equal(result.status,0,path+': '+result.stderr);
  }
});
test('M2 clipboard and dialog checks are strict and Windows remains separate',()=>{
  const clip=readFileSync('tools/validation/v077/scenarios/m2-clipboard.mjs','utf8');
  const modal=readFileSync('tools/validation/v077/scenarios/m2-dialogs.mjs','utf8');
  assert.match(clip,/MEDIA-03 must NOT be waived/);
  assert.match(clip,/NOT Windows physical/);
  assert.match(modal,/1500/);
  assert.match(modal,/1366/);
  assert.match(modal,/900/);
  assert.match(modal,/do not silently waive GH-20/);
});
