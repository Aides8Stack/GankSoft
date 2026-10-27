import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {ContentVersion} from '../shared/protocol/unified.ts';
import {placementUrl} from '../shared/editor/document.ts';
import {knowledgePlacements} from '../shared/knowledge/media.ts';
import {AppendIdentityMap} from '../electron/modules/storage-unified/append-identities.ts';
import {AppendJsonMap} from '../electron/modules/storage-unified/append-json.ts';
import {stableId} from '../electron/modules/cards-unified/legacy.ts';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {publishedCard,readSchedule,digest} from '../electron/modules/cards-unified/schedule.ts';
const at='2026-10-18T02:00:00.000Z';
function document(){
 const cardId=randomUUID(),assetId=randomUUID(),p1=randomUUID(),p2=randomUUID();
 const uri1=placementUrl({assetId,placementId:p1,width:30}),uri2=placementUrl({assetId,placementId:p2,width:80});
 const d=ContentVersion.parse({versionId:randomUUID(),cardId,mode:'question',title:'原题 '+cardId,availability:'known',publishedAt:at,
  payload:{encoding:'question-v1',mode:'question',fields:{stem:`原文身份 ${cardId}\n\n![甲](<${uri1}> "原说明")\n\n![乙][picture]\n\n[picture]: <${uri2}>\n\n\`\`\`md\n![示例](${uri1})\n\`\`\``,material:'',analysis:'原始解析',source:'来源原文',initialThought:'原始思路',options:[{optionId:'stable:a',position:0,markdown:'选项甲'},{optionId:'stable:b',position:1,markdown:'选项乙'}],correctOptionId:'stable:b'}},
  mediaRefs:[{assetId,placementId:p1,fileName:assetId+'.png',mime:'image/png',role:'question',width:30},{assetId,placementId:p2,fileName:assetId+'.png',mime:'image/png',role:'question',width:80}],
  source:{schema:606,kind:'published',key:cardId,ordinal:null,wireToken:null,rawJson:null}});
 return {d,assetId,p1,p2,uri1,uri2};
}

test('T39 native content rewrites actual Markdown images only, preserving local option IDs, text/code literals and independent widths',()=>{
 const f=document(),original=structuredClone(f.d),ids=new AppendIdentityMap(randomUUID()),map=new AppendJsonMap(ids),dest=map.published(f.d);
 assert.equal(dest.cardId,ids.id('card',f.d.cardId));assert.equal(dest.versionId,ids.resolve('version',f.d.versionId));assert.equal(dest.source.key,dest.cardId);assert.equal(dest.publishedAt,at);assert.equal(dest.title,f.d.title);
 assert.equal(dest.mediaRefs[0]!.assetId,dest.mediaRefs[1]!.assetId);assert.notEqual(dest.mediaRefs[0]!.placementId,dest.mediaRefs[1]!.placementId);assert.deepEqual(dest.mediaRefs.map(r=>r.width),[30,80]);assert.equal(dest.mediaRefs[0]!.fileName,ids.fileName(f.assetId+'.png'));
 const p=dest.payload!;assert.equal(p.encoding,'question-v1');if(p.encoding!=='question-v1')throw Error('mode');
 assert.deepEqual(p.fields.options,f.d.payload!.encoding==='question-v1'?f.d.payload!.fields.options:[]);assert.equal(p.fields.correctOptionId,'stable:b');assert.ok(p.fields.stem.includes('原文身份 '+f.d.cardId));assert.ok(p.fields.stem.includes('```md\n![示例]('+f.uri1+')\n```'));
 assert.deepEqual(knowledgePlacements(p.fields.stem).map(r=>r.width),[30,80]);assert.ok(knowledgePlacements(p.fields.stem).every(r=>r.assetId===ids.id('asset',f.assetId)));assert.deepEqual(f.d,original);
});

test('T39 dangling or inconsistent inline media and unsupported published ownership are rejected without guessing resources',()=>{
 const f=document(),map=new AppendJsonMap(new AppendIdentityMap(randomUUID()));
 assert.throws(()=>map.published({...f.d,mediaRefs:[]}),/APPEND_INLINE_MEDIA_INCOMPLETE/);
 assert.throws(()=>map.published({...f.d,mediaRefs:f.d.mediaRefs.map(r=>({...r,width:45}))}),/APPEND_INLINE_MEDIA_INCOMPLETE/);
 assert.throws(()=>map.published({...f.d,source:{...f.d.source,key:randomUUID()}}),/APPEND_PUBLISHED_SOURCE_INVALID/);
});

test('T39 existing and unpublished draft envelopes preserve the single mode, raw fields, revisions and original origin relationship',()=>{
 const f=document(),ids=new AppendIdentityMap(randomUUID()),map=new AppendJsonMap(ids);map.published(f.d);
 const draft={cardId:f.d.cardId,draftType:'question',title:'未发布编辑',payload:f.d.payload,mediaRefs:f.d.mediaRefs,origin:{versionId:f.d.versionId,mode:'question',strategy:'published-target',mappingVersion:'six-way/1'},revision:3,basePublishedRevision:2,updatedAt:at};
 const stored=map.existingDraft({encoding:'ganksoft.card-draft/1',mode:'question',document:draft});assert.equal(stored.document.cardId,ids.id('card',f.d.cardId));assert.equal(stored.document.origin.versionId,ids.resolve('version',f.d.versionId));assert.equal(stored.document.revision,3);assert.equal(stored.document.basePublishedRevision,2);assert.equal(stored.document.draftType,'question');assert.equal(stored.document.updatedAt,at);
 const pending=map.newDraft({encoding:'ganksoft.new-card-draft/1',deckId:'source:deck',document:{...draft,cardId:'source:new',basePublishedRevision:0,origin:{versionId:null,mode:'question',strategy:'unpublished',mappingVersion:'six-way/1'}}});assert.equal(pending.document.origin.versionId,null);assert.equal(pending.document.basePublishedRevision,0);assert.equal(pending.deckId,ids.id('deck','source:deck'));assert.equal(pending.document.cardId,ids.id('card','source:new'));
 assert.throws(()=>new AppendJsonMap(new AppendIdentityMap(randomUUID())).existingDraft({encoding:'ganksoft.card-draft/1',mode:'question',document:draft}),/APPEND_IDENTITY_UNBOUND/);
});

test('T39 knowledge Markdown/body/order/links/recycle and policies remap typed scope while keeping text, hashes, order and revision facts',()=>{
 const f=document(),ids=new AppendIdentityMap(randomUUID()),map=new AppendJsonMap(ids),node=randomUUID(),deck=randomUUID(),hash='a'.repeat(64);
 const body={encoding:'ganksoft.knowledge-body/1',nodeId:node,deckId:deck,markdown:`# 原知识\n\n![图](<${f.uri1}>)\n\n原文字 ${node}`,assets:[{id:f.assetId,fileName:f.assetId+'.png',mime:'image/png',sha256:hash}]};
 const b=map.knowledgeBody(body);assert.equal(b.nodeId,ids.id('knowledge',node));assert.equal(b.assets[0]!.sha256,hash);assert.equal(b.assets[0]!.fileName,ids.fileName(f.assetId+'.png'));assert.ok(b.markdown.includes('原文字 '+node));assert.equal(knowledgePlacements(b.markdown)[0]!.width,30);
 const order=map.knowledgeOrder({encoding:'ganksoft.knowledge-order/1',deckId:deck,nodeIds:[node,'source:child']});assert.deepEqual(order.nodeIds,[ids.id('knowledge',node),ids.id('knowledge','source:child')]);
 const links=map.cardLinks({encoding:'ganksoft.card-knowledge/1',cardId:f.d.cardId,deckId:deck,nodeIds:[node],revision:7});assert.equal(links.revision,7);assert.equal(links.nodeIds[0],b.nodeId);
 const recycle=map.knowledgeRecycle({encoding:'ganksoft.knowledge-recycle/1',batchId:'source:batch',deckId:deck,rootId:node,nodes:[{nodeId:node,name:'原名字',parentId:null,position:0,revision:4,deletedRevision:4}],mergedInto:null,createdAt:at});assert.equal(recycle.nodes[0]!.deletedRevision,4);assert.equal(recycle.rootId,b.nodeId);assert.equal(recycle.createdAt,at);
 assert.deepEqual(map.cardPolicy({encoding:'ganksoft.card-policy/1',cardId:f.d.cardId,maxIntervalDays:180,revision:2}),{encoding:'ganksoft.card-policy/1',cardId:ids.id('card',f.d.cardId),maxIntervalDays:180,revision:2});
});

test('T39 explicit and legacy cycles preserve their respective identity rules; unknown legacy cycle derivations cannot silently become fresh UUIDs',()=>{
 const ids=new AppendIdentityMap(randomUUID()),card=randomUUID(),native=ids.cycle({cycleId:randomUUID(),cardId:card,provenance:'explicit-relearn',sourceOrdinal:null,startedAt:at});assert.equal(native.cardId,ids.id('card',card));assert.equal(native.startedAt,at);
 const old=stableId('cycle','question',card,2),legacy=ids.cycle({cycleId:old,cardId:card,provenance:'legacy-segment',sourceOrdinal:2,startedAt:null},'question');assert.equal(legacy.cycleId,stableId('cycle','question',legacy.cardId,2));assert.equal(ids.resolve('cycle',old),legacy.cycleId);assert.equal(legacy.startedAt,null);
 assert.throws(()=>ids.cycle({cycleId:randomUUID(),cardId:card,provenance:'legacy-segment',sourceOrdinal:null,startedAt:null},'question'),/APPEND_LEGACY_CYCLE_UNPROVEN/);
});

test('T39 real native review/session mapping preserves original assessment proofs and FSRS state while rebinding only valid live CAS and pausing the imported page',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('question'),v=await f.client.call('card.getPublishedContent',{deckId:c.deckId,cardId:c.cardId}),ids=new AppendIdentityMap(randomUUID()),map=new AppendJsonMap(ids);map.published(v);
  const cycle=f.ctx.db.prepare('SELECT * FROM learning_study_cycles WHERE id=?').get(c.publication.cycleId)!;ids.cycle({cycleId:cycle.id,cardId:cycle.card_id,startedAt:cycle.started_at,provenance:cycle.provenance,sourceOrdinal:cycle.source_ordinal});
  let s=await f.client.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId]});const live=JSON.parse(String(f.ctx.db.prepare("SELECT payload FROM study_sessions WHERE json_extract(payload,'$.sessionId')=?").get(s.sessionId)!.payload));
  const sourceState=readSchedule(f.ctx,publishedCard(f.ctx,{deckId:c.deckId,cardId:c.cardId})),context={cycleId:c.publication.cycleId,state:sourceState.state};
  const paused=map.session(live,context);assert.equal(paused.resumedAt,null);assert.equal(paused.elapsedMs,live.elapsedMs);assert.equal(paused.totalMs,live.totalMs);assert.equal(paused.entry.scheduleHash,digest({cycleId:ids.resolve('cycle',context.cycleId),state:map.schedule(context.state)}));assert.notEqual(paused.entry.scheduleHash,live.entry.scheduleHash);assert.throws(()=>map.session(live),/APPEND_SCHEDULE_CONTEXT_REQUIRED/);
  s=await f.client.call('learning.session.change',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'reveal',draft:{...s.draft,selectedOptionId:'stable:b',thought:'原始思路'}});
  s=await f.client.call('learning.session.change',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:90}});
  const event=await f.client.call('learning.review.submit',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:90,faults:[],gaps:'',reflection:'',practice:false});
  const mapped=map.review(event);assert.equal(mapped.scoreTenths,event.scoreTenths);assert.equal(mapped.rating,event.rating);assert.equal(mapped.native!.submissionHash,event.native!.submissionHash);assert.deepEqual(mapped.native!.schedule,event.native!.schedule);assert.equal(mapped.native!.selectedOptionId,'stable:b');assert.equal(mapped.contentVersionId,ids.resolve('version',event.contentVersionId));assert.equal(mapped.native!.sessionId,paused.sessionId);
  const current=readSchedule(f.ctx,publishedCard(f.ctx,{deckId:c.deckId,cardId:c.cardId}));const stale=map.session(live,{cycleId:c.publication.cycleId,state:current.state});assert.equal(stale.entry.scheduleHash,live.entry.scheduleHash,'a pre-existing conflict stays a conflict');
  const state=map.schedule(current.state) as Record<string,unknown>,original=current.state as unknown as Record<string,unknown>;assert.deepEqual(Object.fromEntries(Object.entries(state).filter(([k])=>k!=='_gank')),Object.fromEntries(Object.entries(original).filter(([k])=>k!=='_gank')));assert.notDeepEqual(state._gank,original._gank);
  s=await f.client.call('learning.session.get',{deckId:s.deckId,sessionId:s.sessionId});s=await f.client.call('learning.session.change',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'next'});assert.equal(s.completed,true);
  const completed=JSON.parse(String(f.ctx.db.prepare("SELECT payload FROM study_sessions WHERE json_extract(payload,'$.sessionId')=?").get(s.sessionId)!.payload));const archived=map.archivedSession({encoding:'ganksoft.archived-session/1',reason:'card-move',document:completed});assert.equal(archived.document.completed,true);assert.equal(archived.document.resultEventId,mapped.eventId);assert.equal(archived.document.entry.scheduleHash,completed.entry.scheduleHash);
 }finally{f.close();}
});
