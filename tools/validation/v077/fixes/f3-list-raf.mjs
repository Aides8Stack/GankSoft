// Diagnostic timing control only: release the original list-mount RAF after a real
// keystroke. No editor document/selection API is invoked by this test.
import assert from 'node:assert/strict';
import {executeCase,enterCards,awaitDraft,restart,draftBoxOpen} from '../helpers.mjs';
import {observe,evidence,editor,step} from '../scenarios/core-support.mjs';
import {integrity,snapshot} from '../scenarios/system-support.mjs';
import {map,selectNode,nodeRead} from '../scenarios/m3-support.mjs';
const [id,out]=process.argv.slice(2);if(!['EDITOR-10','MD-02'].includes(id)||!out)throw Error('F3_DIAGNOSTIC_REQUIRED');
await executeCase(id,out,async ctx=>{
 await observe(ctx);let p=ctx.session.page;const isCard=id==='EDITOR-10';
 await p.evaluate(()=>{
  window.f3Held=[];window.f3Frames=[];
  const original=window.requestAnimationFrame.bind(window);
  const capture=()=>{const s=getSelection();return {text:document.querySelector('.ProseMirror')?.innerText,anchorOffset:s?.anchorOffset,focusOffset:s?.focusOffset,anchorText:s?.anchorNode?.textContent,focusText:s?.focusNode?.textContent};};
  window.requestAnimationFrame=cb=>{
   const source=String(cb);
   if(source.includes('.setSelection(')&&source.includes('.between(')&&source.includes('.isDestroyed')){
    const row={source,scheduled:capture()};window.f3Frames.push(row);
    return original(t=>window.f3Held.push(()=>{row.before=capture();cb(t);row.after=capture();}));
   }
   return original(cb);
  };
 });
 let a;
 if(isCard){await enterCards(ctx);await p.getByRole('button',{name:'编辑 B2 保持发布和历史',exact:true}).click();a=editor(ctx,'body');}
 else{await map(ctx);await selectNode(ctx,'生命周期乙');a=p.locator('.knowledge-markdown .ProseMirror[contenteditable=true]').first();}
 await a.click();await p.keyboard.press('Control+a');await p.keyboard.press('Backspace');
 await p.keyboard.type('基准');await p.keyboard.press('Enter');await p.keyboard.type('- ');
 await p.waitForFunction(()=>window.f3Held.length>0);
 await p.keyboard.type('列');
 const before=await a.innerText();
 await p.evaluate(()=>{for(const release of window.f3Held.splice(0))release();});
 await p.keyboard.type('表条目');
 const after=await a.innerText();
 let saved;
 if(isCard){await p.getByTestId('save-draft').click();saved=(await awaitDraft(ctx,'B2 保持发布和历史')).payload.fields.body;}
 else{await a.press('Control+s');await p.locator('.knowledge-markdown [data-save-state=clean]').waitFor();saved=(await nodeRead(ctx,ctx.fixture.ids[1])).markdown;}
 const frames=await p.evaluate(()=>window.f3Frames);
 assert.ok(frames.length>0,'Did not intercept known list restore callback');
 assert.ok(!saved.includes('列表条目'),'Controlled stale restore did not reproduce corruption');
 const tables=snapshot(ctx.fixture).tables;const sql=isCard?tables.learning_card_drafts.filter(r=>r.card_id===ctx.fixture.card.cardId):tables;
 assert.ok(JSON.stringify(sql).includes('表条目'));
 ctx.observations.checks={timing:'Original RAF held until one real Chinese character is typed; controlled diagnostic, not spontaneous user timing',beforeRelease:before,afterRelease:after,frames,persistedMarkdown:saved,sqliteRows:sql};
 const reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
 if(isCard){await enterCards(ctx);await draftBoxOpen(ctx,'B2 保持发布和历史');assert.equal((await ctx.session.api.call('draft.get',ctx.fixture.card)).payload.fields.body,saved);}
 else{await map(ctx);await selectNode(ctx,'生命周期乙');assert.equal((await nodeRead(ctx,ctx.fixture.ids[1])).markdown,saved);}
 step(ctx,'Original list-mount RAF restores stale capture after real Chinese input; subsequent characters insert out of order, persist in SQLite and survive new PID');
 integrity(ctx);return {...await evidence(ctx),kind:'DIAGNOSTIC_REPRODUCTION_CONFIRMED',actual:'Original deferred callback caused corruption; diagnostic PASS is not a product CASE PASS',reboot};
});
