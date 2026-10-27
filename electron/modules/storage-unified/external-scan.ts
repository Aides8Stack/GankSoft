import {backup,DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {copyFileSync,constants,lstatSync,mkdirSync,mkdtempSync,realpathSync,rmSync} from 'node:fs';
import {dirname,join,resolve,relative,isAbsolute,sep} from 'node:path';
import {ExternalScanSummary,ExternalDeckPage,type ExternalScanSummaryDTO,type ExternalDeckPageDTO} from '../../../shared/storage/external-scan.ts';
import {inspectDatabaseBaseline,type LegacyBaseline} from '../../infrastructure/migrations/baseline.ts';
export interface ExternalScan {
 /** Internal private snapshot, never a renderer-selected import destination. */
 readonly candidateDirectory:string;
 readonly baseline:LegacyBaseline;
 readonly summary:ExternalScanSummaryDTO;
 listDecks(limit?:number,cursor?:string|null):ExternalDeckPageDTO;
 verify():LegacyBaseline;
 close():void;
}
export interface ExternalScanHooks {checkpoint?:(phase:'sqlite-captured'|'media-captured')=>void|Promise<void>}
function inside(parent:string,child:string){const p=relative(parent,child);return p===''||!isAbsolute(p)&&p!=='..'&&!p.startsWith('..'+sep);}
/** Read-only external DB scanning is separate from append, restore and content
 * exchange. SQLite's native backup captures committed WAL; no temp is put in the
 * external data directory. Complete baseline equality rejects source/media drift. */
export async function scanExternalDatabase(databaseFile:string,workspaceParent:string,hooks:ExternalScanHooks={}):Promise<ExternalScan> {
 const file=resolve(databaseFile),source=dirname(file),parent=realpathSync(workspaceParent);
 if(realpathSync(file)!==file||realpathSync(source)!==source||!lstatSync(file).isFile()||lstatSync(file).isSymbolicLink()||inside(source,parent))throw Error('EXTERNAL_SOURCE_INVALID');
 const before=inspectDatabaseBaseline(file,source),workspace=mkdtempSync(join(parent,'gank-external-scan-')),candidateDirectory=join(workspace,'candidate'),captured=join(candidateDirectory,'ganksoft.sqlite');
 let closed=false;
 const assertOpen=()=>{if(closed)throw Error('EXTERNAL_SCAN_CLOSED');};
 try{
  mkdirSync(candidateDirectory);mkdirSync(join(candidateDirectory,'attachments'));
  const db=new DatabaseSync(file,{readOnly:true});try{await backup(db,captured);}finally{db.close();}
  await hooks.checkpoint?.('sqlite-captured');
  for(const media of before.media)copyFileSync(join(source,'attachments',media.name),join(candidateDirectory,'attachments',media.name),constants.COPYFILE_EXCL);
  await hooks.checkpoint?.('media-captured');
  const snapshot=inspectDatabaseBaseline(captured,candidateDirectory);
  if(snapshot.digest!==before.digest||inspectDatabaseBaseline(file,source).digest!==before.digest)throw Error('EXTERNAL_SOURCE_CHANGED');
  const capturedDb=new DatabaseSync(captured,{readOnly:true});let view:ExternalScanSummaryDTO;
  try{view=ExternalScanSummary.parse({scanId:randomUUID(),schemaVersion:before.schemaVersion,sourceGeneration:String(capturedDb.prepare('SELECT epoch FROM protocol_meta WHERE singleton=1').get()!.epoch),
   snapshotDigest:snapshot.digest,deckCount:Number(capturedDb.prepare('SELECT count(*) AS n FROM decks').get()!.n),pendingOperations:Number(capturedDb.prepare("SELECT count(*) AS n FROM platform_operations WHERE state='pending'").get()!.n),
   media:{files:before.media.length,bytes:before.media.reduce((n,m)=>n+m.size,0)}});}finally{capturedDb.close();}
  return {candidateDirectory,baseline:structuredClone(snapshot),summary:structuredClone(view),
   verify(){assertOpen();const current=inspectDatabaseBaseline(captured,candidateDirectory);if(current.digest!==snapshot.digest)throw Error('EXTERNAL_SNAPSHOT_CHANGED');return current;},
   listDecks(limit=50,cursor=null){
    assertOpen();if(!Number.isInteger(limit)||limit<1||limit>100||cursor!==null&&typeof cursor!=='string')throw Error('EXTERNAL_PAGE_INVALID');
    const db=new DatabaseSync(captured,{readOnly:true});try{
     const rows=db.prepare('SELECT id,name,deleted_at FROM decks WHERE (? IS NULL OR id>?) ORDER BY id LIMIT ?').all(cursor,cursor,limit+1),unified=snapshot.schemaVersion===606;
     const count=(sql:string,id:string)=>Number(db.prepare(sql).get(id)!.n);
     const items=rows.slice(0,limit).map(row=>{
      const id=String(row.id),questions=count('SELECT count(*) AS n FROM questions WHERE module=?',id),memories=count('SELECT count(*) AS n FROM memory_cards WHERE module=?',id);
      const active=unified?count('SELECT count(*) AS n FROM learning_cards WHERE deck_id=? AND deleted_at IS NULL',id):count("SELECT count(*) AS n FROM (SELECT module,deleted_at FROM questions UNION ALL SELECT module,deleted_at FROM memory_cards) WHERE module=? AND deleted_at IS NULL",id);
      const recycled=unified?count('SELECT count(*) AS n FROM learning_cards WHERE deck_id=? AND deleted_at IS NOT NULL',id):questions+memories-active;
      const mode=(value:string)=>unified?Number(db.prepare('SELECT count(*) AS n FROM learning_cards WHERE deck_id=? AND deleted_at IS NULL AND published_type=?').get(id,value)!.n):null;
      return {sourceDeckId:id,name:String(row.name),recycled:row.deleted_at!==null,cards:{active,recycled,question:mode('question'),qa:mode('qa'),direct:mode('direct')},legacy:{questions,memories},
       knowledge:{active:count('SELECT count(*) AS n FROM knowledge WHERE module=? AND deleted_at IS NULL',id),recycled:count('SELECT count(*) AS n FROM knowledge WHERE module=? AND deleted_at IS NOT NULL',id)},
       versions:unified?count('SELECT count(*) AS n FROM learning_content_versions v JOIN learning_cards c ON c.id=v.card_id WHERE c.deck_id=?',id):0,
       drafts:unified?count('SELECT count(*) AS n FROM learning_card_drafts d JOIN learning_cards c ON c.id=d.card_id WHERE c.deck_id=?',id):0,
       unpublishedDrafts:unified?count("SELECT count(*) AS n FROM settings WHERE key LIKE 'new-card-draft:%' AND json_extract(value,'$.deckId')=?",id):0,
       reviewEvents:unified?count('SELECT count(*) AS n FROM learning_review_events e JOIN learning_cards c ON c.id=e.card_id WHERE c.deck_id=?',id):count('SELECT count(*) AS n FROM attempts a JOIN questions q ON q.id=a.question_id WHERE q.module=?',id)+count('SELECT count(*) AS n FROM memory_reviews r JOIN memory_cards c ON c.id=r.card_id WHERE c.module=?',id),
       sessions:count('SELECT count(*) AS n FROM study_sessions WHERE deck_id=?',id),
       schedules:unified?count('SELECT count(*) AS n FROM scheduling s JOIN learning_cards c ON c.id=s.card_id WHERE c.deck_id=?',id):count("SELECT count(*) AS n FROM scheduling s JOIN (SELECT id,module FROM questions UNION ALL SELECT id,module FROM memory_cards) c ON c.id=s.card_id WHERE c.module=?",id)};
     });
     return ExternalDeckPage.parse({items,nextCursor:rows.length>limit?String(rows[limit-1].id):null});
    }finally{db.close();}
   },
   close(){if(closed)return;closed=true;rmSync(workspace,{recursive:true,force:true});},
  };
 }catch(e){rmSync(workspace,{recursive:true,force:true});throw e;}
}
