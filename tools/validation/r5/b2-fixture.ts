// Repeatable SMALL real606 fixture. A stale /tmp metadata file never blocks B2.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,mkdtempSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {prepareFreshUnified,recoverUnifiedMigration} from '../../../electron/infrastructure/migrations/coordinator.ts';
import {createFullRestoreSession} from '../../../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../../../shared/protocol/client.ts';
import {stageImage} from '../../../electron/modules/media/drafts.ts';
import {placementUrl} from '../../../shared/editor/document.ts';
import {Transformer} from '@napi-rs/image';
export async function b2Fixture(options:{resetBodies?:boolean}={}){
 const metadata='validation-results/r5-b2-2/fixture.json';let previous:any;
 if(existsSync(metadata))previous=JSON.parse(readFileSync(metadata,'utf8'));
 const valid=previous?.fixtureVersion===2&&existsSync(previous.data+'-control606/active.json')&&existsSync(previous.data+'-control606/target/ganksoft.sqlite');
 if(valid){if(existsSync(previous.data+'-control606/writer.lock'))await recoverUnifiedMigration(previous.data+'-control606');const db=new DatabaseSync(previous.data+'-control606/target/ganksoft.sqlite',{readOnly:true});try{assert.equal(db.prepare('PRAGMA user_version').get()!.user_version,606);assert.equal(db.prepare('PRAGMA integrity_check').get()!.integrity_check,'ok');}finally{db.close();}if(options.resetBodies)await resetBodies(previous);return previous;}
 // Never erase/reuse another live directory or release someone else's lease.
 const root=mkdtempSync(join(tmpdir(),'gank-b2-lifecycle-')),data=join(root,'synthetic606');await prepareFreshUnified(data,data+'-control606');
 const owner=await createFullRestoreSession(data+'-control606',{workspaceParent:root,selectBackup:async()=>null,allowLegacyRestore:false});
 try{
 const api=createClient(r=>owner.execute(r));await api.call('app.capabilities',{});const deck=(await api.call('workspace.catalog',{})).items.find(x=>x.kind==='deck')!;
 const name='B2 生命周期合成';await api.call('workspace.catalog.save',{kind:'deck',id:deck.id,name,parentId:null,expectedRevision:deck.revision});
 const second=await api.call('workspace.catalog.save',{kind:'deck',name:'B2 切换目标集',parentId:null});
 const ids:string[]=[];for(const name of ['生命周期甲','生命周期乙','生命周期子']){const tree=await api.call('knowledge.tree.read',{deckId:deck.id});const n=await api.call('knowledge.node.create',{deckId:deck.id,expectedTreeHash:tree.treeHash,parentId:ids.length===2?ids[0]:null,name});ids.push(n.nodeId);}
 const png=Transformer.fromRgbaPixels(Buffer.from([40,130,80,255]),1,1).pngSync(),asset=stageImage(owner.ctx,deck.id,'knowledge',png,'image/png'),placement=placementUrl({assetId:asset.id,placementId:crypto.randomUUID(),width:30});
 for(const [i,id] of ids.entries()){const n=await api.call('knowledge.node.read',{deckId:deck.id,nodeId:id});await api.call('knowledge.node.save',{deckId:deck.id,nodeId:id,expectedRevision:n.revision,markdown:i===0?`甲节点原文\n\n![合成像素](${placement})\n`:i===1?'乙节点原文\n':'不相关节点正文\n'});}
 const scope={deckId:deck.id},draft=await api.call('draft.create',{...scope,initialType:'direct'}),cardScope={...scope,cardId:draft.cardId};
 const saved=await api.call('draft.save',{...cardScope,expectedPublishedRevision:0,expectedDraftRevision:1,fields:{title:'B2 保持发布和历史',payload:{encoding:'direct-v1',mode:'direct',fields:{body:'不可意外修改的已发布正文',source:'合成'}},mediaRefs:[]}});
 await api.call('card.publish',{...cardScope,expectedPublishedRevision:0,expectedDraftRevision:saved.revision,resetStudyCycle:false});
 await api.call('knowledge.cardLinks.set',{...cardScope,nodeIds:[ids[0]],expectedRevision:0});
 let review=await api.call('learning.session.open',{...scope,cardIds:[draft.cardId]});const sessionScope={...scope,sessionId:review.sessionId};
 review=await api.call('learning.session.change',{...sessionScope,expectedRevision:review.revision,action:'save',draft:{...review.draft,scoreTenths:90,faults:[],gaps:'',reflection:'B2合成历史'}});
 await api.call('learning.review.submit',{...sessionScope,expectedRevision:review.revision,eventId:review.entry.eventId,scoreTenths:90,faults:[],gaps:'',reflection:'B2合成历史',practice:false});
 const fixture={fixtureVersion:2,root,data,deck:{id:deck.id,name},secondDeck:{id:second.id,name:'B2 切换目标集'},ids,asset,placement,card:cardScope,previousCacheAvailable:!!valid,oldMetadataOnly:!!previous,parameters:{nodes:3,publishedCards:1,reviewEvents:1,pixel:[40,130,80,255]}};
 assert.equal(owner.ctx.db.prepare('PRAGMA user_version').get()!.user_version,606);assert.equal(owner.ctx.db.prepare('PRAGMA integrity_check').get()!.integrity_check,'ok');
 mkdirSync('validation-results/r5-b2-2',{recursive:true});writeFileSync(metadata,JSON.stringify(fixture,null,2)+'\n');return fixture;
 }finally{owner.close();}
}

async function resetBodies(f:any){
 const owner=await createFullRestoreSession(f.data+'-control606',{workspaceParent:f.root,selectBackup:async()=>null,allowLegacyRestore:false});
 try{const api=createClient(r=>owner.execute(r));await api.call('app.capabilities',{});
 for(const [i,nodeId] of f.ids.entries()){
  const n=await api.call('knowledge.node.read',{deckId:f.deck.id,nodeId}),markdown=i===0?`甲节点原文\n\n![合成像素](${f.placement})\n`:i===1?'乙节点原文\n':'不相关节点正文\n';
  if(n.markdown!==markdown)await api.call('knowledge.node.save',{deckId:f.deck.id,nodeId,expectedRevision:n.revision,markdown});
 }
 }finally{owner.close();}
}
