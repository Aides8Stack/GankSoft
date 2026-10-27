// Synthetic-only fixture: typed protocol + real Schema606 services, no SQL data writes.
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import {prepareFreshUnified} from '../../../electron/infrastructure/migrations/coordinator.ts';
import {createFullRestoreSession} from '../../../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../../../shared/protocol/client.ts';
import type {DraftPayloadDTO} from '../../../shared/protocol/card-draft.ts';
export function prototypeData(){
 const html=readFileSync('docs/v075/reference/OPEN-ME-v3.7.html','utf8');
 assert.equal(createHash('sha256').update(html).digest('hex'),'8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015');
 const result:Record<string,any>={};
 for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){
  const ast=ts.createSourceFile('frozen.js',match[1],ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  function visit(n:ts.Node){if(ts.isVariableDeclaration(n)&&n.initializer&&['decks','cards','state','knowledgeTrees'].includes(n.name.getText(ast)))result[n.name.getText(ast)]=vm.runInNewContext('('+n.initializer.getText(ast)+')',Object.create(null),{timeout:1000});ts.forEachChild(n,visit);}visit(ast);
 }
 return result;
}
export async function createR0Fixture(){
 process.env.TZ='Asia/Shanghai';
 const root=mkdtempSync(join(tmpdir(),'gank-r0-matched-')),data=join(root,'synthetic606'),control=data+'-control606';
 let session:Awaited<ReturnType<typeof createFullRestoreSession>>|undefined;
 try{
  await prepareFreshUnified(data,control);
  session=await createFullRestoreSession(control,{workspaceParent:root,selectBackup:async()=>null,allowLegacyRestore:false});
  const at=new Date(),yesterday=new Date(at.getTime()-86400000);let clock=yesterday;session.ctx.now=()=>new Date(clock);
  const client=createClient(r=>session!.execute(r));await client.call('app.capabilities',{});
  const demo=prototypeData(),initial=(await client.call('workspace.catalog',{})).items.filter(x=>x.kind==='deck');
  const folders=[];for(const name of ['公务员考试','申论积累'])folders.push(await client.call('workspace.catalog.save',{kind:'folder',parentId:null,name}));
  const decks:Record<string,any>={},cards:Record<string,any>={},nodes:Record<string,any>={};let todayRemaining=18;
  for(const [index,[key,raw]] of Object.entries(demo.decks).entries()){
   const d=raw as any,old=initial[index];
   const deck=await client.call('workspace.catalog.save',{kind:'deck',name:d.title,parentId:folders[index===4?1:0].id,...(old?{id:old.id,expectedRevision:old.revision}:{})});decks[key]=deck;
   let tree=await client.call('knowledge.tree.read',{deckId:deck.id});const named:Record<string,string>={};
   async function addNode(n:any,parentId:string|null){const node=await client.call('knowledge.node.create',{deckId:deck.id,expectedTreeHash:tree.treeHash,parentId,name:n.name});await client.call('knowledge.node.save',{deckId:deck.id,nodeId:node.nodeId,expectedRevision:node.revision,markdown:n.content||''});named[n.name]=node.nodeId;tree=await client.call('knowledge.tree.read',{deckId:deck.id});for(const c of n.children??[])await addNode(c,node.nodeId);}
   await addNode(demo.knowledgeTrees[key],null);
   while(tree.nodes.length<d.knowledge)await addNode({name:`合成补充知识点 ${tree.nodes.length+1}`,content:'仅用于验证真实树规模与布局'},tree.nodes[0].nodeId);
   nodes[key]=named;
   const examples=demo.cards.filter((c:any)=>c.deck===key);
   for(let i=0;i<d.total;i++){
    const example=examples[i],mode=example?({question:'question',recall:'qa',reading:'direct'} as const)[example.mode as 'question'|'recall'|'reading']:(['question','qa','direct'] as const)[i%3];
    const draft=await client.call('draft.create',{deckId:deck.id,initialType:mode});const e=demo.state.editor;
    const payload:DraftPayloadDTO=mode==='question'?{encoding:'question-v1',mode,fields:{stem:e.question.stem,analysis:e.question.analysis,material:'',source:example?.source||'R0 合成',initialThought:e.question.initialThought,options:e.question.options.map((markdown:string,position:number)=>({optionId:`option-${position}`,position,markdown})),correctOptionId:`option-${e.question.answer}`}}:mode==='qa'?{encoding:'qa-v1',mode,fields:{front:e.recall.front,back:e.recall.back,supplement:e.recall.explanation,source:example?.source||'R0 合成'}}:{encoding:'direct-v1',mode,fields:{body:e.reading.content,source:example?.source||'R0 合成'}};
    const card={deckId:deck.id,cardId:draft.cardId,mode,title:example?.title||`${d.title} 合成卡片 ${i+1}`};
    const saved=await client.call('draft.save',{deckId:card.deckId,cardId:card.cardId,expectedPublishedRevision:0,expectedDraftRevision:1,fields:{title:card.title,payload,mediaRefs:[]}});
    await client.call('card.publish',{deckId:deck.id,cardId:card.cardId,expectedPublishedRevision:0,expectedDraftRevision:saved.revision,resetStudyCycle:false});
    if(example)cards[example.id]=card;
    const linkIds=(example?.knowledge??[]).map((name:string)=>named[name]).filter(Boolean);
    if(linkIds.length)await client.call('knowledge.cardLinks.set',{deckId:deck.id,cardId:card.cardId,expectedRevision:0,nodeIds:linkIds});
    // Leave the first d.due cards unseen. Real FSRS schedules the remainder.
    if(i>=d.due){
     clock=todayRemaining>0?at:yesterday;if(todayRemaining>0)todayRemaining--;
     let s=await client.call('learning.session.open',{deckId:deck.id,cardIds:[card.cardId]});
     s=await client.call('learning.session.change',{deckId:deck.id,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,selectedOptionId:mode==='question'?`option-${e.question.answer}`:null,thought:s.stage==='answer'?'R0 合成历史：真实复盘与FSRS':s.draft.thought,scoreTenths:100,reflection:'合成夹具'}});
     if(s.stage==='answer')s=await client.call('learning.session.change',{deckId:deck.id,sessionId:s.sessionId,expectedRevision:s.revision,action:'reveal'});
     await client.call('learning.review.submit',{deckId:deck.id,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:100,faults:[],gaps:'',reflection:'合成夹具',practice:false});
     s=await client.call('learning.session.get',{deckId:deck.id,sessionId:s.sessionId});await client.call('learning.session.change',{deckId:deck.id,sessionId:s.sessionId,expectedRevision:s.revision,action:'next'});clock=yesterday;
    }
   }
  }
  clock=at;
  const pending=await client.call('learning.session.open',{deckId:decks.language.id,cardIds:[cards[1].cardId]});
  await client.call('learning.session.change',{deckId:decks.language.id,sessionId:pending.sessionId,expectedRevision:pending.revision,action:'pause'});
  const unpublished=await client.call('draft.create',{deckId:decks.language.id,initialType:'qa'});
  const dashboard=await client.call('workspace.dashboard',{}),scoped=await client.call('workspace.dashboard',{deckId:decks.language.id});
  assert.equal(session.ctx.db.prepare('PRAGMA user_version').get()?.user_version,606);
  assert.equal(dashboard.deckCount,5);assert.equal(dashboard.cardCount,242);assert.equal(dashboard.todayCount,18);assert.equal(dashboard.dueCount,53);assert.equal(scoped.cardCount,86);assert.equal(scoped.dueCount,24);assert.equal(scoped.knowledgeCount,28);
  assert.equal(session.ctx.db.prepare('PRAGMA integrity_check').get()?.integrity_check,'ok');assert.deepEqual(session.ctx.db.prepare('PRAGMA foreign_key_check').all(),[]);
  session.close();session=undefined;
  return {root,data,decks,cards,nodes,pendingSession:pending.sessionId,unpublishedId:unpublished.cardId,dashboard,scoped,at:at.toISOString(),seed:'matched-v37-real606-v1',close:()=>rmSync(root,{recursive:true,force:true})};
 }catch(error){session?.close();rmSync(root,{recursive:true,force:true});throw error;}
}
