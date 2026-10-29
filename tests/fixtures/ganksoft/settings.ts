// R6 small606 resource: reuse the versioned3-node/1-image fixture and real APIs.
import {b2Fixture} from './b2.ts';
import {createFullRestoreSession} from '../../../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../../../shared/protocol/client.ts';
export async function settingsFixture(tag:string){
 const f=await b2Fixture({metadata:`validation-results/r6-${tag}/fixture-${Date.now()}.json`});
 const owner=await createFullRestoreSession(f.data+'-control606',{workspaceParent:f.root,selectBackup:async()=>null,allowLegacyRestore:false});
 try{const api=createClient(r=>owner.execute(r));await api.call('app.capabilities',{});let at=new Date();owner.ctx.now=()=>new Date(at);
 const complete=async(cardId:string)=>{let s=await api.call('learning.session.open',{deckId:f.deck.id,cardIds:[cardId]});if(s.stage!=='result'){s=await api.call('learning.session.change',{deckId:f.deck.id,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:100,reflection:'R6合成历史'}});await api.call('learning.review.submit',{deckId:f.deck.id,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:100,faults:[],gaps:'',reflection:'R6合成历史',practice:false});}s=await api.call('learning.session.get',{deckId:f.deck.id,sessionId:s.sessionId});await api.call('learning.session.change',{deckId:f.deck.id,sessionId:s.sessionId,expectedRevision:s.revision,action:'next'});};
 for(const row of (await api.call('workspace.sessions',{deckId:f.deck.id})).items){if(!row.completed){const s=await api.call('learning.session.get',{deckId:f.deck.id,sessionId:row.sessionId});if(s.stage==='result')await api.call('learning.session.change',{deckId:f.deck.id,sessionId:s.sessionId,expectedRevision:s.revision,action:'next'});}}
 const make=async(title:string)=>{const d=await api.call('draft.create',{deckId:f.deck.id,initialType:'direct'});const scope={deckId:f.deck.id,cardId:d.cardId};const doc=await api.call('draft.save',{...scope,expectedPublishedRevision:0,expectedDraftRevision:d.revision,fields:{title,payload:{encoding:'direct-v1',mode:'direct',fields:{body:'R6小型合成卡片正文',source:''}},mediaRefs:[]}});await api.call('card.publish',{...scope,expectedPublishedRevision:0,expectedDraftRevision:doc.revision,resetStudyCycle:false});return scope;};
 const overdue=await make('R6 已逾期'),future=await make('R6 可提前'),override=await make('R6 单卡覆盖');at=new Date('2026-01-01T06:00:00Z');await complete(overdue.cardId);at=new Date();await complete(future.cardId);await complete(override.cardId);await api.call('policy.card.set',{kind:'card',cardId:override.cardId,expectedRevision:0,maxIntervalDays:30});return {...f,overdue,future,override,r6Version:1};
 }finally{owner.close();}
}
