import test from 'node:test';
import assert from 'node:assert/strict';
import {schema604Fixture} from './fixtures/v075-schema604.ts';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {createApplicationProtocol} from '../electron/protocol/gateway.ts';
import {Application} from '../electron/application.ts';
import {createClient} from '../shared/protocol/client.ts';
const code=(name:string)=>(e:unknown)=>e instanceof Error&&'code' in e&&e.code===name;
test('T33/T37 catalog is a scoped paged metadata query with breadcrumbs/counts and no card bodies/media/history or full snapshot SQL',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  await f.card('direct');const trace:string[]=[],prepare=f.ctx.db.prepare.bind(f.ctx.db);f.ctx.db.prepare=(sql:string)=>{trace.push(sql);return prepare(sql);};
  const root=await f.client.call('workspace.catalog',{});assert.equal(root.model,'unified');assert.equal(root.items.find(n=>n.id===f.source.ids.folder)?.kind,'folder');assert.equal(root.items.some(n=>n.id===f.source.ids.qDeck),false);
  const first=await f.client.call('workspace.catalog',{folderId:f.source.ids.folder,limit:1});assert.equal(first.items.length,1);assert.ok(first.nextCursor);assert.equal(first.breadcrumbs[0].id,f.source.ids.folder);
  const second=await f.client.call('workspace.catalog',{folderId:f.source.ids.folder,cursor:first.nextCursor,limit:1});assert.equal(second.items.length,1);assert.notEqual(first.items[0].id,second.items[0].id);assert.equal([...first.items,...second.items].find(n=>n.id===f.source.ids.qDeck)?.cardCount,2);
  assert.ok(trace.every(sql=>!/FROM\s+(learning_content_versions|assets|attempts|memory_reviews)\b/i.test(sql)));assert.doesNotMatch(JSON.stringify(first),/payload|mediaRefs|markdown|thought/);
  await f.client.call('knowledge.node.create',{deckId:f.source.ids.qDeck,parentId:null,expectedTreeHash:(await f.client.call('knowledge.tree.read',{deckId:f.source.ids.qDeck})).treeHash});
  await assert.rejects(()=>f.client.call('workspace.catalog',{folderId:f.source.ids.folder,cursor:first.nextCursor}),code('DATA_REVISION_CHANGED'));
  await assert.rejects(()=>f.client.call('workspace.catalog',{folderId:f.source.ids.folder,cursor:JSON.stringify({...JSON.parse(first.nextCursor),folderId:null})}),code('DATA_REVISION_CHANGED'));
 }finally{f.close();}
});
test('T33 catalog detects legacy604 without activating/migrating it; deleted/missing folders fail closed',async()=>{
 const f=schema604Fixture();try{
  const host=createApplicationProtocol(new Application({db:f.db,dataDir:f.dataDir,now:()=>new Date()})),client=createClient(r=>host.execute(r));await client.call('app.capabilities',{});
  assert.equal((await client.call('workspace.catalog',{})).model,'legacy');assert.equal(f.db.prepare('PRAGMA user_version').get()!.user_version,604);
  await assert.rejects(()=>client.call('workspace.catalog',{folderId:'missing-folder'}),code('FOLDER_NOT_FOUND'));
 }finally{f.close();}
});
test('T20/T33 session recovery lists metadata without content or draft evidence and isolates each deck',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const card=await f.card('direct'),opened=await f.client.call('learning.session.open',{deckId:card.deckId,cardIds:[card.cardId]});
  const summaries=await f.client.call('workspace.sessions',{deckId:card.deckId});assert.equal(summaries.items.length,1);assert.equal(summaries.items[0].sessionId,opened.sessionId);assert.equal((await f.client.call('workspace.sessions',{deckId:card.deckId,exactCardIds:[card.cardId]})).items[0].sessionId,opened.sessionId);assert.deepEqual((await f.client.call('workspace.sessions',{deckId:card.deckId,exactCardIds:[f.source.ids.question]})).items,[]);assert.equal(summaries.items[0].title,'合成direct');assert.doesNotMatch(JSON.stringify(summaries),/draft|content|payload|thought|media/);
  assert.deepEqual((await f.client.call('workspace.sessions',{deckId:f.source.ids.mDeck})).items,[]);
 }finally{f.close();}
});
test('T37 summary title search is server-side across pages, mode-scoped and cursor-bound without hidden content',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  await f.card('direct');await f.card('direct');await f.card('qa');const deckId=f.source.ids.qDeck;
  const first=await f.client.call('card.listSummary',{deckId,filters:{query:'direct'},limit:1});assert.equal(first.items.length,1);assert.ok(first.nextCursor);
  const second=await f.client.call('card.listSummary',{deckId,filters:{query:'direct'},cursor:first.nextCursor,limit:1});assert.notEqual(first.items[0].cardId,second.items[0].cardId);assert.equal(second.nextCursor,null);
  await assert.rejects(()=>f.client.call('card.listSummary',{deckId,filters:{query:'qa'},cursor:first.nextCursor}),code('CURSOR_INVALID'));
  assert.equal((await f.client.call('card.listSummary',{deckId,filters:{query:'direct',mode:'qa'}})).items.length,0);assert.doesNotMatch(JSON.stringify(first),/payload|markdown|mediaRefs/);
 }finally{f.close();}
});
