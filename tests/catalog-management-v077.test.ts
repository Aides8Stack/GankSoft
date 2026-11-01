import test from 'node:test';
import assert from 'node:assert/strict';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {collectDeckContent,catalogActions} from '../src/unified/catalog-management.ts';
import {preparedCardExport,stageCardPackage,writeCardPackage,readCardPackage} from '../electron/modules/cards-unified/exchange.ts';
import {validateUnifiedData} from '../electron/infrastructure/migrations/unified-integrity.ts';
import {join} from 'node:path';
const code=(expected:string)=>(e:unknown)=>(e as {code?:string}).code===expected;
type Fixture=Awaited<ReturnType<typeof unifiedWorkspaceFixture>>;
const facts=(f:Fixture)=>Object.fromEntries(['learning_cards','learning_content_versions','learning_card_drafts','learning_study_cycles','learning_review_events','question_knowledge','memory_knowledge','assets','scheduling'].map(t=>[t,f.ctx.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()]));
async function folder(f:Fixture,name:string,parentId:string|null=null){return f.client.call('workspace.catalog.save',{kind:'folder',name,parentId});}
test('B3 catalog nested rename/move rejects stale CAS, cycles and sibling duplicates; identity and restart persist',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const a=await folder(f,'根目录'),b=await folder(f,'子目录',a.id),c=await folder(f,'孙目录',b.id);
  const d=await f.client.call('workspace.catalog.save',{kind:'deck',name:'多层学习',parentId:c.id}),card=await f.card('direct',d.id),before=facts(f);
  for(const target of [a.id,b.id,c.id])await assert.rejects(()=>f.client.call('workspace.catalog.save',{kind:'folder',id:a.id,expectedRevision:a.revision,name:'根目录',parentId:target}));
  const moved=await f.client.call('workspace.catalog.save',{kind:'folder',id:b.id,expectedRevision:b.revision,name:'移动改名',parentId:null});
  await assert.rejects(()=>f.client.call('workspace.catalog.save',{kind:'folder',id:b.id,expectedRevision:b.revision,name:'不能覆盖',parentId:null}),code('CONTENT_VERSION_CONFLICT'));
  await assert.rejects(()=>folder(f,'移动改名'));await assert.rejects(()=>f.client.call('workspace.catalog.save',{kind:'deck',name:'多层学习',parentId:c.id}));
  assert.equal(moved.revision,b.revision+1);assert.deepEqual(facts(f),before);f.reopen();validateUnifiedData(f.ctx.db);
  const result=await f.client.call('workspace.catalog',{folderId:c.id});assert.deepEqual(result.breadcrumbs.map(b=>b.name),['移动改名','孙目录']);assert.equal(result.items[0].id,d.id);assert.equal((await f.client.call('card.getPublishedContent',{deckId:card.deckId,cardId:card.cardId})).cardId,card.cardId);
 }finally{f.close();}
});
test('B3 noncascade delete is CAS/receipt protected, reparents every direct child and preserves all card facts',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const a=await folder(f,'原上级'),b=await folder(f,'删除的目录',a.id),c=await folder(f,'保留子目录',b.id),deep=await folder(f,'保留孙目录',c.id);
  const d=await f.client.call('workspace.catalog.save',{kind:'deck',name:'保留卡片集',parentId:b.id});await f.card('qa',d.id);const before=facts(f);
  await assert.rejects(()=>f.client.call('catalog.folder.action',{id:b.id,expectedRevision:999,action:'delete',cascade:false}),code('CONTENT_VERSION_CONFLICT'));
  const req=f.client.prepare('catalog.folder.action',{id:b.id,expectedRevision:b.revision,action:'delete',cascade:false});assert.equal(await f.client.send(req),true);assert.equal(await f.client.send(req),true);
  const parent=await f.client.call('workspace.catalog',{folderId:a.id});assert.deepEqual(new Set(parent.items.map(x=>x.id)),new Set([c.id,d.id]));
  assert.equal(f.ctx.db.prepare('SELECT parent_id FROM folders WHERE id=?').get(deep.id)!.parent_id,c.id);assert.deepEqual(facts(f),before);f.reopen();validateUnifiedData(f.ctx.db);assert.deepEqual(facts(f),before);
 }finally{f.close();}
});
test('B3 delete refuses reparent name conflicts and write faults atomically; deleted folder name can be reused by its child',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const a=await folder(f,'上级冲突'),b=await folder(f,'待删除',a.id);await folder(f,'同名',a.id);const child=await folder(f,'同名',b.id);
  await assert.rejects(()=>f.client.call('catalog.folder.action',{id:b.id,expectedRevision:b.revision,action:'delete',cascade:false}),code('CATALOG_NAME_CONFLICT'));
  assert.equal(f.ctx.db.prepare('SELECT parent_id FROM folders WHERE id=?').get(child.id)!.parent_id,b.id);
  await f.client.call('workspace.catalog.save',{kind:'folder',id:child.id,expectedRevision:child.revision,name:'待删除',parentId:b.id});
  f.ctx.db.exec(`CREATE TRIGGER b3_fail BEFORE UPDATE OF deleted_at ON folders WHEN NEW.id='${b.id}' BEGIN SELECT RAISE(ABORT,'B3 injected write failure'); END;`);
  await assert.rejects(()=>f.client.call('catalog.folder.action',{id:b.id,expectedRevision:b.revision,action:'delete',cascade:false}));
  assert.equal(f.ctx.db.prepare('SELECT parent_id FROM folders WHERE id=?').get(child.id)!.parent_id,b.id);assert.equal(f.ctx.db.prepare('SELECT deleted_at FROM folders WHERE id=?').get(b.id)!.deleted_at,null);
  f.ctx.db.exec('DROP TRIGGER b3_fail');await f.client.call('catalog.folder.action',{id:b.id,expectedRevision:b.revision,action:'delete',cascade:false});assert.equal(f.ctx.db.prepare('SELECT parent_id FROM folders WHERE id=?').get(child.id)!.parent_id,a.id);
 }finally{f.close();}
});
test('B3 paginated deck content ZIP creates independent identities and detects collection/preview revision gaps',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const d=await f.client.call('workspace.catalog.save',{kind:'deck',name:'单集内容',parentId:null});await f.card('direct',d.id);await f.card('qa',d.id);
  const selected=await collectDeckContent(d.id,p=>f.client.call('card.listSummary',p));const before=facts(f);
  const preview=await f.client.call('card.exchange.preview',selected),doc=preparedCardExport(f.ctx,{token:preview.token}),file=join(f.source.root,'B3 内容包.zip');await writeCardPackage(file,doc);assert.deepEqual(await readCardPackage(file),doc);assert.deepEqual(facts(f),before);
  const staged=stageCardPackage(f.ctx,await readCardPackage(file)),imported=await f.client.call('card.exchange.import',{token:staged.token,name:'独立内容'});assert.notEqual(imported.deckId,d.id);assert.equal(imported.count,2);assert.ok((await f.client.call('card.listSummary',{deckId:imported.deckId})).items.every(c=>!selected.cards.some(x=>x.cardId===c.cardId)));
  await assert.rejects(()=>f.client.call('card.exchange.preview',selected),code('DATA_REVISION_CHANGED'));f.reopen();validateUnifiedData(f.ctx.db);assert.equal((await f.client.call('card.listSummary',{deckId:imported.deckId})).items.length,2);
 }finally{f.close();}
});
test('B3 collection is bounded to 500, refuses empty/501/repeated pages and menus never offer folder export',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const empty=await f.client.call('workspace.catalog.save',{kind:'deck',name:'空集',parentId:null});await assert.rejects(()=>collectDeckContent(empty.id,p=>f.client.call('card.listSummary',p)),/没有已发布卡/);
  // Real protocol pages with 501 native published cards, no legacy shadow rows.
  await f.card('direct',empty.id);
  for(let i=0;i<499;i++)await f.card('direct',empty.id);
  const selected=await collectDeckContent(empty.id,p=>f.client.call('card.listSummary',p));assert.equal(selected.cards.length,500);
  await f.card('direct',empty.id);await assert.rejects(()=>collectDeckContent(empty.id,p=>f.client.call('card.listSummary',p)),/最多支持500/);
  const first=await f.client.call('card.listSummary',{deckId:empty.id,limit:100});await assert.rejects(()=>collectDeckContent(empty.id,async()=>first),/分页重复/);
  const folderItem={kind:'folder' as const,id:crypto.randomUUID(),name:'文件夹',revision:1,parentId:null,cardCount:null,knowledgeCount:null};assert.equal(catalogActions(folderItem).some(o=>o.key==='export'),false);assert.equal(catalogActions(null).filter(o=>o.key==='import').length,1);
 }finally{f.close();}
});
