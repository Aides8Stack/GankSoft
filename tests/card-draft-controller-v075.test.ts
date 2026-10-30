import test from 'node:test';
import assert from 'node:assert/strict';
import {CardDraftController,type DraftAdapter} from '../src/cards/draft-controller.ts';
import {DraftPreview,WorkspaceDraft,type WorkspaceDraftDTO} from '../shared/protocol/card-draft.ts';
import {newCardSession} from '../shared/cards/mapping.ts';
const fields={title:'初始',payload:{encoding:'qa-v1' as const,mode:'qa' as const,fields:{front:'问',back:'答',supplement:'',source:''}},mediaRefs:[]};
const initial=DraftPreview.parse({cardId:'card',deckId:'deck',targetType:'qa',publishedRevision:1,draftRevision:null,token:'a'.repeat(64),fields,
  origin:{versionId:'version',mode:'qa',strategy:'published-target',mappingVersion:'six-way/1'},requiredFields:[],warnings:[]});
const saved=(revision:number,value=fields):WorkspaceDraftDTO=>WorkspaceDraft.parse({...value,cardId:'card',draftType:'qa',revision,basePublishedRevision:1,updatedAt:'2026-10-31T00:00:00Z',origin:initial.origin});
const deferred=<T>()=>{let resolve!:(x:T)=>void;const promise=new Promise<T>(r=>resolve=r);return {promise,resolve};};
function setup(save:DraftAdapter['save'],seed=initial){return new CardDraftController({cardId:'card',deckId:'deck'},seed,null,
  {save,previewSwitch:async()=>initial,switchType:async()=>{throw Error('must never write on type switch');}},()=>{},1);}
test('B1 memory edits, resume, close and type preview never implicitly save',async()=>{
 let calls=0;const c=setup(async p=>{calls++;return saved(1,p.fields as typeof fields);});
 c.change({...fields,title:'未提交'});c.suspend();c.resume();await new Promise(r=>setTimeout(r,20));
 assert.equal(await c.close(),false);assert.equal(calls,0);await c.previewType('direct');c.cancelSwitch();assert.equal(calls,0);assert.equal(c.snapshot().title,'未提交');c.dispose();
});
test('B1 one explicit save freezes one snapshot; edits during save require another click',async()=>{
 const one=deferred<WorkspaceDraftDTO>();const calls:Parameters<DraftAdapter['save']>[]=[];
 const c=setup(async(...p)=>{calls.push(p);return calls.length===1?one.promise:saved(2,p[0].fields as typeof fields);});
 c.change({...fields,title:'第一'});const write=c.flush();c.change({...fields,title:'第二'});assert.equal(c.state,'saving');
 one.resolve(saved(1,{...fields,title:'第一'}));await write;assert.equal(calls.length,1);assert.equal(c.state,'dirty');
 await c.flush();assert.equal(calls.length,2);assert.equal(c.state,'clean');assert.equal(c.canSave,false);assert.equal(c.dispose(),null);
});
test('B1 unknown result reuses original request without silently saving later input',async()=>{
 const calls:Parameters<DraftAdapter['save']>[]=[];const c=setup(async(...p)=>{calls.push(p);if(calls.length===1)throw Object.assign(Error('lost'),{outcome:'unknown'});return saved(calls.length-1,p[0].fields as typeof fields);});
 c.change({...fields,title:'原请求'});await c.flush();assert.equal(c.outcomeUnknown,true);c.change({...fields,title:'后来输入'});await c.flush();
 assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1]);assert.equal(c.state,'dirty');assert.equal(c.snapshot().title,'后来输入');
 await c.flush();assert.equal(c.state,'clean');assert.notEqual(calls[2][1],calls[1][1]);c.dispose();
});
test('B1 conflict never silently retries and preserves edits',async()=>{
 let count=0;const c=setup(async()=>{count++;throw Object.assign(Error('conflict'),{code:'DRAFT_REVISION_CONFLICT',outcome:'rejected'});});
 c.change({...fields,title:'保留'});await c.flush();c.change({...fields,title:'继续保留'});await c.flush();assert.equal(count,1);assert.equal(c.state,'conflict');assert.equal(c.dispose()?.title,'继续保留');
});
test('B1 explicit blank draft allowed and publication disables unchanged actions',async()=>{
 const seed=newCardSession({cardId:'card',deckId:'deck'},'qa');let count=0;
 const c=setup(async p=>{count++;return WorkspaceDraft.parse({...p.fields,cardId:'card',draftType:'qa',revision:1,basePublishedRevision:0,updatedAt:'2026-10-31T00:00:00Z',origin:seed.origin});},seed);
 assert.equal(c.canSave,true);assert.equal(await c.close(),true);await c.flush();assert.equal(count,1);assert.equal(c.canSave,false);
 c.acceptPublication(1);assert.equal(c.publishedUnchanged,true);c.change(fields);assert.equal(c.canSave,true);assert.equal(c.publishedUnchanged,false);c.dispose();
});
test('B1 composition blocks explicit write, failed save retains buffer; local type confirmation has no API mutation',async()=>{
 let count=0;const c=setup(async()=>{count++;throw Object.assign(Error('disk'),{outcome:'rejected'});},newCardSession({cardId:'card',deckId:'deck'},'qa'));
 c.suspend();c.change(fields);await c.flush();assert.equal(count,0);c.resume();await c.flush();assert.equal(count,1);assert.equal(c.state,'error');
 await c.previewType('direct');await c.confirmSwitch();assert.equal(c.snapshot().payload.mode,'direct');assert.equal(count,1);assert.equal(await c.close(),false);c.dispose();
});
