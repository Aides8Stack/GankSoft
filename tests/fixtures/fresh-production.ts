import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {prepareFreshUnified} from '../../electron/infrastructure/migrations/coordinator.ts';
import {createFullRestoreSession} from '../../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../../shared/protocol/client.ts';
import {validateUnifiedData} from '../../electron/infrastructure/migrations/unified-integrity.ts';
import {DEFAULT_QUESTION_DECK} from '../../electron/infrastructure/database.ts';
import type {DraftPayloadDTO} from '../../shared/protocol/card-draft.ts';

export async function freshFixture(){
 const root=mkdtempSync(join(tmpdir(),'gank-production606-')),data=join(root,'默认 数据'),control=data+'-control606';
 await prepareFreshUnified(data,control);
 let session=await createFullRestoreSession(control,{workspaceParent:root,selectBackup:async()=>null,allowLegacyRestore:false});
 let client=createClient(r=>session.execute(r));await client.call('app.capabilities',{});
 return {root,data,control,get ctx(){return session.ctx;},get client(){return client;},
  async reopen(){session.close();await prepareFreshUnified(data,control);session=await createFullRestoreSession(control,{workspaceParent:root,selectBackup:async()=>null,allowLegacyRestore:false});client=createClient(r=>session.execute(r));await client.call('app.capabilities',{});},
  close(){session.close();rmSync(root,{recursive:true,force:true});},
 };
}
export async function publishFresh(client:ReturnType<typeof createClient>,mode:'question'|'qa'|'direct',deckId=DEFAULT_QUESTION_DECK){
 const d=await client.call('draft.create',{deckId,initialType:mode});
 const payload:DraftPayloadDTO=mode==='question'?{encoding:'question-v1',mode,fields:{stem:'正式模式单选／判断 $x^2$',material:'',analysis:'**解析**',source:'',initialThought:'',options:[{optionId:'a',position:0,markdown:'正确'},{optionId:'b',position:1,markdown:'错误'}],correctOptionId:'a'}}:mode==='qa'?{encoding:'qa-v1',mode,fields:{front:'正式问题',back:'**正式答案** $E=mc^2$',supplement:'',source:''}}:{encoding:'direct-v1',mode,fields:{body:'# 正式记忆\n\n$E=mc^2$',source:''}};
 const fields={title:'正式合成'+mode,payload,mediaRefs:[]};
 const saved=await client.call('draft.save',{deckId,cardId:d.cardId,expectedPublishedRevision:0,expectedDraftRevision:1,fields});
 await client.call('card.publish',{deckId,cardId:d.cardId,expectedPublishedRevision:0,expectedDraftRevision:saved.revision,resetStudyCycle:false});
 return {deckId,cardId:d.cardId};
}

