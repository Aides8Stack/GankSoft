// Explicit recovery for the lost R7.4 cache: only three cards, no 242-card rebuild.
import assert from 'node:assert/strict';
import {mkdirSync,existsSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {prepareFreshUnified} from '../../../electron/infrastructure/migrations/coordinator.ts';
import {createFullRestoreSession} from '../../../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../../../shared/protocol/client.ts';
import {prototypeData} from '../r0/fixture.ts';
const cache=resolve(process.env.R74_CACHE??'validation-results/r73/pristine');
assert.ok(!existsSync(join(cache,'fixture.json')),'do not overwrite an existing closed fixture');
const root=join(cache,'root'),data=join(root,'synthetic606');mkdirSync(root,{recursive:true});
await prepareFreshUnified(data,data+'-control606');
const owner=await createFullRestoreSession(data+'-control606',{workspaceParent:root,selectBackup:async()=>null,allowLegacyRestore:false});
try{
 const api=createClient(r=>owner.execute(r));await api.call('app.capabilities',{});
 const deck=await api.call('workspace.catalog.save',{kind:'deck',name:'言语理解',parentId:null});
 const cards:Record<string,any>={},demo=prototypeData(),q=demo.state.editor.question;
 for(const [i,mode] of (['question','qa','direct'] as const).entries()){
  const d=await api.call('draft.create',{deckId:deck.id,initialType:mode});
  const payload:any=mode==='question'?{mode,encoding:'question-v1',fields:{stem:q.stem,material:'',analysis:q.analysis,initialThought:q.initialThought,source:'R74 最小合成',options:q.options.map((markdown:string,position:number)=>({optionId:'o'+position,position,markdown})),correctOptionId:'o'+q.answer}}:mode==='qa'?{mode,encoding:'qa-v1',fields:{front:'合成问题',back:'合成答案',supplement:'',source:'R74 最小合成'}}:{mode,encoding:'direct-v1',fields:{body:'合成直接记忆正文',source:'R74 最小合成'}};
  const title=i===0?demo.cards.find((c:any)=>c.id===1).title:'R74 '+mode;
  const saved=await api.call('draft.save',{deckId:deck.id,cardId:d.cardId,expectedPublishedRevision:0,expectedDraftRevision:d.revision,fields:{title,payload,mediaRefs:[]}});
  await api.call('card.publish',{deckId:deck.id,cardId:d.cardId,expectedPublishedRevision:0,expectedDraftRevision:saved.revision,resetStudyCycle:false});
  cards[i+1]={deckId:deck.id,cardId:d.cardId,title,mode};
 }
 writeFileSync(join(cache,'fixture.json'),JSON.stringify({root,data,decks:{language:deck},cards,nodes:{language:{}},seed:'r74-minimal-three-card-real606'},null,2)+'\n');
}finally{owner.close();}
console.log('R74 最小封闭合成夹具已恢复：3卡，知识树由现有专项按冻结原型恢复。');
