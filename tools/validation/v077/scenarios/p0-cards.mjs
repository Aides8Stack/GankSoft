import assert from 'node:assert/strict';
import {executeCase,enterCards,awaitDraft,exitEditorToList,draftBoxOpen,assertEditor} from '../helpers.mjs';
import {evidence,editor,step} from './core-support.mjs';
import {trace,reboot,snapshot,title,integrity,receipts,arm,clear} from './system-support.mjs';
import {qaFixture,qaTitle,paginationFixture,oldMediaFixture,pasteImage,loaded,reopen,protectedTables} from './p0-support.mjs';
const id=process.argv[2],out=process.argv[3];
const ids=['NEW-05','NEW-09','NEW-19','OLD-02','OLD-06','OLD-07','OLD-08','OLD-09','OLD-10','OLD-11','OLD-14'];if(!ids.includes(id))throw Error('UNKNOWN_P0_CARD');
await executeCase(id,out,async ctx=>{
 await trace(ctx);await enterCards(ctx);let p=ctx.session.page;
 if(id==='NEW-19'){
  const check=async()=>{await p.getByRole('button',{name:'草稿箱',exact:true}).click();const nav=p.getByRole('navigation',{name:'已保存草稿'}),more=nav.getByRole('button',{name:'更多草稿',exact:true});await more.waitFor();let pages=1;while(await more.isVisible()){assert.ok(pages<5);const count=await nav.getByRole('button').count();await more.click();await p.waitForFunction(n=>document.querySelector('[aria-label="已保存草稿"]').querySelectorAll('button').length!==n,count);pages++;}const names=await nav.getByRole('button').allTextContents();assert.deepEqual(names.map(x=>x.trim()).sort(),ctx.fixture.expectedDrafts.map(x=>x.title).sort());assert.ok(pages>1);const read=(await ctx.session.api.call('draft.listSummary',{deckId:ctx.fixture.deck.id,limit:100})).items;assert.deepEqual(read.map(x=>x.cardId).sort(),ctx.fixture.expectedDrafts.map(x=>x.id).sort());ctx.observations.checks.pagination={pages,count:names.length};};
  await check();await reboot(ctx);p=ctx.session.page;await enterCards(ctx);await check();step(ctx,'GUI draft inbox pagination and fresh reload show exact 53 mixed new/existing drafts without duplicate or omission');
 }else{
  const isNew=id.startsWith('NEW'),name=isNew?'T2-A '+id:id==='OLD-02'?qaTitle:title,field=id==='OLD-02'?'back':isNew?'stem':'body',card=id==='OLD-02'?ctx.fixture.qa:ctx.fixture.card;
  const before=snapshot(ctx.fixture),published=isNew?null:await ctx.session.api.call('card.getPublishedContent',card);
  if(isNew){await p.getByRole('button',{name:'新建卡片',exact:true}).click();await p.getByTestId('draft-title').fill(name);}else await p.getByRole('button',{name:'编辑 '+name,exact:true}).click();
  let text=id==='NEW-05'?'':`T2-A ${id} retained content`;if(id!=='NEW-05')await editor(ctx,field).fill(text);
  if(id==='NEW-09'||id==='OLD-06'){await pasteImage(ctx,field);await p.getByTestId('save-draft').click();}
  if(id==='OLD-14'){
   await awaitDraft(ctx,name,field,text);await arm(ctx,'draft.save');await editor(ctx,field).press('End');await p.keyboard.type(' unsaved');await p.locator('[data-save-state=error]').waitFor();
   const button=p.getByTestId('publish-card'),disabled=await button.isDisabled();if(!disabled)await button.click();assert.equal((await receipts(ctx,'card.publish')).length,0);assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',card),published);assert.equal(await p.locator('[data-save-state=error]').count(),1);step(ctx,'Visible save error; immediate publish is blocked and no publish IPC or version write occurs');await clear(ctx);await p.getByTestId('save-draft').click();text+=' unsaved';
  }
  const saved=await awaitDraft(ctx,name,field,text);assert.equal(saved.title,name);
  if(id==='NEW-05')assert.equal(saved.payload.fields.stem.trim(),'');
  if(!isNew){assert.equal(saved.cardId,card.cardId);assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',card),published);assert.deepEqual(protectedTables(snapshot(ctx.fixture)),protectedTables(before));}
  if(id==='NEW-09'||id==='OLD-06'){if(id==='OLD-06'){assert.equal(published.mediaRefs.length,1);assert.ok(saved.mediaRefs.some(r=>r.assetId!==published.mediaRefs[0].assetId&&saved.payload.fields.body.includes('gank-asset://'+r.assetId)));assert.equal(snapshot(ctx.fixture).media[ctx.fixture.oldMedia.fileName],before.media[ctx.fixture.oldMedia.fileName]);}assert.equal(saved.mediaRefs.length,id==='OLD-06'?2:1);assert.ok(saved.mediaRefs[0].placementId);assert.ok(saved.mediaRefs[0].width>0);ctx.observations.checks.media=saved.mediaRefs;}
  await exitEditorToList(ctx);
  if(id==='OLD-08'){await p.getByRole('button',{name:name,exact:true}).click();await p.getByRole('button',{name:'编辑卡片',exact:true}).click();await assertEditor(ctx,name,field,text);await exitEditorToList(ctx);step(ctx,'Detail edit entry prefers the unpublished draft');}
  else{await draftBoxOpen(ctx,name);await assertEditor(ctx,name,field,text);await exitEditorToList(ctx);}
  if(id==='OLD-07'){await p.getByRole('button',{name:'编辑 '+name,exact:true}).click();await editor(ctx,field).fill(text+' rapid exit');await exitEditorToList(ctx);text+=' rapid exit';await awaitDraft(ctx,name,field,text,false);}
  await reboot(ctx);p=ctx.session.page;await reopen(ctx,name,field,text);
  if(id==='OLD-09'){assert.deepEqual(protectedTables(snapshot(ctx.fixture)),protectedTables(before));await exitEditorToList(ctx);await p.getByRole('table').getByRole('button',{name:name,exact:true}).click();await p.getByRole('button',{name:'查看学习历史',exact:true}).click();await p.locator('.detail-history-list button').first().click();assert.match(await p.locator('[aria-label="当次复盘证据"]').innerText(),/B2合成历史/);}
  if(id==='OLD-10'||id==='OLD-11'){
   if(id==='OLD-10'){await exitEditorToList(ctx);await reboot(ctx);p=ctx.session.page;await reopen(ctx,name,field,text);}
   await p.getByTestId('publish-card').click();await p.getByRole('status').filter({hasText:'发布成功，历史已保留'}).waitFor();const v=snapshot(ctx.fixture).tables.learning_content_versions.filter(v=>v.card_id===card.cardId);assert.equal(v.length,2);assert.ok(v.some(v=>before.tables.learning_content_versions.some(b=>JSON.stringify(v)===JSON.stringify(b))));await exitEditorToList(ctx);await p.getByRole('button',{name:'草稿箱',exact:true}).click();assert.equal(await p.getByRole('navigation',{name:'已保存草稿'}).getByRole('button',{name,exact:true}).count(),0);const cards=(await ctx.session.api.call('card.listSummary',{deckId:ctx.fixture.deck.id,limit:100})).items;assert.equal(cards.filter(x=>x.cardId===card.cardId).length,1);assert.equal((await ctx.session.api.call('draft.listSummary',{deckId:ctx.fixture.deck.id})).items.length,0);await reboot(ctx);p=ctx.session.page;await enterCards(ctx);await p.getByRole('button',{name,exact:true}).waitFor();assert.equal(snapshot(ctx.fixture).tables.learning_content_versions.filter(v=>v.card_id===card.cardId).length,2);step(ctx,'GUI publish creates exactly one new version, retains old version and identity, removes draft; persisted after new PID');
  }else if(id!=='OLD-09'){
   const restored=await ctx.session.api.call('draft.get',{deckId:ctx.fixture.deck.id,cardId:saved.cardId});assert.equal(restored.cardId,saved.cardId);assert.equal(restored.payload.fields[field].includes(text),true);assert.equal((await ctx.session.api.call('draft.listSummary',{deckId:ctx.fixture.deck.id,limit:100})).items.filter(x=>x.cardId===saved.cardId).length,1);
   if(id==='NEW-09'||id==='OLD-06'){await loaded(editor(ctx,field).locator('img[data-gank-placement]'));assert.deepEqual(restored.mediaRefs,saved.mediaRefs);assert.deepEqual(snapshot(ctx.fixture).media,ctx.beforeRestart[0].database.media);}
  }
  step(ctx,'GUI edit/title-only change, visible saved feedback, inbox/reopen and independent PID readback; SQLite protects published facts');
 }
 integrity(ctx);return evidence(ctx);
},{fixtureSetup:id==='NEW-19'?paginationFixture:id==='OLD-02'?qaFixture:id==='OLD-06'?oldMediaFixture:undefined});
