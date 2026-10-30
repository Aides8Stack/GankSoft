import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {preparedCardExport} from '../electron/modules/cards-unified/exchange.ts';

// Tests real Schema606 APIs used by the compact left rail. Not a replacement for Electron GUI.
test('V077 catalog menu uses unified folder/deck CAS and deleting a folder does not delete its children',async()=>{
 const f=await unifiedWorkspaceFixture();
 try{
  const parent=await f.client.call('workspace.catalog.save',{kind:'folder',name:'用户目录',parentId:null});
  const child=await f.client.call('workspace.catalog.save',{kind:'folder',name:'子目录',parentId:parent.id});
  const deck=await f.client.call('workspace.catalog.save',{kind:'deck',name:'专项卡片集',parentId:parent.id});
  const card=await f.card('direct',deck.id);
  const moved=await f.client.call('workspace.catalog.save',{kind:'deck',id:deck.id,expectedRevision:deck.revision,name:'专项卡片集-改名',parentId:child.id});
  assert.equal(moved.id,deck.id);
  const listed=await f.client.call('workspace.catalog',{folderId:child.id});
  assert.equal(listed.items.find(r=>r.id===deck.id)?.name,'专项卡片集-改名');
  await assert.rejects(()=>f.client.call('workspace.catalog.save',{kind:'folder',id:parent.id,expectedRevision:parent.revision,name:'循环目录',parentId:child.id}));
  await f.client.call('catalog.folder.action',{id:parent.id,action:'delete',cascade:false});
  const root=await f.client.call('workspace.catalog',{folderId:null});
  assert.equal(root.items.find(r=>r.id===child.id)?.parentId,null);
  const after=await f.client.call('workspace.catalog',{folderId:child.id});
  assert.equal(after.items.find(r=>r.id===deck.id)?.id,deck.id);
  assert.ok((await f.client.call('card.listSummary',{deckId:deck.id})).items.some(r=>r.cardId===card.cardId));
  assert.equal(f.ctx.db.prepare('SELECT deleted_at FROM learning_cards WHERE id=?').get(card.cardId)?.deleted_at,null);
  f.reopen();
  assert.equal((await f.client.call('workspace.catalog',{folderId:child.id})).items.find(r=>r.id===deck.id)?.name,'专项卡片集-改名');
 }finally{f.close();}
});

test('V077 deck-only export uses Schema606 ganksoft.cards published content, not the legacy ZIP tables',async()=>{
 const f=await unifiedWorkspaceFixture();
 try{
  const deck=await f.client.call('workspace.catalog.save',{kind:'deck',name:'仅导出此卡片集',parentId:null});
  const cards=[await f.card('question',deck.id),await f.card('qa',deck.id),await f.card('direct',deck.id)];
  const all=await f.client.call('card.listSummary',{deckId:deck.id,filters:{query:''},limit:100});
  assert.equal(all.items.length,3);
  assert.equal(all.nextCursor,null);
  const p=await f.client.call('card.exchange.preview',{deckId:deck.id,cards:all.items.map(r=>({cardId:r.cardId,expectedRevision:r.revision}))});
  assert.equal(p.count,3);
  assert.deepEqual(p.modes,{question:1,qa:1,direct:1});
  const doc=preparedCardExport(f.ctx,{token:p.token});
  assert.equal(doc.format,'ganksoft.cards');
  assert.equal(doc.cards.length,3);
  assert.ok(doc.cards.every(c=>cards.some(x=>x.cardId===c.key)));
  const another=await f.client.call('workspace.catalog.save',{kind:'deck',name:'不应一起导出',parentId:null});
  const outside=await f.card('qa',another.id);
  assert.ok(doc.cards.every(c=>c.key!==outside.cardId));
  assert.equal(doc.cards.some(c=>c.payload.mode==='qa'),true);
 }finally{f.close();}
});

test('V077 catalog menu restricts ZIP export to deck items and does not fall back to legacy export',()=>{
 const s=readFileSync(new URL('../src/unified/UnifiedCatalogContextMenu.vue',import.meta.url),'utf8');
 const w=readFileSync(new URL('../src/unified/UnifiedWorkspace.vue',import.meta.url),'utf8');
 assert.match(s,/\['export-deck','导出卡片集 ZIP'/);
 const folderActions=s.split("if(props.item.kind==='folder')return [")[1]?.split('] satisfies')[0]??'';
 assert.ok(folderActions&&!folderActions.includes('export-deck'),'folder must not expose export');
 assert.match(w,/card\.listSummary|listSummary\(\{deckId:item\.id/);
 assert.match(w,/prepareCatalogExport\(/);
 assert.doesNotMatch(w,/services\.deck\.export\(/);
 assert.match(w,/cards\.length>500/);
});
