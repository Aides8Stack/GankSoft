import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {executeCase,enterCards,awaitDraft,restart,draftBoxOpen} from '../helpers.mjs';
import {observe,evidence,step,editor} from '../scenarios/core-support.mjs';
import {integrity,snapshot} from '../scenarios/system-support.mjs';
import {map,selectNode,nodeRead} from '../scenarios/m3-support.mjs';
const [id,out]=process.argv.slice(2);if(!['EDITOR-10','MD-02'].includes(id)||!out)throw Error('F3_CASE_REQUIRED');
await executeCase(id,out,async ctx=>{
 await observe(ctx);let p=ctx.session.page,a;
 const isCard=id==='EDITOR-10';
 const original=await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card);
 if(isCard){await enterCards(ctx);await p.getByRole('button',{name:'编辑 B2 保持发布和历史',exact:true}).click();a=editor(ctx,'body');}
 else{await map(ctx);await selectNode(ctx,'生命周期乙');a=p.locator('.knowledge-markdown .ProseMirror[contenteditable=true]').first();}
 await a.waitFor();
 // Observe native events only. Never set selection or editor state through JS.
 await a.evaluate(root=>{
  window.f3Trace=[];
  const location=n=>{if(!n)return null;const parts=[];while(n&&n!==root){const parent=n.parentNode;if(!parent)return 'outside';parts.unshift([...parent.childNodes].indexOf(n));n=parent;}return parts.join('.');};
  const sample=e=>{const s=getSelection();if(e.type==='selectionchange'&&!root.contains(s?.anchorNode))return;
   window.f3Trace.push({event:e.type,key:e.key,data:e.data,inputType:e.inputType,prevented:e.defaultPrevented,text:root.innerText,
    anchor:location(s?.anchorNode),anchorOffset:s?.anchorOffset,focus:location(s?.focusNode),focusOffset:s?.focusOffset});};
  for(const type of ['keydown','beforeinput','input','keyup'])root.addEventListener(type,sample);
  document.addEventListener('selectionchange',sample);
 });
 await a.click();await p.keyboard.press('Control+a');await p.keyboard.press('Backspace');
 await p.keyboard.type(isCard?'格式基准':'MD-02 标题与清单');
 if(isCard){await p.keyboard.press('Control+Home');await p.keyboard.press('Control+a');await p.keyboard.press('Control+b');await p.keyboard.press('Control+i');await p.keyboard.press('ArrowRight');}
 // Keep Enter -> subsequent typing contiguous, with no sleeps, snapshots or editor API calls.
 await p.keyboard.press('End');await p.keyboard.press('Enter');await p.keyboard.type('# 一级标题');
 await p.keyboard.press('Enter');await p.keyboard.type(isCard?'- 列表条目':'- Markdown 列表');
 await p.keyboard.press('Enter');await p.keyboard.press('Enter');await p.keyboard.type('> 引用段落');
 await p.keyboard.press('Enter');await p.keyboard.press('Enter');
 await p.keyboard.type('```\ncode one\n```');
 await p.keyboard.press('ArrowDown');await p.keyboard.press('End');await p.keyboard.press('Enter');
 await p.keyboard.type('中文连续输入 English end');
 // A real selected range and replacement, insertion, arrows and newline.
 await p.keyboard.press('Control+Home');await p.keyboard.press('Shift+ArrowRight');await p.keyboard.type('首');
 await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowLeft');await p.keyboard.type('插');
 await p.keyboard.press('Control+End');
 const beforeSave=await a.innerText();const trace=await p.evaluate(()=>window.f3Trace);
 writeFileSync(join(out,'native-input-trace.json'),JSON.stringify(trace,null,2)+'\n');
 await a.press('Control+s');
 let saved;
 if(isCard){await p.locator('output[data-save-state=clean]').waitFor();saved=(await awaitDraft(ctx,'B2 保持发布和历史')).payload.fields.body;}
 else{await p.locator('.knowledge-markdown [data-save-state=clean]').waitFor();saved=(await nodeRead(ctx,ctx.fixture.ids[1])).markdown;}
 const sql=snapshot(ctx.fixture);
 const rows=isCard?sql.tables.learning_card_drafts.filter(r=>r.card_id===ctx.fixture.card.cardId):sql.tables.knowledge_nodes;
 assert.ok(JSON.stringify(rows??sql.tables).includes(isCard?'code':'Markdown'),'Read-only SQLite evidence missing body');
 assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card),original,'Editing body altered published version');
 const expected=['一级标题',isCard?'列表条目':'Markdown 列表','引用段落','code one','中文连续输入 English end'];
 const missing=expected.filter(s=>!saved.includes(s));
 ctx.observations.checks={expected,missing,visibleBeforeSave:beforeSave,persistedMarkdown:saved,sqliteRows:rows};
 writeFileSync(join(out,'persisted-difference.json'),JSON.stringify(ctx.observations.checks,null,2)+'\n');
 const reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
 if(isCard){await enterCards(ctx);await draftBoxOpen(ctx,'B2 保持发布和历史');a=editor(ctx,'body');assert.equal((await ctx.session.api.call('draft.get',ctx.fixture.card)).payload.fields.body,saved);}
 else{await map(ctx);await selectNode(ctx,'生命周期乙');a=p.locator('.knowledge-markdown .ProseMirror[contenteditable=true]').first();assert.equal((await nodeRead(ctx,ctx.fixture.ids[1])).markdown,saved);}
 await a.waitFor();ctx.observations.checks.reopenedText=await a.innerText();
 step(ctx,'Real keyboard heading/list/Enter/Chinese/English/code/selection/insert; GUI save and SQLite readback plus fresh PID reopen');
 integrity(ctx);const proof=await evidence(ctx);proof.evidence.push('native-input-trace.json','persisted-difference.json');
 if(missing.length){process.exitCode=1;return {...proof,status:'FAIL',kind:'PRODUCT_FAILURE',actual:'Keyboard content displaced and persisted; missing exact text: '+missing.join(' | '),reboot};}
 return {...proof,actual:'Targeted current-source keyboard chains did not reproduce displacement; historical defect retained',reboot};
});
