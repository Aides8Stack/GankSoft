import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {openSync,closeSync} from 'node:fs';
import {INITIAL_SCHEMA} from './schema.ts';
import {REVIEW_SCHEMA,DUE_SCHEMA,EVIDENCE_SCHEMA} from './review-schema.ts';
import {APPLICATION_ID,DEFAULT_MEMORY_DECK,DEFAULT_QUESTION_DECK,transaction} from './database.ts';
import {UNIFIED_SCHEMA} from './migrations/unified-schema.ts';
import {validateUnifiedData} from './migrations/unified-integrity.ts';
import {sqliteProtocolStore} from '../protocol/sqlite-store.ts';

/** Fresh 606, with the shared foundation DDL. Never opens or converts an old DB.
 * source_schema=604 denotes the retained DDL lineage, not migrated user data. */
export function initializeFreshUnified(path:string) {
 // Exclusive creation rejects even an empty or symlinked existing file before SQLite touches it.
 closeSync(openSync(path,'wx',0o600));
 const db=new DatabaseSync(path);
 try {
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000');
  if(db.prepare('SELECT 1 FROM sqlite_master LIMIT 1').get() || Number(db.prepare('PRAGMA user_version').get()?.user_version)!==0)
   throw Error('拒绝覆盖已有数据库');
  transaction(db,()=>{
   db.exec(INITIAL_SCHEMA);db.exec(REVIEW_SCHEMA);db.exec(DUE_SCHEMA);db.exec(EVIDENCE_SCHEMA);
   sqliteProtocolStore(db);
   db.exec('CREATE TABLE platform_operations(request_id TEXT PRIMARY KEY,epoch TEXT NOT NULL,method TEXT NOT NULL,digest TEXT NOT NULL,state TEXT NOT NULL,created_at TEXT NOT NULL)');
   db.prepare('INSERT INTO settings VALUES (?,?)').run('review','{"dailyLimit":15,"maxInterval":365}');
   db.prepare('INSERT INTO settings VALUES (?,?)').run('studyTimezone',Intl.DateTimeFormat().resolvedOptions().timeZone);
   for(const [id,name,kind] of [[DEFAULT_QUESTION_DECK,'错题复盘','question'],[DEFAULT_MEMORY_DECK,'记忆积累','memory']]) {
    db.prepare('INSERT INTO decks(id,name,kind) VALUES (?,?,?)').run(id,name,kind);
    db.prepare('INSERT INTO deck_review_policies VALUES (?,15,365)').run(id);
   }
   db.exec(UNIFIED_SCHEMA);
   db.prepare("INSERT INTO learning_model_meta VALUES(1,604,606,'staged',?)")
    .run(createHash('sha256').update('GankSoft fresh606 shared foundation v1').digest('hex'));
   db.exec(`PRAGMA user_version=606;PRAGMA application_id=${APPLICATION_ID}`);
   validateUnifiedData(db);
   if(db.prepare('PRAGMA foreign_key_check').all().length || db.prepare('PRAGMA integrity_check').get()?.integrity_check!=='ok')throw Error('全新606完整性验证失败');
  });
  return db;
 }catch(e){db.close();throw e;}
}
