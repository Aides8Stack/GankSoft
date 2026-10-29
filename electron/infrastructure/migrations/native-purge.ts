import {installKnowledgeHistory} from './knowledge-history.ts';
import type {DatabaseSync} from 'node:sqlite';
import {transaction} from '../database.ts';

const scopes=new WeakMap<DatabaseSync,Set<string>>();
export const immutableTables=['learning_content_versions','learning_study_cycles','learning_review_events'] as const;
/** Schema606 extension v1. UPDATE remains unconditionally immutable. DELETE is
 * permitted only for a recycled card in a synchronous, connection-local scope.
 * No SQL table can grant authority, and a scope never survives an exception. */
export const NATIVE_PURGE_TRIGGERS=immutableTables.map(table=>`
CREATE TRIGGER ${table}_immutable_delete BEFORE DELETE ON ${table}
WHEN native_purge_authorized(OLD.card_id)<>1 OR NOT EXISTS
 (SELECT 1 FROM learning_cards WHERE id=OLD.card_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'immutable learning record'); END;
`).join('');

export function installNativePurge(db:DatabaseSync){
 installKnowledgeHistory(db);
 if(scopes.has(db))return;
 db.function('native_purge_authorized',(id)=>scopes.get(db)?.has(String(id))?1:0);
 scopes.set(db,new Set());
 const current=String(db.prepare("SELECT sql FROM sqlite_master WHERE name='learning_content_versions_immutable_delete'").get()?.sql??'');
 if(current.includes('native_purge_authorized'))return;
 transaction(db,()=>{
  for(const table of immutableTables)db.exec(`DROP TRIGGER ${table}_immutable_delete`);
  db.exec(NATIVE_PURGE_TRIGGERS);
 });
}

export function withNativePurgeScope<T>(db:DatabaseSync,ids:string[],action:()=>T):T{
 const scope=scopes.get(db);
 if(!db.isTransaction||!scope||scope.size)throw Error('永久删除必须使用唯一事务与逐卡授权');
 for(const id of ids){
  if(!db.prepare('SELECT 1 FROM learning_cards WHERE id=? AND deleted_at IS NOT NULL').get(id))throw Error('永久删除范围包含未回收卡片');
 }
 try{ids.forEach(id=>scope.add(id));return action();}finally{scope.clear();}
}
