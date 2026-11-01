// Derive live status without changing the owner's frozen 17-batch Markdown plan.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {moduleForCase} from './modules.mjs';
import {loadCases} from './registry.mjs';
const all=loadCases(),baseline=JSON.parse(readFileSync('docs/v077/evidence/T2-REMAINING-BASELINE.json'));
const text=readFileSync('docs/v077/REMAINING-207-PLAN.md','utf8'),assignments=new Map();
const sections=[...text.matchAll(/^### (T2-(?:P[012]|W)\.[\d]+)[^\n]*\n([\s\S]*?)(?=^### |^## |$(?![\s\S]))/gm)];
assert.equal(sections.length,17,'FROZEN_17_BATCH_PLAN_REQUIRED');
for(const s of sections){const line=s[2].match(/`((?:[A-Z]+-\d{2})(?:, [A-Z]+-\d{2})*)`/);assert.ok(line,'MISSING_FROZEN_IDS');for(const id of line[1].split(', ')){assert.ok(!assignments.has(id));assignments.set(id,s[1]);}}
assert.equal(assignments.size,207);
const rows=baseline.cases.map(b=>{const x=all.find(x=>x.id===b.id),batch=assignments.get(b.id);assert.ok(x&&batch);const stage=batch.startsWith('T2-P0')?'T2-A':batch.startsWith('T2-P1')?'T2-B':batch.startsWith('T2-P2')?'T2-C':'T2-W';const physical=x.id.startsWith('WIN-')||/IME|物理 Windows|Windows Word|Windows.*实机/.test(x.operation+' '+x.assertion);return {id:x.id,module:moduleForCase(x.id).id,priority:x.priority,batch,stage,platformFollowUp:physical?'T2-W.01':null,environment:physical?'真实Windows10/11；原始IME/剪贴板/原生系统交互':'Electron GUI + 隔离Schema606；目录/文件注入仅旁证，不代签真实系统弹窗',status:x.electronUi,operation:x.operation,assertion:x.assertion};});
writeFileSync('docs/v077/evidence/T2-REMAINING-PLAN.json',JSON.stringify({schema:'ganksoft.v077/remaining-plan-1',baselineSha:baseline.sourceSha,baselineCount:207,p0Count:35,ownerPlan:'docs/v077/REMAINING-207-PLAN.md',rows},null,2)+'\n');
console.log(JSON.stringify({baseline:207,batches:17,p0:35,markdownUnchanged:true}));
