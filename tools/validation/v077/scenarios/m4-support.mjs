// M4 shared drivers. GUI mutates production; fixtureSetup alone may prepare synthetic source data.
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {mkdirSync,existsSync,readFileSync} from 'node:fs';
import {stageBackup} from '../../../../electron/infrastructure/backup.ts';
import {enterCards,awaitDraft,exitEditorToList,restart,draftBoxOpen} from '../helpers.mjs';
import {observe,step,editor} from './core-support.mjs';
import {settings,selectFile,backup,exportPackage,openPackage,protectedFacts,
  snapshot,integrity,receipts,readContainer,hash} from './system-support.mjs';
import {oldMediaFixture,qaFixture,fixtureOwner} from './p0-support.mjs';
import {writeImage,writeRich,paste,saveDraft,openPublished,openTransfer,copyCard,parseTransfer,
  confirmTransfer,cancelTransfer,clipText} from './m2-support.mjs';
export {settings,selectFile,backup,exportPackage,openPackage,protectedFacts,
  snapshot,integrity,receipts,readContainer,hash,oldMediaFixture,qaFixture,fixtureOwner,
  writeImage,writeRich,paste,saveDraft,openPublished,openTransfer,copyCard,parseTransfer,
  confirmTransfer,cancelTransfer,clipText,enterCards,awaitDraft,exitEditorToList,
  restart,draftBoxOpen,editor,step,observe};
export const nativeTitle='B2 保持发布和历史';
export const sameFacts=(a,b,msg='No persistent business changes')=>assert.deepEqual(a,b,msg);
export const published=ctx=>ctx.session.api.call('card.getPublishedContent',ctx.fixture.card);
export const draft=ctx=>ctx.session.api.call('draft.get',ctx.fixture.card);
export const history=ctx=>(ctx.session.api.call('learning.history.list',ctx.fixture.card));
export const catalog=ctx=>ctx.session.api.call('workspace.catalog',{});
export const cardList=ctx=>ctx.session.api.call('card.listSummary',{deckId:ctx.fixture.deck.id,limit:100});
export const mediaList=(ctx,query='')=>ctx.session.api.call('media.library.list',{deckId:ctx.fixture.deck.id,query,offset:0});
export async function openMedia(ctx){
  await enterCards(ctx);
  const p=ctx.session.page;
  await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'图片资源',exact:true}).click();
  const region=p.getByRole('region',{name:'卡片集图片资源',exact:true});
  await region.getByRole('heading',{name:'图片资源',exact:true}).waitFor();
  return region;
}
export async function inspectMedia(ctx,assetId){
  const region=await openMedia(ctx);
  const row=region.locator('[data-resource="'+assetId+'"]');
  await row.waitFor();
  await row.getByRole('button',{name:'引用与删除预览',exact:true}).click();
  const panel=region.getByRole('region',{name:'图片实际影响范围',exact:true});
  await panel.waitFor();
  assert.ok((await panel.innerText()).includes(assetId));
  return {region,row,panel};
}
export async function closeMediaPreview(panel){
  await panel.getByRole('button',{name:'关闭预览',exact:true}).click();
  await panel.waitFor({state:'hidden'});
}
export async function addImage(ctx,field='body'){
  await openPublished(ctx);
  await writeImage(ctx);
  await paste(ctx,field);
  const p=ctx.session.page;
  const img=editor(ctx,field).locator('img[data-gank-placement]');
  await img.first().waitFor();
  assert.ok(await img.first().evaluate(el=>el.complete&&el.naturalWidth>0),
    'GUI PNG not visually decoded');
  const saved=await saveDraft(ctx,nativeTitle,field,'');
  assert.ok(saved.mediaRefs.length>0,'GUI image paste did not create persistent placement');
  return {saved,image:img};
}
export async function exportForImport(ctx){
  return exportPackage(ctx);
}
export async function openImport(ctx,file){
  const panel=await openPackage(ctx,file);
  await panel.getByRole('heading',{name:'导入卡片内容',exact:true}).waitFor();
  return panel;
}
export async function openMerge(ctx,file){
  await settings(ctx,'备份与恢复');
  await selectFile(ctx,file);
  const panel=ctx.session.page.getByRole('region',{name:'合并导入数据库',exact:true});
  await panel.getByRole('button',{name:'选择合并导入数据库',exact:true}).click();
  await panel.getByRole('group',{name:'选择独立导入的卡片集',exact:true}).waitFor();
  return panel;
}
export async function previewMerge(ctx,file){
  const panel=await openMerge(ctx,file);
  const choices=panel.getByRole('checkbox',{name:/^导入卡片集 /});
  assert.ok(await choices.count()>0,'DB source must expose at least one selectable deck');
  await choices.first().check();
  await panel.getByRole('button',{name:'预览合并导入影响',exact:true}).click();
  await panel.getByText(/本次将新增|实际新增/).first().waitFor();
  return panel;
}
export async function confirmMerge(panel){
  await panel.getByLabel('我已核对影响，同意新增独立副本并保留当前全部数据').check();
  const b=panel.getByRole('button',{name:'确认合并导入',exact:true});
  assert.equal(await b.isDisabled(),false);
  await b.click();
  await panel.getByRole('status').filter({hasText:/已独立导入/}).waitFor();
}
export async function cancelMerge(panel){
  await panel.getByRole('button',{name:'取消合并导入',exact:true}).click();
  await panel.getByRole('status').filter({hasText:/已取消合并导入/}).waitFor();
}
export async function makeMergeSource(ctx){
  const file=await backup(ctx);
  const stage=join(ctx.fixture.root,'m4-independent-source');
  mkdirSync(stage,{recursive:true});
  await stageBackup(file,stage);
  const db=join(stage,'ganksoft.sqlite');
  assert.ok(existsSync(db)&&readFileSync(db).length>1000,'Isolated source Schema606 DB missing');
  step(ctx,'Prepared complete isolated Schema606 source from real GUI backup; original IDs intentionally overlap');
  return {file:db,backup:file,stage};
}
export async function openTrash(ctx,section='卡片集'){
  await settings(ctx,'回收站');
  const region=ctx.session.page.getByRole('region',{name:'统一回收站',exact:true});
  const nav=region.getByRole('navigation',{name:'回收站分类',exact:true});
  await nav.getByRole('button',{name:section,exact:true}).click();
  assert.equal(await nav.getByRole('button',{name:section,exact:true}).getAttribute('aria-current'),'page');
  return region;
}
export async function reopenAndCheck(ctx,action){
  const before=await action(ctx);
  const proof=await restart(ctx);
  await observe(ctx);
  assert.deepEqual(await action(ctx),before,'Independent new PID readback differs');
  return proof;
}
export function assertMediaClosed(ctx){
  const state=snapshot(ctx.fixture);
  assert.ok(state.media&&typeof state.media==='object');
  const db=new Set(Object.keys(state.media));
  for(const [table,items] of Object.entries(state.tables)){
    if(!Array.isArray(items))continue;
    for(const row of items){
      if(table==='assets'&&row.file_name)assert.ok(db.has(row.file_name),'Missing attachment bytes for DB asset');
    }
  }
}
