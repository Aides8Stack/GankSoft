import {DatabaseSync} from 'node:sqlite';
import {INITIAL_SCHEMA} from '../schema.ts';
import {transaction} from '../database.ts';
const normalize=(s:string)=>s.replaceAll('"','').trim().replace(/\s+/g,' ');
export const HISTORY_IDENTITIES='CREATE TABLE knowledge_history_identities (id TEXT PRIMARY KEY NOT NULL)';
const faultTable=(name:string)=>`CREATE TABLE ${name} (
 id TEXT PRIMARY KEY, attempt_id TEXT NOT NULL REFERENCES attempts(id),
 knowledge_id TEXT REFERENCES knowledge_history_identities(id),
 knowledge_snapshot TEXT NOT NULL DEFAULT '', category TEXT NOT NULL, detail TEXT NOT NULL DEFAULT ''
)`;
const identityTrigger=`CREATE TRIGGER knowledge_history_identity_insert AFTER INSERT ON knowledge
 BEGIN INSERT OR IGNORE INTO knowledge_history_identities(id) VALUES(NEW.id); END`;
let original:string;
function oldSQL(){if(!original){const ref=new DatabaseSync(':memory:');try{ref.exec(INITIAL_SCHEMA);original=normalize(String(ref.prepare("SELECT sql FROM sqlite_master WHERE name='attempt_faults'").get()!.sql));}finally{ref.close();}}return original;}
export function validateKnowledgeHistory(db:DatabaseSync):boolean{
 const fault=normalize(String(db.prepare("SELECT sql FROM sqlite_master WHERE name='attempt_faults'").get()?.sql??''));
 const table=db.prepare("SELECT sql FROM sqlite_master WHERE name='knowledge_history_identities'").get(),trigger=db.prepare("SELECT sql FROM sqlite_master WHERE name='knowledge_history_identity_insert'").get();
 if(!table&&!trigger&&fault===oldSQL())return false;
 if(!table||!trigger||normalize(String(table.sql))!==normalize(HISTORY_IDENTITIES)||normalize(String(trigger.sql))!==normalize(identityTrigger)||fault!==normalize(faultTable('attempt_faults')))throw Error('知识历史身份扩展结构未识别');
 if(db.prepare('SELECT 1 FROM knowledge k LEFT JOIN knowledge_history_identities h ON h.id=k.id WHERE h.id IS NULL LIMIT 1').get())throw Error('知识历史身份缺失');
 if(db.prepare('SELECT 1 FROM attempt_faults f LEFT JOIN knowledge_history_identities h ON h.id=f.knowledge_id WHERE f.knowledge_id IS NOT NULL AND h.id IS NULL LIMIT 1').get())throw Error('错因历史身份外键缺失');
 return true;
}
/** Keep every fault value/rowid and its FK to attempts. The knowledge FK now
 * targets a content-free historical identity, separate from the live node. */
export function installKnowledgeHistory(db:DatabaseSync,checkpoint:(phase:'copied'|'swapped')=>void=()=>{}){
 if(validateKnowledgeHistory(db))return;
 // A rebuild must not silently discard an unrecognized index/trigger/inbound FK.
 const extra=db.prepare("SELECT name FROM sqlite_master WHERE tbl_name='attempt_faults' AND sql IS NOT NULL AND type IN ('trigger','index') AND name<>'attempt_faults_attempt'").all();
 if(extra.length)throw Error('错因表存在未识别扩展，拒绝迁移');
 for(const r of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()){
  const name=String(r.name);if(!/^[a-zA-Z_0-9]+$/.test(name))throw Error('未识别表名');
  if(db.prepare(`PRAGMA foreign_key_list(${name})`).all().some(f=>f.table==='attempt_faults'))throw Error('错因表存在外部依赖，拒绝迁移');
 }
 transaction(db,()=>{
  db.exec(HISTORY_IDENTITIES);
  db.exec('INSERT INTO knowledge_history_identities SELECT id FROM knowledge');
  db.exec(faultTable('attempt_faults_history_next'));
  db.exec(`INSERT INTO attempt_faults_history_next(rowid,id,attempt_id,knowledge_id,knowledge_snapshot,category,detail)
   SELECT rowid,id,attempt_id,knowledge_id,knowledge_snapshot,category,detail FROM attempt_faults`);
  checkpoint('copied');
  db.exec('DROP TABLE attempt_faults;ALTER TABLE attempt_faults_history_next RENAME TO attempt_faults;CREATE INDEX attempt_faults_attempt ON attempt_faults(attempt_id)');
  db.exec(identityTrigger);checkpoint('swapped');
  validateKnowledgeHistory(db);
  if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('知识历史身份迁移外键检查失败');
 });
}
