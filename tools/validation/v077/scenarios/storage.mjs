import assert from 'node:assert/strict';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {stageBackup} from '../../../../electron/infrastructure/backup.ts';
import {DatabaseSync} from 'node:sqlite';
import {executeCase,enterCards,draftBoxOpen,assertEditor,exitEditorToList} from '../helpers.mjs';
import {evidence,step,editor} from './core-support.mjs';
import {trace,draft,title,backup,restorePreview,snapshot,protectedFacts,remove,restoreCard,reboot,integrity,hash,receipts} from './system-support.mjs';
const id=process.argv[2],out=process.argv[3];if(!['BACK-01','BACK-03','BACK-04','TRASH-02','TRASH-04'].includes(id)||!out)throw Error('UNSUPPORTED_STORAGE_CASE');
await executeCase(id,out,async ctx=>{
 await trace(ctx);const text='T1-C unpublished draft retained '+id,saved=await draft(ctx,text),original=snapshot(ctx.fixture);
 if(id.startsWith('BACK')){
  const file=await backup(ctx),staged=join(ctx.fixture.root,'verify-independent-backup');await stageBackup(file,staged);
  const db=new DatabaseSync(join(staged,'ganksoft.sqlite'),{readOnly:true});try{assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');for(const [table,rows]of Object.entries(original.tables))assert.deepEqual(db.prepare('SELECT * FROM "'+table+'" ORDER BY rowid').all(),rows);for(const [name,sha]of Object.entries(original.media))assert.equal(hash(readFileSync(join(staged,'attachments',name))),sha);}finally{db.close();}step(ctx,'Actual backup independently staged, all business tables, draft/history/knowledge/media byte hashes match');
  if(id==='BACK-03'){
   await ctx.session.page.getByRole('button',{name:'返回原页面',exact:true}).click();await draft(ctx,'T1-C after-backup changed draft must be replaced');assert.notDeepEqual(snapshot(ctx.fixture),original);
   const r=await restorePreview(ctx,file);await r.getByLabel('我确认用该备份替换全部当前数据',{exact:true}).check();await r.getByRole('button',{name:'确认恢复全部数据',exact:true}).click();await ctx.session.page.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();await ctx.session.api.call('app.capabilities',{});assert.deepEqual(snapshot(ctx.fixture),original);assert.ok((await receipts(ctx,'storage.restore.confirm')).some(e=>e.ok));step(ctx,'GUI restore confirmation replaced modified synthetic database; original complete facts restored');
  }else if(id==='BACK-04'){
   const r=await restorePreview(ctx,file),before=snapshot(ctx.fixture);await r.getByRole('button',{name:'取消恢复',exact:true}).click();await r.getByLabel('完整备份恢复预览',{exact:true}).waitFor({state:'hidden'});assert.deepEqual(snapshot(ctx.fixture),before);assert.equal((await receipts(ctx,'storage.restore.confirm')).length,0);step(ctx,'GUI restore confirmation canceled: no confirm request, exact zero business/media changes');await ctx.session.page.getByRole('button',{name:'返回原页面',exact:true}).click();
  }else await ctx.session.page.getByRole('button',{name:'返回原页面',exact:true}).click();
  await reboot(ctx);assert.deepEqual(snapshot(ctx.fixture),original);await enterCards(ctx);await draftBoxOpen(ctx,title);await assertEditor(ctx,title,'body',text);assert.deepEqual((await ctx.session.api.call('draft.get',ctx.fixture.card)).payload,saved.payload);
 }else{
  const protectedBefore=protectedFacts(ctx),published=await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card),history=(await ctx.session.api.call('learning.history.list',ctx.fixture.card)).items;assert.ok(history.length);await remove(ctx);assert.deepEqual(protectedFacts(ctx),protectedBefore);await restoreCard(ctx);assert.deepEqual(protectedFacts(ctx),protectedBefore);assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card),published);assert.deepEqual((await ctx.session.api.call('learning.history.list',ctx.fixture.card)).items,history);await enterCards(ctx);await draftBoxOpen(ctx,title);await assertEditor(ctx,title,'body',text);
  if(id==='TRASH-04'){await editor(ctx,'body').press('End');await editor(ctx,'body').press('Enter');await ctx.session.page.keyboard.type('restored draft remains editable');await ctx.session.page.getByTestId('save-draft').click();await ctx.session.page.locator('[data-save-state=clean]').waitFor();}
  await exitEditorToList(ctx);const before=snapshot(ctx.fixture);await reboot(ctx);assert.deepEqual(snapshot(ctx.fixture),before);await enterCards(ctx);await draftBoxOpen(ctx,title);await assertEditor(ctx,title,'body',id==='TRASH-04'?'restored draft remains editable':text);assert.deepEqual((await ctx.session.api.call('learning.history.list',ctx.fixture.card)).items,history);ctx.observations.checks.restored={cardId:ctx.fixture.card.cardId,published,history,draft:await ctx.session.api.call('draft.get',ctx.fixture.card)};step(ctx,'Restored card ID/content/history/schedule/media retained; draft reopened and remains editable across restart');
 }
 integrity(ctx);return evidence(ctx);
});
