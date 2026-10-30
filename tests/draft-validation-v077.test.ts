import test from 'node:test';
import assert from 'node:assert/strict';
import {CardDraftController,type DraftAdapter} from '../src/cards/draft-controller.ts';
import {DraftPreview,WorkspaceDraft} from '../shared/protocol/card-draft.ts';
const fields={title:'合法标题',payload:{encoding:'direct-v1' as const,mode:'direct' as const,fields:{body:'正文',source:''}},mediaRefs:[]};
const initial=DraftPreview.parse({cardId:'card',deckId:'deck',targetType:'direct',publishedRevision:1,draftRevision:null,token:'a'.repeat(64),fields,origin:{versionId:'version',mode:'direct',strategy:'published-target',mappingVersion:'six-way/1'},requiredFields:[],warnings:[]});
const saved=(revision:number,value=fields)=>WorkspaceDraft.parse({...value,cardId:'card',draftType:'direct',revision,basePublishedRevision:1,updatedAt:'2026-10-30T00:00:00Z',origin:initial.origin});
function controller(save:DraftAdapter['save']){return new CardDraftController({cardId:'card',deckId:'deck'},initial,null,{save,previewSwitch:async()=>initial,switchType:async()=>{throw Error('unused');}},()=>{},60_000);}
test('Invalid title stays editable, blocks save/close and resumes at unchanged CAS revision after correction',async()=>{
 const calls:unknown[]=[];const c=controller(async p=>{calls.push(p);return saved(1,p.fields);});
 c.change({...fields,title:'超'.repeat(301)});
 assert.equal(c.state,'error');assert.match(c.error,/标题最多300个字符/);assert.equal(c.snapshot().title.length,301);
 await c.flush();assert.equal(calls.length,0);assert.equal(await c.close(),false);
 c.change({...fields,title:'好'.repeat(300)});await c.flush();assert.equal(c.state,'clean');assert.equal(c.revision,1);assert.equal(calls.length,1);c.dispose();
});
test('Invalid edits while an older write is in flight cannot become clean when its receipt arrives',async()=>{
 let finish!:(v:ReturnType<typeof saved>)=>void;const c=controller(async()=>new Promise(resolve=>finish=resolve));
 c.change(fields);const running=c.flush();c.change({...fields,title:'x'.repeat(301)});finish(saved(1));await running;
 assert.equal(c.state,'error');assert.equal(c.revision,1);assert.equal(c.snapshot().title.length,301);
 assert.equal(c.dispose()?.title.length,301);
});
test('Unknown valid write keeps exact identity; invalid newer input is never sent after reconciliation',async()=>{
 const calls:{p:Parameters<DraftAdapter['save']>[0];id:string}[]=[];
 const c=controller(async(p,id)=>{calls.push({p,id});if(calls.length===1)throw Object.assign(Error('lost'),{outcome:'unknown'});return saved(calls.length===2?1:2,p.fields);});
 c.change(fields);await c.flush();c.change({...fields,title:'z'.repeat(301)});await c.flush();
 assert.equal(calls.length,2);assert.deepEqual(calls[1],calls[0]);assert.equal(c.state,'error');assert.equal(c.revision,1);
 c.change({...fields,title:'恢复'});await c.flush();assert.equal(calls.length,3);assert.notEqual(calls[2].id,calls[0].id);assert.equal(calls[2].p.expectedDraftRevision,1);assert.equal(c.state,'clean');c.dispose();
});
