import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCases} from '../tools/validation/v077/registry.mjs';
import {moduleForCase} from '../tools/validation/v077/modules.mjs';
test('all 207 frozen pending cases have a unique module, batch, environment and ledger status',()=>{
 const baseline=JSON.parse(readFileSync('docs/v077/evidence/T2-REMAINING-BASELINE.json','utf8'));
 const plan=JSON.parse(readFileSync('docs/v077/evidence/T2-REMAINING-PLAN.json','utf8'));
 const ledger=loadCases();assert.equal(baseline.cases.length,207);assert.equal(plan.rows.length,207);
 assert.equal(new Set(plan.rows.map(r=>r.id)).size,207);assert.deepEqual(plan.rows.map(r=>r.id),baseline.cases.map(r=>r.id));
 assert.equal(plan.rows.filter(r=>r.priority==='P0').length,35);
 for(const r of plan.rows){const c=ledger.find(c=>c.id===r.id);assert.ok(c);assert.equal(r.module,moduleForCase(r.id).id);assert.equal(r.priority,c.priority);assert.equal(r.status,c.electronUi);assert.ok(r.environment);assert.match(r.batch,/^T2-(P[012]|W)\.\d+$/);}
 for(const b of new Set(plan.rows.map(r=>r.batch)))assert.ok(plan.rows.filter(r=>r.batch===b).length<=20);
});
test('real Windows clipboard and IME cases are queued on real Windows; inherited failures excluded',()=>{
 const p=JSON.parse(readFileSync('docs/v077/evidence/T2-REMAINING-PLAN.json','utf8'));
 for(const id of ['NEW-13','CLIP-03','CLIP-09','WIN-09'])assert.equal(p.rows.find(r=>r.id===id).platformFollowUp,'T2-W.01');
 for(const id of ['NEW-16','MEDIA-03','NEW-01'])assert.ok(!p.rows.some(r=>r.id===id));
});
