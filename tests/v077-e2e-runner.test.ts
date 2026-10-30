import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {IMPLEMENTED,loadCases,selectCases} from '../tools/validation/v077/registry.mjs';

test('v077 contract: exactly 248 unique scoped journeys with risk tiers',()=>{
  const cases=loadCases();
  assert.equal(cases.length,248);
  assert.equal(new Set(cases.map(c=>c.id)).size,248);
  assert.equal(cases.filter(c=>c.priority==='P0').length,58);
  assert.equal(cases.filter(c=>c.priority==='P1').length,163);
  assert.equal(cases.filter(c=>c.priority==='P2').length,27);
});

test('v077 executable registry never claims unimplemented journeys as automated',()=>{
  const cases=loadCases(),mapped=selectCases(cases,{mappedOnly:true});
  assert.deepEqual(mapped.map(x=>x.id),Object.keys(IMPLEMENTED).sort((a,b)=>
    cases.findIndex(c=>c.id===a)-cases.findIndex(c=>c.id===b)));
  assert.equal(mapped.length,6);
  assert.equal(cases.length-mapped.length,242);
  for(const script of Object.values(IMPLEMENTED))
    assert.ok(existsSync(fileURLToPath(new URL('../tools/validation/v077/'+script,import.meta.url))));
});

test('v077 CLI lists every unmapped NEW scenario rather than reporting full coverage',()=>{
  const result=spawnSync(process.execPath,['tools/validation/v077/run.mjs','list',
    '--group','NEW'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const summary=JSON.parse(result.stdout);
  assert.equal(summary.selected,19);
  assert.equal(summary.implemented,3);
  assert.equal(summary.unmapped,16);
  assert.ok(summary.uncoveredIDs.includes('NEW-19'));
});

test('v077 ID, priority and group selection rejects unknown cases',()=>{
  const cases=loadCases();
  assert.throws(()=>selectCases(cases,{ids:['NEW-99']}),/V077_UNKNOWN_CASE_ID/);
  assert.deepEqual(selectCases(cases,{group:'OLD',mappedOnly:true}).map(x=>x.id),
    ['OLD-03']);
  assert.ok(selectCases(cases,{priority:'P0'}).every(c=>c.priority==='P0'));
});
