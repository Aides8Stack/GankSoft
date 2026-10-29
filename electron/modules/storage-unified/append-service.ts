import {installKnowledgeHistory} from '../../infrastructure/migrations/knowledge-history.ts';
import {randomUUID,createHash} from 'node:crypto';
import {DatabaseSync,backup,type SQLInputValue} from 'node:sqlite';
import {copyFileSync,constants,lstatSync,mkdirSync,mkdtempSync,readFileSync,realpathSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {AppendConfirmation,AppendReceipt,type AppendConfirmationDTO,type AppendReceiptDTO} from '../../../shared/protocol/external-append.ts';
import {DomainError} from '../../../shared/domain-error.ts';
import {digest} from '../cards-unified/schedule.ts';
import {transaction} from '../../infrastructure/database.ts';
import {guardDatabaseAccess,hasWriteOwner} from '../../infrastructure/write-owner.ts';
import {validateBusinessData} from '../../infrastructure/integrity.ts';
import {inspectDatabaseBaseline} from '../../infrastructure/migrations/baseline.ts';
import {legacyProjectionDigest,synchronizeLegacyModel} from '../../infrastructure/migrations/legacy-projection.ts';
import {openUnifiedOwner,readRestoreStatus,type ActivationHooks} from '../../infrastructure/migrations/coordinator.ts';
import {createBackup} from '../../infrastructure/backup.ts';
import {scanExternalDatabase,type ExternalScan} from './external-scan.ts';
import {collectAppendGraph} from './append-graph.ts';
import {mapAppendGraph} from './append-map.ts';
import {appendDeckVersions,appendProvenanceSetting,planAppendDuplicates} from './append-provenance.ts';
import {previewFullBackup,type FullBackupPreview} from './backup-preview.ts';
type Owner=ReturnType<typeof openUnifiedOwner>;
const quote=(name:string)=>'"'+name.replaceAll('"','""')+'"';
const key=(id:string)=>'append-operation:'+id;
function fail(code:string,message:string):never{throw new DomainError(code,message);}
/** The attached original is a private immutable capture, not the live DB.
 * Group counts also protect identical legacy session rows without a primary key. */
function assertOriginalRows(db:DatabaseSync){
 for(const row of db.prepare("SELECT name FROM original.sqlite_master WHERE type='table'").all()){
  const table=String(row.name);if(['protocol_meta','learning_owner'].includes(table))continue;
  const cols=db.prepare(`PRAGMA original.table_info(${quote(table)})`).all().map(r=>quote(String(r.name))).join(',');
  if(db.prepare(`SELECT 1 FROM (SELECT ${cols},count(*) AS copies FROM original.${quote(table)} GROUP BY ${cols} EXCEPT SELECT ${cols},count(*) AS copies FROM main.${quote(table)} GROUP BY ${cols}) LIMIT 1`).get())
   fail('APPEND_EXISTING_FACT_CHANGED','候选改变了目标已有事实，禁止追加');
 }
}
export function readIndependentAppendResult(control:string,operationId:string){
 const status=readRestoreStatus(control,operationId);if(!status||status.state!=='committed')return null;
 const path=join(status.activeDir,'ganksoft.sqlite');
 if(realpathSync(status.activeDir)!==status.activeDir||realpathSync(path)!==path||!lstatSync(path).isFile()||lstatSync(path).isSymbolicLink())fail('APPEND_RECEIPT_UNAVAILABLE','已提交追加的回执位置不可用');
 const db=new DatabaseSync(path,{readOnly:true});try{
  const row=db.prepare('SELECT value FROM settings WHERE key=?').get(key(operationId));if(!row)return null;
  const receipt=AppendReceipt.parse(JSON.parse(String(row.value)));if(receipt.operationId!==operationId)fail('APPEND_RECEIPT_INVALID','追加回执身份不一致');
  return {...receipt,state:'committed' as const,epoch:status.epoch,recoveryPointAvailable:status.recoveryPoint!==null};
 }finally{db.close();}
}
export interface AppendBuildHooks {checkpoint?:(phase:'append:copied'|'append:rows'|'append:validated')=>void}
export async function prepareIndependentAppend(owner:Owner,source:ExternalScan,selectedDeckIds:readonly string[],workspaceParent:string,
 options:{folderId?:string|null;forceIndependent?:boolean}={},hooks:AppendBuildHooks={}){
 guardDatabaseAccess(owner.db);if(!hasWriteOwner(owner.db))fail('APPEND_OWNER_REQUIRED','追加必须使用已激活的唯一606所有者');
 installKnowledgeHistory(owner.db);
 const graph=collectAppendGraph(source,selectedDeckIds),versions=appendDeckVersions(graph),duplicates=planAppendDuplicates(owner.db,versions,options.forceIndependent??false),folderId=options.folderId??null;
 if(folderId&&!owner.db.prepare('SELECT 1 FROM folders WHERE id=? AND deleted_at IS NULL').get(folderId))fail('APPEND_FOLDER_CHANGED','目标文件夹不存在或已删除');
 if(!duplicates.importDeckIds.length)return {plan:duplicates,confirmation:null,close(){},async confirm(){return fail('APPEND_NOTHING_TO_IMPORT','没有可追加的新卡片集，请核对跳过项或明确选择独立追加');}};
 const meta=owner.db.prepare('SELECT epoch,revision FROM protocol_meta WHERE singleton=1').get()!,base=await scanExternalDatabase(join(owner.dataDir,'ganksoft.sqlite'),workspaceParent);
 let workspace:string|undefined,preview:FullBackupPreview|undefined;
 try{
  if(base.baseline.schemaVersion!==606)fail('APPEND_OWNER_REQUIRED','当前所有者必须为已激活606');
  const operationId=randomUUID(),confirmation=AppendConfirmation.parse({operationId,previewId:randomUUID(),expectedEpoch:meta.epoch,expectedRevision:meta.revision,
   targetDigest:base.baseline.digest,sourceSnapshot:graph.snapshotDigest,sourceGraphDigest:graph.graphDigest,selectedDeckIds:graph.selectedDeckIds,forceIndependent:duplicates.forceIndependent,folderId,appendIndependent:true});
  const mapped=mapAppendGraph(collectAppendGraph(source,duplicates.importDeckIds),operationId,folderId),requestHash=digest(confirmation),createdAt=new Date().toISOString();
  const imported=mapped.identities.filter(v=>v.kind==='deck'&&duplicates.importDeckIds.includes(v.sourceId)).map(v=>({sourceDeckId:v.sourceId,destinationDeckId:v.destinationId,sourceVersion:versions.find(s=>s.sourceDeckId===v.sourceId)!.sourceVersion}));
  const receipt=AppendReceipt.parse({encoding:'ganksoft.independent-append-result/1',operationId,requestHash,imported,skippedDeckIds:duplicates.skippedDeckIds,blockedDeckIds:duplicates.blockedDeckIds,createdAt});
  workspace=mkdtempSync(join(realpathSync(workspaceParent),'gank-append-build-'));const candidate=join(workspace,'candidate'),file=join(candidate,'ganksoft.sqlite');mkdirSync(candidate);mkdirSync(join(candidate,'attachments'));
  const original=new DatabaseSync(join(base.candidateDirectory,'ganksoft.sqlite'),{readOnly:true});try{await backup(original,file);}finally{original.close();}
  for(const m of base.baseline.media)copyFileSync(join(base.candidateDirectory,'attachments',m.name),join(candidate,'attachments',m.name),constants.COPYFILE_EXCL);
  for(const m of mapped.media){const path=join(source.candidateDirectory,'attachments',m.sourceName),bytes=readFileSync(path);if(bytes.length!==m.size||createHash('sha256').update(bytes).digest('hex')!==m.sha256)fail('APPEND_SOURCE_CHANGED','来源媒体与固定快照不一致');copyFileSync(path,join(candidate,'attachments',m.destinationName),constants.COPYFILE_EXCL);}
  hooks.checkpoint?.('append:copied');
  const db=new DatabaseSync(file);try{
   db.exec('PRAGMA foreign_keys=ON;PRAGMA journal_mode=WAL');db.prepare('ATTACH DATABASE ? AS original').run(join(base.candidateDirectory,'ganksoft.sqlite'));
   transaction(db,()=>{
    db.exec('PRAGMA defer_foreign_keys=ON');
    for(const [table,rows]of Object.entries(mapped.tables))for(const row of rows){const cols=Object.keys(row);db.prepare(`INSERT ${table==='knowledge_history_identities'?'OR IGNORE ':''}INTO ${quote(table)}(${cols.map(quote).join(',')}) VALUES(${cols.map(()=>'?').join(',')})`).run(...Object.values(row) as SQLInputValue[]);}
    for(const m of imported){const v=versions.find(v=>v.sourceDeckId===m.sourceDeckId)!,row=appendProvenanceSetting({encoding:'ganksoft.independent-append-provenance/1',operationId,sourceDeckId:m.sourceDeckId,sourceVersion:v.sourceVersion,sourceKey:v.sourceKey,sourceSchema:graph.sourceSchema,sourceGeneration:graph.sourceGeneration,sourceSnapshot:graph.snapshotDigest,destinationDeckId:m.destinationDeckId,createdAt});db.prepare('INSERT INTO settings VALUES(?,?)').run(row.key!,row.value!);}
    db.prepare('INSERT INTO settings VALUES(?,?)').run(key(operationId),JSON.stringify(receipt));hooks.checkpoint?.('append:rows');
    synchronizeLegacyModel(db);db.prepare('UPDATE learning_owner SET legacy_digest=? WHERE singleton=1').run(legacyProjectionDigest(db));assertOriginalRows(db);validateBusinessData(db);
    if(db.prepare('PRAGMA foreign_key_check').all().length)fail('APPEND_RELATION_INVALID','追加候选存在缺失关系');
    hooks.checkpoint?.('append:validated');
   });db.exec('DETACH DATABASE original');await createBackup(db,candidate,join(workspace,'candidate.zip'));
  }finally{db.close();}
  const built=inspectDatabaseBaseline(file,candidate,606);if(built.schemaHash!==base.baseline.schemaHash)fail('APPEND_SCHEMA_CHANGED','追加不能改变既有生产结构或不可变约束');
  for(const m of base.baseline.media)if(!built.media.some(n=>n.name===m.name&&n.size===m.size&&n.sha256===m.sha256))fail('APPEND_EXISTING_FACT_CHANGED','追加改变了目标原有媒体');
  source.verify();base.verify();guardDatabaseAccess(owner.db);const checked=owner.db.prepare('SELECT epoch,revision FROM protocol_meta').get()!;
  if(checked.epoch!==meta.epoch||checked.revision!==meta.revision)fail('APPEND_TARGET_CHANGED','预检期间目标已变化，请重新预览');
  preview=await previewFullBackup(join(workspace,'candidate.zip'),workspaceParent);const captured=preview;let closed=false;
  let inFlight:Promise<NonNullable<ReturnType<typeof readIndependentAppendResult>>>|undefined;
  const restoreConfirmation={operationId,previewId:captured.summary.previewId,archiveSha256:captured.archiveSha256,expectedEpoch:confirmation.expectedEpoch,expectedRevision:confirmation.expectedRevision,replaceAll:true as const,migrateLegacy:false};
  return {plan:duplicates,confirmation,receipt,impact:{decks:imported.length,cards:mapped.tables.learning_cards?.length??0,knowledge:mapped.tables.knowledge?.length??0,reviewEvents:mapped.tables.learning_review_events?.length??0,drafts:(mapped.tables.learning_card_drafts?.length??0)+(mapped.tables.settings?.filter(r=>String(r.key).startsWith('new-card-draft:')).length??0),schedules:mapped.tables.scheduling?.length??0,mediaFiles:mapped.media.length,mediaBytes:mapped.media.reduce((n,m)=>n+m.size,0)},
   close(){if(inFlight)fail('APPEND_BUSY','追加提交进行中，不能取消');if(!closed){closed=true;captured.close();}},
   async confirm(currentOwner:Owner,control:string,value:AppendConfirmationDTO,activationHooks:ActivationHooks={}){
    const confirmed=AppendConfirmation.parse(value);if(digest(confirmed)!==requestHash)fail('APPEND_CONFIRMATION_CHANGED','追加确认与预览不一致');
    const known=readIndependentAppendResult(control,operationId);if(known){if(known.requestHash!==requestHash)fail('APPEND_OPERATION_CONFLICT','追加操作编号已用于其他确认');return known;}
    if(inFlight)return inFlight;
    if(closed)fail('APPEND_PREVIEW_EXPIRED','追加预览已关闭');
    if(inspectDatabaseBaseline(join(currentOwner.dataDir,'ganksoft.sqlite'),currentOwner.dataDir,606).digest!==confirmation.targetDigest)fail('APPEND_TARGET_CHANGED','目标事实或媒体已变化，请重新预览');
    const promise=(async()=>{try{
    try{await currentOwner.restore(captured,restoreConfirmation,{...activationHooks,checkpoint:async phase=>{
     if(phase==='restore:frozen'&&inspectDatabaseBaseline(join(currentOwner.dataDir,'ganksoft.sqlite'),currentOwner.dataDir,606).digest!==confirmation.targetDigest)fail('APPEND_TARGET_CHANGED','冻结前目标已变化，不能覆盖');
     await activationHooks.checkpoint?.(phase);
    }});}catch(e){if(!(e instanceof DomainError&&e.code==='RESTORE_COMMITTED'))throw e;}
    const result=readIndependentAppendResult(control,operationId);if(!result||result.requestHash!==requestHash)fail('APPEND_RECEIPT_UNAVAILABLE','追加可能已提交，请按操作编号恢复，不要重复追加');return result;
    }finally{inFlight=undefined;}})();inFlight=promise;return promise;
   },
  };
 }catch(e){preview?.close();throw e;}finally{base.close();if(workspace)rmSync(workspace,{recursive:true,force:true});}
}
