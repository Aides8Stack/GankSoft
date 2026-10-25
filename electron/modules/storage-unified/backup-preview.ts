import {createHash,randomUUID} from 'node:crypto';
import {copyFileSync,constants,createReadStream,lstatSync,mkdtempSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {stageBackup,readVerifiedBackup} from '../../infrastructure/backup.ts';
import {inspectDatabaseBaseline,type LegacyBaseline} from '../../infrastructure/migrations/baseline.ts';
import {FullBackupSummary,type FullBackupSummaryDTO} from '../../../shared/storage/full-backup.ts';
const MAX_ARCHIVE=512*1024*1024; // Same bound as the existing ZIP reader.
async function fileHash(path:string){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
function summary(directory:string,baseline:LegacyBaseline,createdAt:string):FullBackupSummaryDTO {
 const db=new DatabaseSync(join(directory,'ganksoft.sqlite'),{readOnly:true});
 try{
  const rows=new Map(baseline.tables.map(t=>[t.name,t.rows])),count=(table:string)=>rows.get(table)??0;
  const split=(table:'decks'|'knowledge')=>({active:Number(db.prepare(`SELECT count(*) AS n FROM ${table} WHERE deleted_at IS NULL`).get()!.n),recycled:Number(db.prepare(`SELECT count(*) AS n FROM ${table} WHERE deleted_at IS NOT NULL`).get()!.n)});
  const unified=baseline.schemaVersion===606,modes={question:0,qa:0,direct:0,recycled:0};
  if(unified)for(const row of db.prepare('SELECT published_type,deleted_at,count(*) AS n FROM learning_cards GROUP BY published_type,deleted_at').iterate()){
   if(row.deleted_at!==null)modes.recycled+=Number(row.n);else modes[row.published_type as 'question'|'qa'|'direct']+=Number(row.n);
  }
  return FullBackupSummary.parse({previewId:randomUUID(),kind:'full-backup',schemaVersion:baseline.schemaVersion,createdAt,requiresUnifiedMigration:!unified,
   decks:split('decks'),knowledge:split('knowledge'),unifiedCards:unified?modes:null,versions:count('learning_content_versions'),
   drafts:{publishedCard:count('learning_card_drafts'),unpublishedCard:unified?Number(db.prepare("SELECT count(*) AS n FROM settings WHERE key LIKE 'new-card-draft:%'").get()!.n):0},
   reviewEvents:unified?count('learning_review_events'):count('attempts')+count('memory_reviews'),studyCycles:count('learning_study_cycles'),sessions:count('study_sessions'),schedules:count('scheduling'),
   legacy:{questions:count('questions'),memories:count('memory_cards'),attempts:count('attempts'),memoryReviews:count('memory_reviews')},
   media:{files:baseline.media.length,bytes:baseline.media.reduce((sum,m)=>sum+m.size,0)},
  });
 }finally{db.close();}
}
export interface FullBackupPreview {
 /** Internal owner-side path; never expose it as a renderer-controlled restore destination. */
 readonly candidateDirectory:string;
 readonly archiveSha256:string;
 readonly baseline:LegacyBaseline;
 readonly summary:FullBackupSummaryDTO;
 verify():Promise<LegacyBaseline>;
 close():void;
}
/** Capture a private, bounded ZIP copy, then reuse the existing schema/media/FK/
 * immutable-record checks. No active database is opened, upgraded or overwritten.
 * This is preparation for controlled restore, not the restore commit operation. */
export async function previewFullBackup(source:string,workspaceParent:string):Promise<FullBackupPreview> {
 const input=lstatSync(source);if(!input.isFile()||input.isSymbolicLink()||input.size>MAX_ARCHIVE)throw Error('BACKUP_SOURCE_INVALID');
 const workspace=mkdtempSync(join(resolve(workspaceParent),'gank-full-backup-')),archive=join(workspace,'captured.zip'),candidateDirectory=join(workspace,'candidate');
 try{
  const expected=await fileHash(source);copyFileSync(source,archive,constants.COPYFILE_EXCL);
  if(lstatSync(archive).size>MAX_ARCHIVE||await fileHash(archive)!==expected||await fileHash(source)!==expected)throw Error('BACKUP_SOURCE_CHANGED');
  const {manifest}=await readVerifiedBackup(archive);if(![604,606].includes(manifest.schemaVersion))throw Error('BACKUP_SCHEMA_UNSUPPORTED');await stageBackup(archive,candidateDirectory);
  const baseline=inspectDatabaseBaseline(join(candidateDirectory,'ganksoft.sqlite'),candidateDirectory),view=summary(candidateDirectory,baseline,manifest.createdAt);let closed=false;
  return {candidateDirectory,archiveSha256:expected,baseline:structuredClone(baseline),summary:structuredClone(view),
   async verify(){if(closed)throw Error('BACKUP_PREVIEW_CLOSED');if(await fileHash(archive)!==expected)throw Error('BACKUP_CAPTURE_CHANGED');const current=inspectDatabaseBaseline(join(candidateDirectory,'ganksoft.sqlite'),candidateDirectory);if(current.digest!==baseline.digest)throw Error('BACKUP_CANDIDATE_CHANGED');return current;},
   close(){if(closed)return;closed=true;rmSync(workspace,{recursive:true,force:true});},
  };
 }catch(e){rmSync(workspace,{recursive:true,force:true});throw e;}
}
