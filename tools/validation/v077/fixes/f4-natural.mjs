// F4 supplemental native keyboard stress: no RAF control, delays, editor APIs or fixture edits.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fromMarkdown} from 'mdast-util-from-markdown';
import {executeCase,enterCards,awaitDraft,restart,draftBoxOpen} from '../helpers.mjs';
import {observe,editor,step} from '../scenarios/core-support.mjs';
import {integrity,snapshot} from '../scenarios/system-support.mjs';
import {map,selectNode,nodeRead} from '../scenarios/m3-support.mjs';
const [id,out,roundsArg='10']=process.argv.slice(2);
assert.ok(['EDITOR-10','MD-02'].includes(id));const rounds=Number(roundsArg);assert.ok(rounds>=1);
const card=id==='EDITOR-10',title='B2 保持发布和历史';
function markdownBlocks(markdown){
 const result=[];const text=n=>n.type==='text'?n.value:(n.children??[]).map(text).join('');
 const walk=n=>{if(['heading','paragraph'].includes(n.type)){result.push(text(n).replace(/^\[[ x]\] /,''));return;}(n.children??[]).forEach(walk);};
 walk(fromMarkdown(markdown));return result.filter(Boolean);
}
await executeCase(id,out,async ctx=>{
 await observe(ctx);let p=ctx.session.page,a;
 const rows=[];ctx.observations.checks={mode:'NATURAL_GUI_NO_TIMING_CONTROL',rounds:rows};
 async function open(first=false){
  p=ctx.session.page;
  if(card){await enterCards(ctx);if(first)await p.getByRole('button',{name:'编辑 '+title,exact:true}).click();else await draftBoxOpen(ctx,title);a=editor(ctx,'body');}
  else{await map(ctx);await selectNode(ctx,'生命周期乙');a=p.locator('.knowledge-markdown .ProseMirror[contenteditable=true]').first();}
  await a.waitFor();
 }
 async function gui(){return a.evaluate(root=>{const s=getSelection();const path=n=>{const result=[];while(n&&n!==root){if(!n.parentNode||!root.contains(n))return ['outside'];result.unshift([...n.parentNode.childNodes].indexOf(n));n=n.parentNode;}return result;};return {fullText:root.innerText,blocks:[...root.querySelectorAll('p,h1')].map(n=>n.textContent).filter(Boolean),selection:{anchorPath:path(s.anchorNode),anchorOffset:s.anchorOffset,headPath:path(s.focusNode),headOffset:s.focusOffset,anchorText:s.anchorNode?.textContent,headText:s.focusNode?.textContent}};});}
 async function read(){return card?(await ctx.session.api.call('draft.get',ctx.fixture.card)).payload.fields.body:(await nodeRead(ctx,ctx.fixture.ids[1])).markdown;}
 async function save(){await a.press('Control+s');if(card){await p.locator('output[data-save-state=clean]').waitFor();return (await awaitDraft(ctx,title)).payload.fields.body;}await p.locator('.knowledge-markdown [data-save-state=clean]').waitFor();return read();}
 await open(true);
 for(let round=1;round<=rounds;round++){
  const row={round,input:[],steps:[]};rows.push(row);
  const type=async text=>{row.input.push(text);await p.keyboard.type(text);};
  const key=async key=>{row.steps.push(key);await p.keyboard.press(key);};
  await a.click();await key('Control+a');await key('Backspace');
  await type(`F4第${round}轮基准`);await key('Enter');await type('# 一级标题');
  await key('Enter');await type('- 列表条目');
  await key('Enter');await type('English continuous abc');
  await key('Enter');await key('Tab');await type('嵌套条目');
  // Verify nesting before lifting the same item through the native key binding.
  assert.ok(await a.locator('ul ul,ol ul,ul ol,ol ol').count()>0,'Tab did not create native nested list');
  await key('Shift+Tab');await key('Enter');await key('Enter');await type('退出段落');
  await key('Enter');await type('- [ ] 任务条目');
  assert.ok(await a.locator('.label.unchecked').count()>0,'Task list shortcut lost');
  await a.locator('.label-wrapper:has(.label.unchecked)').last().click();
  assert.ok(await a.locator('.label.checked').count()>0,'Task checkbox toggle lost');
  // Return caret through actual text click and keyboard, then exit task list.
  await a.locator('p').filter({hasText:'任务条目'}).click();await key('End');
  await key('Enter');await key('Enter');await type('1. 有序条目');
  await key('Enter');await type('有序第二条');
  await key('Enter');await key('Enter');await type('终点');
  await key('ArrowLeft');await type('插');await key('Shift+ArrowLeft');await type('改');
  const beforeUndo=await gui();await key('Control+z');row.afterUndo=await gui();await key('Control+Shift+z');
  row.gui=await gui();assert.deepEqual(row.gui.blocks,beforeUndo.blocks,'Native redo did not restore exact text');
  const expected=[`F4第${round}轮基准`,'一级标题','列表条目','English continuous abc','嵌套条目','退出段落','任务条目','有序条目','有序第二条','终改点'];
  row.expectedBlocks=expected;assert.deepEqual(row.gui.blocks,expected,'GUI characters displaced');
  assert.equal(row.gui.selection.anchorText,'终改点');assert.equal(row.gui.selection.anchorOffset,2);
  row.markdown=await save();assert.deepEqual(markdownBlocks(row.markdown),expected,'Serialized Markdown order differs');
  assert.match(row.markdown,/\[[xX]\] 任务条目/);assert.match(row.markdown,/1\. 有序条目/);
  const sql=snapshot(ctx.fixture).tables;
  if(card){const r=sql.learning_card_drafts.find(r=>r.card_id===ctx.fixture.card.cardId);row.sqlite=JSON.parse(r.payload).document.payload.fields.body;}
  else{const r=Object.values(sql).flat().find(r=>r.key==='unified-knowledge-body:'+ctx.fixture.ids[1]);row.sqlite=JSON.parse(r.value).markdown;}
  assert.equal(row.sqlite,row.markdown,'SQLite differs from serialized Markdown');
  await p.screenshot({path:join(out,`round-${round}.png`)});
  // Close/reopen within this process, then independently re-open in a new PID.
  await p.getByRole('button',{name:card?/返回上一页/:'返回所有卡片',exact:!card}).click();
  await open();row.samePidReopen=await gui();assert.deepEqual(row.samePidReopen.blocks,expected);assert.equal(await read(),row.markdown);
  row.reboot=await restart(ctx);await observe(ctx);await open();row.reopened=await gui();row.reloadedMarkdown=await read();
  assert.deepEqual(row.reopened.blocks,expected);assert.equal(row.reloadedMarkdown,row.markdown);
  row.status='PASS';writeFileSync(join(out,'rounds.json'),JSON.stringify(rows,null,2)+'\n');
  console.log(id+' natural round '+round+' PASS pid '+row.reboot.newPid);
 }
 integrity(ctx);step(ctx,`${rounds} native GUI rounds: shortcut/Chinese/English/Enter/nesting/task/ordered/selection/undo/redo/save/close/reopen/new PID/SQLite equality`);
 writeFileSync(join(out,'rounds.json'),JSON.stringify(rows,null,2)+'\n');
 return {steps:ctx.observations.steps,checks:{roundCount:rows.length,failures:0,mode:'NATURAL_GUI_NO_TIMING_CONTROL'},evidence:['rounds.json',...rows.map(r=>`round-${r.round}.png`)],kind:'SUPPLEMENTAL_REGRESSION_NOT_CASE_PROMOTION'};
});
