import assert from 'node:assert/strict';
import {executeCase,enterCards,awaitDraft,exitEditorToList,draftBoxOpen,assertEditor} from '../helpers.mjs';
import {editor,evidence,step} from './core-support.mjs';
import {trace,reboot,snapshot,title,integrity,receipts} from './system-support.mjs';
import {nativeImage,reopen,protectedTables} from './p0-support.mjs';
const id=process.argv[2],out=process.argv[3];if(!['CLIP-14','CLIP-15','CLIP-16','FAULT-05'].includes(id))throw Error('UNKNOWN_P0_EDITOR');
await executeCase(id,out,async ctx=>{
 await trace(ctx);await enterCards(ctx);let p=ctx.session.page;await p.getByRole('button',{name:'编辑 '+title,exact:true}).click();const before=snapshot(ctx.fixture),text='T2-A safe text '+id;await editor(ctx,'body').fill(text);await awaitDraft(ctx,title,'body',text);
 if(id==='CLIP-15'){
  await ctx.session.app.evaluate(({clipboard,ClipboardItem})=>clipboard.write([new ClipboardItem({'text/plain':'<unsupported>bad</unsupported>','text/html':'<p>bad</p>'})]));await editor(ctx,'body').click();await editor(ctx,'body').press('Control+End');await p.keyboard.press('Control+V');await p.getByRole('alert').filter({hasText:'UNSUPPORTED_HTML'}).waitFor();assert.equal((await ctx.session.api.call('draft.get',ctx.fixture.card)).payload.fields.body.trim(),text);await editor(ctx,'body').press('End');await p.keyboard.type(' corrected');
 }else if(id==='CLIP-16'){
  // Actual selection and OS Copy, followed by native clipboard read and GUI Paste.
  await editor(ctx,'body').press('Control+A');await p.keyboard.press('Control+C');assert.equal((await ctx.session.app.evaluate(({clipboard})=>clipboard.readText())).trim(),text);await editor(ctx,'body').press('Control+End');await editor(ctx,'body').press('Enter');await p.keyboard.press('Control+V');
 }else{
  await nativeImage(ctx);await ctx.session.app.evaluate(()=>globalThis.v077Faults.hold('media.stage'));await editor(ctx,'body').click();await editor(ctx,'body').press('Control+End');await p.keyboard.press('Control+V');await waitMain(ctx, 'held');
  if(id==='FAULT-05'){
   await editor(ctx,'body').press('End');await p.keyboard.type(' changed while pending');await ctx.session.app.evaluate(()=>globalThis.v077Faults.release());await p.getByRole('alert').filter({hasText:'MEDIA_INSERTION_DOCUMENT_CHANGED_RETRY'}).waitFor();assert.equal(await editor(ctx,'body').locator('img').count(),0);
  }else{
   await exitEditorToList(ctx);await ctx.session.app.evaluate(()=>globalThis.v077Faults.release());await waitMain(ctx, 'released');await p.getByRole('button',{name:'编辑 '+title,exact:true}).click();await assertEditor(ctx,title,'body',text);assert.equal(await editor(ctx,'body').locator('img').count(),0);
  }
  const d=await ctx.session.api.call('draft.get',ctx.fixture.card);assert.equal(d.mediaRefs.length,0);assert.deepEqual(protectedTables(snapshot(ctx.fixture)),protectedTables(before));step(ctx,'Held real media.stage during GUI Ctrl+V; changed document or destroyed editor before release; no stale image insertion or committed reference');
 }
 const expected=id==='CLIP-15'?text+' corrected':id==='FAULT-05'?text+' changed while pending':text;
 const saved=await awaitDraft(ctx,title,'body',id==='CLIP-16'?text+'\n\n'+text:expected);if(id==='CLIP-16')assert.equal(saved.payload.fields.body.split(text).length-1,2);const post=snapshot(ctx.fixture);await exitEditorToList(ctx);await reboot(ctx);p=ctx.session.page;await reopen(ctx,title,'body',expected);assert.deepEqual((await ctx.session.api.call('draft.get',ctx.fixture.card)).payload,saved.payload);assert.deepEqual(snapshot(ctx.fixture).media,post.media);assert.deepEqual(protectedTables(snapshot(ctx.fixture)),protectedTables(before));
 if(['CLIP-14','FAULT-05'].includes(id)){assert.equal(await editor(ctx,'body').locator('img').count(),0);const s=snapshot(ctx.fixture);assert.deepEqual(s.tables.assets,before.tables.assets);ctx.observations.checks.stagedMedia={before:before.media,after:s.media};if(id==='FAULT-05')assert.deepEqual(s.media,before.media,'Rejected asynchronous paste must not retain unreferenced image files after restart');}
 ctx.observations.checks.draft=saved;step(ctx,'Visible error/recovery or system Copy/Paste verified; exact GUI draft and media tree restored after new PID');integrity(ctx);return evidence(ctx);
});

async function waitMain(ctx,key){const until=Date.now()+10000;while(Date.now()<until){if(await ctx.session.app.evaluate((_,k)=>globalThis.v077Faults.events().some(x=>x.method==='media.stage'&&x[k]&&(k!=='released'||x.ok)),key))return;await new Promise(r=>setTimeout(r,50));}throw Error('MEDIA_STAGE_CONDITION_NOT_MET:'+key);}
