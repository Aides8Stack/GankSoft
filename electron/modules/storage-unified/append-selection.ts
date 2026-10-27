import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {Id} from '../../../shared/protocol/data.ts';
import type {ExternalScan} from './external-scan.ts';
export interface AppendDependency {
 sourceDeckId:string;name:string;
 reasons:{fromDeckId:string;kind:'legacy-question-origin'|'historical-evidence-deck'|'knowledge-relation'|'knowledge-preference'|'archived-page-card'|'session-card';sourceId:string}[];
}
export interface AppendSelectionPlan {snapshotDigest:string;selectedDeckIds:string[];requiredDecks:AppendDependency[];closed:boolean}
/** Plan required source decks without importing them or changing the user's
 * selection. A caller must preview/confirm the complete selection before writes;
 * FK dependencies are never discarded or silently attached to target objects. */
export function planAppendSelection(scan:ExternalScan,deckIds:readonly string[]):AppendSelectionPlan {
 const baseline=scan.verify();
 if(deckIds.length<1||deckIds.length>100||new Set(deckIds).size!==deckIds.length)throw Error('APPEND_SELECTION_INVALID');
 const selected=deckIds.map(v=>Id.parse(v)).sort(),seen=new Set(selected),required=new Map<string,AppendDependency>();
 const db=new DatabaseSync(join(scan.candidateDirectory,'ganksoft.sqlite'),{readOnly:true});
 try{
  for(const id of selected)if(!db.prepare('SELECT 1 FROM decks WHERE id=?').get(id))throw Error('APPEND_SOURCE_DECK_MISSING');
  const queue=[...selected];
  const add=(fromDeckId:string,to:unknown,kind:AppendDependency['reasons'][number]['kind'],sourceId:unknown)=>{
   if(typeof to!=='string'||to===fromDeckId)return;
   const deck=db.prepare('SELECT id,name FROM decks WHERE id=?').get(to);if(!deck)throw Error('APPEND_DEPENDENCY_DECK_MISSING');
   if(!selected.includes(to)){
    let item=required.get(to);if(!item){item={sourceDeckId:to,name:String(deck.name),reasons:[]};required.set(to,item);}
    const reason={fromDeckId,kind,sourceId:String(sourceId)};
    if(!item.reasons.some(r=>JSON.stringify(r)===JSON.stringify(reason)))item.reasons.push(reason);
   }
   if(!seen.has(to)){seen.add(to);queue.push(to);if(seen.size>100)throw Error('APPEND_DEPENDENCY_LIMIT');}
  };
  for(let i=0;i<queue.length;i++){
   const id=queue[i]!;
   for(const r of db.prepare('SELECT m.id,q.module FROM memory_cards m JOIN questions q ON q.id=m.legacy_question_id WHERE m.module=? ORDER BY m.id').iterate(id))
    add(id,r.module,'legacy-question-origin',r.id);
   for(const r of db.prepare('SELECT e.attempt_id,e.deck_id FROM attempt_evidence_snapshots e JOIN attempts a ON a.id=e.attempt_id JOIN questions q ON q.id=a.question_id WHERE q.module=? ORDER BY e.attempt_id').iterate(id))
    add(id,r.deck_id,'historical-evidence-deck',r.attempt_id);
   for(const r of db.prepare('SELECT r.id,a.module AS a,b.module AS b FROM relations r JOIN knowledge a ON a.id=r.source_id JOIN knowledge b ON b.id=r.target_id WHERE a.module=? OR b.module=? ORDER BY r.id').iterate(id,id)){
    add(id,r.a,'knowledge-relation',r.id);add(id,r.b,'knowledge-relation',r.id);
   }
   for(const r of db.prepare('SELECT p.knowledge_id,k.module FROM knowledge_specialty_prefs p JOIN knowledge k ON k.id=p.knowledge_id WHERE p.deck_id=? ORDER BY p.knowledge_id').iterate(id))
    add(id,r.module,'knowledge-preference',r.knowledge_id);
   for(const row of db.prepare('SELECT payload FROM study_sessions WHERE deck_id=?').iterate(id)){
    const page=JSON.parse(String(row.payload)) as {ids:string[]};
    for(const cardId of page.ids){
     const card=baseline.schemaVersion===606?db.prepare('SELECT deck_id AS module FROM learning_cards WHERE id=?').get(cardId):db.prepare('SELECT module FROM questions WHERE id=? UNION ALL SELECT module FROM memory_cards WHERE id=?').get(cardId,cardId);
     if(card)add(id,card.module,'session-card',cardId);
    }
   }
   if(baseline.schemaVersion===606)for(const row of db.prepare("SELECT key,value FROM settings WHERE key LIKE 'unified-archived-session:%' ORDER BY key").iterate()){
    const page=JSON.parse(String(row.value)).document as {deckId:string;ids:string[]};
    if(page.deckId!==id)continue;
    for(const cardId of page.ids){const c=db.prepare('SELECT deck_id FROM learning_cards WHERE id=?').get(cardId);if(!c)throw Error('APPEND_ARCHIVED_CARD_MISSING');add(id,c.deck_id,'archived-page-card',cardId);}
   }
  }
  const byCode=(a:string,b:string)=>a<b?-1:a>b?1:0;
  const result=[...required.values()].sort((a,b)=>byCode(a.sourceDeckId,b.sourceDeckId));
  for(const item of result)item.reasons.sort((a,b)=>byCode(JSON.stringify(a),JSON.stringify(b)));
  if(scan.verify().digest!==baseline.digest)throw Error('EXTERNAL_SNAPSHOT_CHANGED');
  return {snapshotDigest:baseline.digest,selectedDeckIds:selected,requiredDecks:result,closed:result.length===0};
 }finally{db.close();}
}
export function requireClosedAppendSelection(scan:ExternalScan,deckIds:readonly string[]){const plan=planAppendSelection(scan,deckIds);if(!plan.closed||plan.requiredDecks.length)throw Error('APPEND_SELECTION_INCOMPLETE');return [...plan.selectedDeckIds];}
