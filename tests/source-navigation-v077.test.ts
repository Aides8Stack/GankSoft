import test from 'node:test';
import assert from 'node:assert/strict';
import {SourceNavigation} from '../src/unified/source-navigation.ts';
import {CardDraftController} from '../src/cards/draft-controller.ts';
import {newCardSession} from '../shared/cards/mapping.ts';
function controller(){const initial=newCardSession({deckId:'deck',cardId:'card'},'direct');let saves=0,fail=false;const c=new CardDraftController({deckId:'deck',cardId:'card'},initial,null,{previewSwitch:async()=>initial,save:async input=>{saves++;if(fail)throw {outcome:'unknown'};return{...input.fields,cardId:'card',draftType:'direct',revision:(input.expectedDraftRevision??0)+1,basePublishedRevision:0,origin:initial.origin,updatedAt:new Date().toISOString()};}},()=>{});return{c,get saves(){return saves;},fail(){fail=true;}};}
test('B2.2 nested sources retain identity/context and primary navigation clears history',()=>{
 const n=new SourceNavigation<{page:string;cardId:string;scroll:number;query:string}>();
 n.enter({page:'cards',cardId:'',scroll:438,query:'过滤'});n.enter({page:'edit',cardId:'A',scroll:72,query:'过滤'});n.enter({page:'drafts',cardId:'A',scroll:105,query:'草稿'});
 assert.deepEqual(n.take(),{page:'drafts',cardId:'A',scroll:105,query:'草稿'});assert.equal(n.take()?.cardId,'A');assert.equal(n.take()?.scroll,438);assert.equal(n.take(),undefined);n.enter({page:'detail',cardId:'B',scroll:9,query:''});n.clear();assert.equal(n.depth,0);
});
test('B2.2 continue/discard never persist; save is explicit and may leave only on success',async()=>{
 const f=controller();f.c.change({...f.c.snapshot(),title:'未保存'});
 assert.equal(await f.c.leave('continue'),false);assert.equal(await f.c.leave('discard'),true);assert.equal(f.saves,0);
 assert.equal(await f.c.leave('save'),true);assert.equal(f.saves,1);assert.equal(f.c.hasUnsavedChanges,false);
 f.c.change({...f.c.snapshot(),title:'后续修改'});assert.equal(await f.c.leave('discard'),true);assert.equal(f.saves,1);assert.equal(f.c.revision,1);
});
test('B2.2 unknown save cannot be discarded and does not trigger another implicit save',async()=>{
 const f=controller();f.c.change({...f.c.snapshot(),title:'保留内存'});f.fail();assert.equal(await f.c.leave('save'),false);assert.equal(f.c.outcomeUnknown,true);assert.equal(await f.c.leave('discard'),false);assert.equal(f.saves,1);assert.equal(f.c.snapshot().title,'保留内存');
});
