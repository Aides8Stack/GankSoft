// Test-only interception of the exact guarded list RAF closure in the sealed bundle.
// Never used by production. Executes even cancelled old callbacks to test revocation.
import assert from 'node:assert/strict';
import {executeCase,enterCards,awaitDraft,restart,draftBoxOpen} from '../helpers.mjs';
import {observe,editor,step} from '../scenarios/core-support.mjs';
import {map,selectNode,nodeRead} from '../scenarios/m3-support.mjs';
import {integrity,snapshot} from '../scenarios/system-support.mjs';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
const [id,out]=process.argv.slice(2);assert.ok(['EDITOR-10','MD-02'].includes(id));
const card=id==='EDITOR-10';
await executeCase(id,out,async ctx=>{
 await observe(ctx);let p=ctx.session.page,a;
 if(card){await enterCards(ctx);await p.getByRole('button',{name:'编辑 B2 保持发布和历史',exact:true}).click();a=editor(ctx,'body');}
 else{await map(ctx);await selectNode(ctx,'生命周期乙');a=p.locator('.knowledge-markdown .ProseMirror[contenteditable=true]').first();}
 await a.evaluate(root=>{
  const original=window.requestAnimationFrame.bind(window);
  const pattern=/^\(\)=>\{([\w$]+)===([\w$]+)&&\(\1=void 0,([\w$]+)\(\)\)\}$/;
  const sample=()=>{const s=getSelection();return {text:root.innerText,anchor:s?.anchorOffset,head:s?.focusOffset,anchorText:s?.anchorNode?.textContent,headText:s?.focusNode?.textContent};};
  window.f4={held:[],releases:[],sample,original};
  window.requestAnimationFrame=callback=>{
   const source=String(callback);
   if(!pattern.test(source))return original(callback);
   const row={source,scheduled:sample()};
   window.f4.held.push(()=>{row.before=sample();callback(performance.now());row.after=sample();window.f4.releases.push(row);});
   return original(()=>{});
  };
 });
 const results=[];ctx.observations.checks={mode:'CONTROLLED_RAF_NOT_PRODUCT_CASE',results};
 const sample=()=>p.evaluate(()=>window.f4.sample());
 const release=()=>p.evaluate(()=>{const list=window.f4.held.splice(0);if(!list.length)throw Error('No guarded list RAF captured');for(const cb of list)cb();return window.f4.releases;});
 async function setup(){
  await a.click();await p.keyboard.press('Control+a');await p.keyboard.press('Backspace');
  await p.keyboard.type('基准');await p.keyboard.press('Enter');await p.keyboard.type('- ');
  assert.ok(await p.evaluate(()=>window.f4.held.length)>0,'Sealed production guarded RAF not intercepted');
 }
 for(const mode of ['chinese','english','arrow','range','blur-refocus','composition','unmount']){
  await setup();const row={mode};results.push(row);
  if(mode==='unmount'){
   await p.keyboard.press('Backspace');row.before=await sample();row.frames=await release();row.after=await sample();
   assert.deepEqual(row.after,row.before);continue;
  }
  if(mode==='composition'){
   const cdp=await p.context().newCDPSession(p);
   await cdp.send('Input.imeSetComposition',{text:'中文',selectionStart:2,selectionEnd:2});
   row.before=await sample();row.frames=await release();row.after=await sample();assert.deepEqual(row.after,row.before);
   await cdp.send('Input.insertText',{text:'中文'});await cdp.detach();
   assert.ok((await a.innerText()).includes('中文'),'Chromium composition commit truncated');
  }else{
   await p.keyboard.type(mode==='english'?'E':'列');
   if(mode==='arrow')await p.keyboard.press('ArrowLeft');
   if(mode==='range')await p.keyboard.press('Shift+ArrowLeft');
   if(mode==='blur-refocus'){await (card?p.getByTestId('draft-title'):p.locator('.knowledge-markdown input[type=color]')).focus();await a.focus();}
   row.before=await sample();row.frames=await release();row.after=await sample();assert.deepEqual(row.after,row.before,'Old callback overwrote current caret/text');
   if(mode==='chinese'){await p.keyboard.type('表条目');assert.ok((await a.innerText()).includes('列表条目'));}
   if(mode==='english'){await p.keyboard.type('nglish sequence');assert.ok((await a.innerText()).includes('English sequence'));}
  }
 }
 // Legitimate restore: same-turn Enter key handler mounts a new list item.
 // This one synthetic event tests the repair branch before DOM observers run;
 // natural Enter input is separately covered in all 20 genuine GUI rounds.
 // Disturb only the browser DOM selection in the same JS turn, then release
 // before its DOM observer can produce a newer PM transaction.
 await setup();await p.keyboard.type('合法列表');await release();
 const legitimate=await a.evaluate(root=>{
  root.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true}));
  const f=window.f4;if(!f.held.length)throw Error('Enter mount did not schedule repair');
  const before=f.sample();getSelection().collapse(root.querySelector('p').firstChild,0);
  const disturbed=f.sample();for(const cb of f.held.splice(0))cb();return {before,disturbed,after:f.sample(),frames:f.releases.slice(-1)};
 });
 assert.deepEqual(legitimate.after,legitimate.before,'Current mount selection repair no longer works');
 assert.notDeepEqual(legitimate.disturbed,legitimate.before);results.push({mode:'legitimate-DOM-repair',...legitimate});
 await p.keyboard.type('中文English 完整持久化');
 const gui=await a.innerText();await a.press('Control+s');let md;
 if(card){await p.locator('output[data-save-state=clean]').waitFor();md=(await awaitDraft(ctx,'B2 保持发布和历史')).payload.fields.body;}
 else{await p.locator('.knowledge-markdown [data-save-state=clean]').waitFor();md=(await nodeRead(ctx,ctx.fixture.ids[1])).markdown;}
 assert.ok(md.includes('中文English 完整持久化'));
 const tables=snapshot(ctx.fixture).tables;
 const sqlite=card?JSON.parse(tables.learning_card_drafts.find(r=>r.card_id===ctx.fixture.card.cardId).payload).document.payload.fields.body:
  JSON.parse(Object.values(tables).flat().find(r=>r.key==='unified-knowledge-body:'+ctx.fixture.ids[1]).value).markdown;
 assert.equal(sqlite,md);const reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
 if(card){await enterCards(ctx);await draftBoxOpen(ctx,'B2 保持发布和历史');a=editor(ctx,'body');assert.equal((await ctx.session.api.call('draft.get',ctx.fixture.card)).payload.fields.body,md);}
 else{await map(ctx);await selectNode(ctx,'生命周期乙');a=p.locator('.knowledge-markdown .ProseMirror[contenteditable=true]').first();assert.equal((await nodeRead(ctx,ctx.fixture.ids[1])).markdown,md);}
 assert.equal(await a.innerText(),gui);integrity(ctx);
 writeFileSync(join(out,'controlled.json'),JSON.stringify({results,gui,markdown:md,sqlite,reboot,reopened:await a.innerText()},null,2)+'\n');
 await p.screenshot({path:join(out,'result.png')});
 step(ctx,'Held exact guarded production RAF: subsequent Chinese/English/arrows/range/blur/composition/unmount preserved; legitimate repair and persistence/new PID preserved');
 return {steps:ctx.observations.steps,evidence:['controlled.json','result.png'],kind:'SUPPLEMENTAL_CONTROLLED_DIAGNOSTIC_NOT_CASE_PROMOTION'};
});
