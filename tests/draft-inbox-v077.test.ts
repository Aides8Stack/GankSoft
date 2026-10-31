import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {schema604Fixture} from './fixtures/v075-schema604.ts';
import {prepareAndActivateUnified,openUnifiedOwner} from '../electron/infrastructure/migrations/coordinator.ts';
import {Application} from '../electron/application.ts';
import {createApplicationProtocol} from '../electron/protocol/gateway.ts';
import {createClient} from '../shared/protocol/client.ts';
import {blankCardFields,newCardSession} from '../shared/cards/mapping.ts';
import {publicationIssues} from '../shared/protocol/card-draft.ts';

async function fixture(){
 const source=schema604Fixture();source.db.exec("UPDATE platform_operations SET state='completed'");
 const control=join(source.root,'control');
 await prepareAndActivateUnified({db:source.db,dataDir:source.dataDir,now:()=>new Date(source.at)},control);
 let owner=openUnifiedOwner(control),ctx={db:owner.db,dataDir:owner.dataDir,now:()=>new Date(source.at)};
 let protocol=createApplicationProtocol(new Application(ctx));let drop=false;
 const api=createClient(async r=>{const result=await protocol.execute(r);if(drop&&(r as {method:string}).method==='card.publish'&&result.ok){drop=false;throw Error('injected lost reply');}return result;});
 await api.call('app.capabilities',{});
 return {source,api,get ctx(){return ctx;},get protocol(){return protocol;},loseReply(){drop=true;},
 reopen(){owner.close();owner=openUnifiedOwner(control);ctx={...ctx,db:owner.db};protocol=createApplicationProtocol(new Application(ctx));},
 close(){owner.close();source.close();}};
}
const code=(expected:string)=>(e:unknown)=>(e as {code:string}).code===expected;
function complete(mode:'question'|'qa'|'direct'){
 const f=blankCardFields(mode);f.title='中文完整标题';
 if(f.payload.encoding==='question-v1'){f.payload.fields.stem='题干';f.payload.fields.options=[{optionId:'a',position:0,markdown:'甲'},{optionId:'b',position:1,markdown:'乙'}];f.payload.fields.correctOptionId='a';}
 else if(f.payload.encoding==='qa-v1'){f.payload.fields.front='正面';f.payload.fields.back='背面';}
 else if(f.payload.encoding==='direct-v1')f.payload.fields.body='记忆正文';
 return f;
}
function snapshot(f:Awaited<ReturnType<typeof fixture>>){
 return Object.fromEntries(['learning_cards','learning_content_versions','learning_study_cycles','learning_review_events','learning_card_drafts','question_knowledge','memory_knowledge','scheduling','settings'].map(t=>[t,f.ctx.db.prepare('SELECT * FROM '+t+' ORDER BY 1').all()]));
}

const discard=(scope:{deckId:string;cardId:string},revision:number,publishedRevision=0)=>({...scope,expectedDraftRevision:revision,expectedPublishedRevision:publishedRevision,confirmDiscard:true as const});
test('B2.1 list/search/pages include historical drafts and queries never write',async()=>{
 const f=await fixture();try{
 const legacy=await f.api.call('draft.create',{deckId:f.source.ids.qDeck,initialType:'qa'});
 for(const title of ['搜索甲','搜索乙','其它'])await f.api.call('draft.save',{deckId:f.source.ids.qDeck,cardId:randomUUID(),expectedPublishedRevision:0,expectedDraftRevision:null,fields:{...blankCardFields('direct'),title}});
 const before=snapshot(f),first=await f.api.call('draft.listSummary',{deckId:f.source.ids.qDeck,query:'搜索',limit:1});
 assert.equal(first.items.length,1);assert.ok(first.nextCursor);
 const second=await f.api.call('draft.listSummary',{deckId:f.source.ids.qDeck,query:'搜索',after:first.nextCursor,limit:1});
 assert.equal(second.items.length,1);assert.notEqual(first.items[0].cardId,second.items[0].cardId);assert.equal(second.nextCursor,null);
 assert.ok((await f.api.call('draft.listSummary',{deckId:f.source.ids.qDeck})).items.some(i=>i.cardId===legacy.cardId));assert.deepEqual(snapshot(f),before);
 }finally{f.close();}
});
test('B2.1 discard new draft is idempotent after restart; stale saves cannot revive it',async()=>{
 const f=await fixture();try{
 const scope={deckId:f.source.ids.qDeck,cardId:randomUUID()},fields=blankCardFields('qa');
 const d=await f.api.call('draft.save',{...scope,expectedPublishedRevision:0,expectedDraftRevision:null,fields});
 const before=snapshot(f),req=f.api.prepare('draft.discard',discard(scope,d.revision));
 const result=await f.api.send(req);assert.equal(result.kind,'new-draft');assert.equal(await f.api.call('draft.get',scope),null);
 for(const k of Object.keys(before).filter(k=>k!=='settings'))assert.deepEqual(snapshot(f)[k],before[k],k);
 f.reopen();assert.deepEqual(await f.api.send(req),result);assert.equal(await f.api.call('draft.get',scope),null);
 await assert.rejects(()=>f.api.call('draft.save',{...scope,expectedPublishedRevision:0,expectedDraftRevision:d.revision,fields}),code('DRAFT_REVISION_CONFLICT'));
 assert.equal((await f.api.call('draft.listSummary',{deckId:scope.deckId})).items.some(i=>i.cardId===scope.cardId),false);
 }finally{f.close();}
});
test('B2.1 published-edit discard preserves all formal/history/FSRS/media/link rows and bytes',async()=>{
 const f=await fixture();try{
 const scope={deckId:f.source.ids.qDeck,cardId:f.source.ids.question},content=await f.api.call('card.getPublishedContent',scope);
 const d=await f.api.call('draft.save',{...scope,expectedPublishedRevision:1,expectedDraftRevision:null,fields:{title:'修改草稿',payload:content.payload,mediaRefs:content.mediaRefs}});
 const before=snapshot(f),bytes=(await import('node:fs')).readFileSync(join(f.ctx.dataDir,'attachments',f.source.ids.currentImage+'.png'));
 assert.equal((await f.api.call('draft.discard',discard(scope,d.revision,1))).kind,'published-edit');
 for(const k of Object.keys(before).filter(k=>k!=='learning_card_drafts'))assert.deepEqual(snapshot(f)[k],before[k],k);
 f.reopen();assert.equal(await f.api.call('draft.get',scope),null);assert.deepEqual(await f.api.call('card.getPublishedContent',scope),content);
 assert.deepEqual((await import('node:fs')).readFileSync(join(f.ctx.dataDir,'attachments',f.source.ids.currentImage+'.png')),bytes);
 }finally{f.close();}
});
test('B2.1 discard checks scope/revisions and rolls back when receipt fails',async()=>{
 const f=await fixture();try{
 const scope={deckId:f.source.ids.qDeck,cardId:randomUUID()},fields=blankCardFields('direct');
 const d=await f.api.call('draft.save',{...scope,expectedPublishedRevision:0,expectedDraftRevision:null,fields});
 await assert.rejects(()=>f.api.call('draft.discard',discard({...scope,deckId:f.source.ids.mDeck},d.revision)),code('DECK_CONFLICT'));
 await assert.rejects(()=>f.api.call('draft.discard',discard(scope,d.revision,1)),code('CONTENT_VERSION_CONFLICT'));
 await assert.rejects(()=>f.api.call('draft.discard',discard(scope,d.revision+1)),code('DRAFT_REVISION_CONFLICT'));
 const req=f.api.prepare('draft.discard',discard(scope,d.revision));
 f.ctx.db.exec("CREATE TEMP TRIGGER fail_discard_receipt BEFORE INSERT ON protocol_receipts WHEN NEW.method='draft.discard' BEGIN SELECT RAISE(ABORT,'B2 receipt failure'); END");
 const before=snapshot(f);await assert.rejects(()=>f.api.send(req));assert.deepEqual(snapshot(f),before);
 f.ctx.db.exec('DROP TRIGGER fail_discard_receipt');await f.api.send(req);assert.equal(await f.api.call('draft.get',scope),null);
 }finally{f.close();}
});
