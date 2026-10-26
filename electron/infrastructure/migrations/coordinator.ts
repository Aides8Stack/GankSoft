import { FullRestoreConfirmation, type FullRestoreConfirmationDTO } from '../../../shared/storage/full-backup.ts';
import type { FullBackupPreview } from '../../modules/storage-unified/backup-preview.ts';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, statfsSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import type { Context } from '../context.ts';
import { APPLICATION_ID, transaction } from '../database.ts';
import { DomainError } from '../../../shared/domain-error.ts';
import { bindWriteOwner, OWNER_MARKER } from '../write-owner.ts';
import { stageBackup, readVerifiedBackup } from '../backup.ts';
import { inspectDatabaseBaseline, prepareMigrationBaseline } from './baseline.ts';
import { stageUnifiedModel } from './unified-model.ts';
import { legacyProjectionDigest, synchronizeLegacyModel } from './legacy-projection.ts';
import { validateUnifiedData } from './unified-integrity.ts';

const Journal=z.strictObject({version:z.literal(1),operationId:z.uuid(),sourceDir:z.string(),sourceDigest:z.string().regex(/^[a-f0-9]{64}$/),
  sourceEpoch:z.string(),epoch:z.uuid(),state:z.enum(['preparing','prepared','committed','aborted']),
  targetDigest:z.string().nullable(),recoveryHash:z.string().nullable(),generation:z.uuid().optional(),targetDir:z.string().optional()});
const Pointer=z.strictObject({version:z.literal(1),operationId:z.uuid(),activeDir:z.string(),epoch:z.string(),state:z.enum(['source','target'])});
type JournalData=z.infer<typeof Journal>;
const Hash=z.string().regex(/^[a-f0-9]{64}$/);
const RestoreRecord=z.strictObject({version:z.literal(1),operationId:z.uuid(),archiveSha256:Hash,confirmationSha256:Hash,
 before:Journal,after:Journal,beforeDigest:Hash,candidateDigest:Hash.nullable(),beforeBackupSha:Hash.nullable(),afterBackupSha:Hash.nullable(),
 state:z.enum(['preparing','prepared','committed','aborted'])});
type RestoreData=z.infer<typeof RestoreRecord>;
function targetDirectory(control:string,j:JournalData) {return j.targetDir??(j.generation?join(control,'restores',j.generation,'candidate'):join(control,'target'));}
function restorePaths(control:string,id:string) {z.uuid().parse(id);const directory=join(control,'restores',id);return {directory,record:join(directory,'operation.json'),beforeBackup:join(directory,'before.zip'),afterBackup:join(directory,'after.zip')};}
function pointer(j:JournalData,control:string) {return {version:1 as const,operationId:j.operationId,activeDir:targetDirectory(control,j),epoch:j.epoch,state:'target' as const};}
function samePointer(a:z.infer<typeof Pointer>,b:z.infer<typeof Pointer>){return a.version===b.version&&a.operationId===b.operationId&&a.activeDir===b.activeDir&&a.epoch===b.epoch&&a.state===b.state;}
function assertOwnedPath(path:string) {if(realpathSync(path)!==resolve(path))fail('MIGRATION_PATH_INVALID','活动目录及控制目录不能重定向到符号链接');}
function flushFile(path:string) {const fd=openSync(path,'r+');try{fsyncSync(fd);}finally{closeSync(fd);}}

const digest=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
function fail(code:string,message:string):never {throw new DomainError(code,message);}
function durable(path:string,value:unknown) {
  const temp=path+'.tmp-'+randomUUID(),fd=openSync(temp,'wx',0o600);
  try {writeFileSync(fd,JSON.stringify(value));fsyncSync(fd);} finally {closeSync(fd);}
  try {renameSync(temp,path);syncDirectory(dirname(path));} finally {rmSync(temp,{force:true});}
}
function syncDirectory(path:string) {
  // Windows does not expose directory fsync through Node; keep this platform limit explicit.
  if(process.platform==='win32') return;
  const fd=openSync(path,'r');try {fsyncSync(fd);} finally {closeSync(fd);}
}
function read<T>(path:string,schema:z.ZodType<T>):T {
  if(lstatSync(path).isSymbolicLink()) fail('MIGRATION_PATH_INVALID','迁移控制文件不能是符号链接');
  return schema.parse(JSON.parse(readFileSync(path,'utf8')));
}
function readJournal(control:string) {
  const j=read(join(control,'journal.json'),Journal);
  if(!isAbsolute(j.sourceDir) || realpathSync(j.sourceDir)!==j.sourceDir || inside(j.sourceDir,control))
    fail('MIGRATION_PATH_INVALID','恢复日志源路径不合法');
  if(j.targetDir && (!isAbsolute(j.targetDir)||resolve(j.targetDir)!==j.targetDir||inside(control,j.targetDir)||inside(j.targetDir,control)||inside(j.sourceDir,j.targetDir)||inside(j.targetDir,j.sourceDir)))
    fail('MIGRATION_PATH_INVALID','迁移目标路径不合法');
  return j;
}
function inside(parent:string,child:string) {const p=relative(parent,child);return p==='' || (!isAbsolute(p)&&p!=='..'&&!p.startsWith('..'+sep));}
function alive(pid:number) {try{process.kill(pid,0);return true;}catch(e){return (e as NodeJS.ErrnoException).code!=='ESRCH';}}
/** Exclusive lease. Stale PID reclamation is only allowed by explicit recovery. */
function lease(control:string,recover=false) {
  const path=join(control,'writer.lock'), recovery=join(control,'recovery.lock');
  let recoveryFd:number|undefined;
  if(recover) recoveryFd=openSync(recovery,'wx',0o600);
  try {
    if(!recover && existsSync(recovery)) fail('MIGRATION_BUSY','另一个恢复进程持有目录');
    if(recover && existsSync(path)) {
      const old=z.strictObject({pid:z.number().int().positive(),token:z.uuid()}).parse(JSON.parse(readFileSync(path,'utf8')));
      if(alive(old.pid)) fail('MIGRATION_BUSY','另一活动进程仍持有写租约');
      rmSync(path);
    }
    const token=randomUUID(),fd=openSync(path,'wx',0o600);
    try{writeFileSync(fd,JSON.stringify({pid:process.pid,token}));fsyncSync(fd);}finally{closeSync(fd);}
    const assert=()=>{
      if(!existsSync(path) || JSON.parse(readFileSync(path,'utf8')).token!==token) fail('MIGRATION_LEASE_LOST','写入租约已失效');
    };
    return {assert,release(){assert();rmSync(path);syncDirectory(control);}};
  } finally {if(recoveryFd!==undefined){closeSync(recoveryFd);rmSync(recovery);}}
}
function marker(dir:string,control:string,id:string,role:'source'|'target') {
  const path=join(dir,OWNER_MARKER),fd=openSync(path,'wx',0o600);
  try{writeFileSync(fd,JSON.stringify({version:1,controlDir:control,operationId:id,role}));fsyncSync(fd);}finally{closeSync(fd);}
  syncDirectory(dir);
}
function assertMarker(dir:string,control:string,id:string,role:'source'|'target') {
  const m=read(join(dir,OWNER_MARKER),z.strictObject({version:z.literal(1),controlDir:z.string(),operationId:z.uuid(),role:z.enum(['source','target'])}));
  if(m.controlDir!==control || m.operationId!==id || m.role!==role) fail('MIGRATION_OWNER_CONFLICT','目录写入所有者与恢复日志不一致');
}
function ownerRow(db:DatabaseSync,j:JournalData) {
  db.exec(`CREATE TABLE IF NOT EXISTS learning_owner(singleton INTEGER PRIMARY KEY CHECK(singleton=1),operation_id TEXT NOT NULL,
    epoch TEXT NOT NULL,legacy_digest TEXT NOT NULL,revision INTEGER NOT NULL)`);
  const protocol=db.prepare('SELECT revision FROM protocol_meta WHERE singleton=1').get()!;
  db.prepare('INSERT INTO learning_owner VALUES(1,?,?,?,?) ON CONFLICT(singleton) DO UPDATE SET operation_id=excluded.operation_id,epoch=excluded.epoch,legacy_digest=excluded.legacy_digest,revision=excluded.revision')
    .run(j.operationId,j.epoch,legacyProjectionDigest(db),protocol.revision!);
}
function assertOwnerRow(db:DatabaseSync,j:JournalData) {
  const owner=db.prepare('SELECT operation_id,epoch FROM learning_owner WHERE singleton=1').get();
  if(owner?.operation_id!==j.operationId || owner?.epoch!==j.epoch || db.prepare('SELECT epoch FROM protocol_meta WHERE singleton=1').get()?.epoch!==j.epoch)
    fail('DATA_EPOCH_CHANGED','活动库epoch/所有者与日志不一致');
}
async function recoverLocked(control:string,j:JournalData) {
  const p=read(join(control,'active.json'),Pointer),target=targetDirectory(control,j);
  if(p.operationId!==j.operationId || (p.state==='source' ? p.activeDir!==j.sourceDir || p.epoch!==j.sourceEpoch : p.activeDir!==target || p.epoch!==j.epoch))
    fail('MIGRATION_OWNER_CONFLICT','活动指针与恢复日志不一致，禁止回退旧路径');
  if(p.state==='target') {
    if(!['prepared','committed'].includes(j.state) || !j.recoveryHash) fail('MIGRATION_RECOVERY_BLOCKED','缺少已验证的606恢复点');
    assertMarker(target,control,j.operationId,'target');
    assertMarker(j.sourceDir,control,j.operationId,'source');
    const current=inspectDatabaseBaseline(join(target,'ganksoft.sqlite'),target,606);
    if(j.state==='prepared') {
      if(current.digest!==j.targetDigest || digest(join(control,'unified-backup.zip'))!==j.recoveryHash)
        fail('MIGRATION_RECOVERY_BLOCKED','目标与提交前验证证据不一致');
      const backup=await readVerifiedBackup(join(control,'unified-backup.zip'));
      if(backup.manifest.schemaVersion!==606) fail('MIGRATION_RECOVERY_BLOCKED','目标恢复点版本不一致');
    }
    const check=new DatabaseSync(join(target,'ganksoft.sqlite'),{readOnly:true});try{assertOwnerRow(check,j);}finally{check.close();}
    j.state='committed';durable(join(control,'journal.json'),j);
    return {state:'committed' as const,activeDir:target,epoch:j.epoch};
  }
  if(j.state==='committed') fail('MIGRATION_RECOVERY_BLOCKED','已提交日志不允许自动回退源库');
  if(inspectDatabaseBaseline(join(j.sourceDir,'ganksoft.sqlite'),j.sourceDir).digest!==j.sourceDigest)
    fail('MIGRATION_RECOVERY_BLOCKED','源库在冻结后变化，禁止静默覆盖');
  j.state='aborted';durable(join(control,'journal.json'),j);
  if(existsSync(join(j.sourceDir,OWNER_MARKER))){assertMarker(j.sourceDir,control,j.operationId,'source');rmSync(join(j.sourceDir,OWNER_MARKER));syncDirectory(j.sourceDir);}
  return {state:'aborted' as const,activeDir:j.sourceDir,epoch:j.sourceEpoch};
}
export async function recoverUnifiedMigration(controlDirectory:string) {
  const control=realpathSync(controlDirectory),lock=lease(control,true);
  try{await recoverPendingRestore(control);return await recoverLocked(control,readJournal(control));}finally{lock.release();}
}
export interface ActivationHooks { checkpoint?: (phase:string)=>void | Promise<void> }
/** Explicit isolated-directory operation; never invoked by startup or a public UI. Caller drains async operations first. */
export async function prepareAndActivateUnified(ctx:Context,controlDirectory:string,hooks:ActivationHooks={}) {
  if(ctx.db.isTransaction) fail('MIGRATION_SOURCE_BUSY','源库有未结束事务');
  const source=realpathSync(ctx.dataDir),control=resolve(controlDirectory),path=ctx.db.location();
  if(!path || realpathSync(path)!==join(source,'ganksoft.sqlite') || inside(source,control) || existsSync(control) ||
     existsSync(join(source,OWNER_MARKER)) || realpathSync(dirname(control))!==dirname(control))
    fail('MIGRATION_DESTINATION_INVALID','协调目录必须是源库之外的新目录，不得覆盖或接管已有所有者');
  if(ctx.db.prepare("SELECT 1 FROM platform_operations WHERE state='pending' LIMIT 1").get())
    fail('MIGRATION_OPERATION_PENDING','必须先由既有入口核对未决操作');
  const before=inspectDatabaseBaseline(path,source),sourceEpoch=z.uuid().parse(ctx.db.prepare('SELECT epoch FROM protocol_meta WHERE singleton=1').get()?.epoch);
  mkdirSync(control);const lock=lease(control),checkpoint=hooks.checkpoint??(()=>{});
  const j:JournalData={version:1,operationId:randomUUID(),sourceDir:source,sourceDigest:before.digest,sourceEpoch,epoch:randomUUID(),state:'preparing',targetDigest:null,recoveryHash:null};
  let frozen=false;
  let sourceLock:DatabaseSync|undefined;
  try {
    durable(join(control,'journal.json'),j);
    durable(join(control,'active.json'),{version:1,operationId:j.operationId,activeDir:source,epoch:sourceEpoch,state:'source'});
    marker(source,control,j.operationId,'source');frozen=true;
    // A separate reserved SQLite transaction blocks even uncoordinated SQL writers
    // while backup() reads the committed WAL snapshot through the original connection.
    sourceLock=new DatabaseSync(path);sourceLock.exec('PRAGMA busy_timeout=0; BEGIN IMMEDIATE');
    ctx.db.exec('PRAGMA query_only=ON');
    await checkpoint('frozen');
    await prepareMigrationBaseline(ctx.db,source,join(control,'legacy-backup.zip'));await checkpoint('source-backed-up');
    const target=join(control,'target');
    await stageBackup(join(control,'legacy-backup.zip'),target,()=>marker(target,control,j.operationId,'target'));
    const db=new DatabaseSync(join(target,'ganksoft.sqlite'));db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000');
    bindWriteOwner(db,{active:false,guard:lock.assert,beforeCommit:()=>{}});
    try {
      stageUnifiedModel({db,dataDir:target,now:ctx.now},path,{checkpoint:phase=>{const v=checkpoint('model:'+phase);if(v instanceof Promise)throw Error('事务故障点必须同步');}});
      await checkpoint('model-ready');
      transaction(db,()=>{
        db.prepare('UPDATE protocol_meta SET epoch=?,revision=0 WHERE singleton=1').run(j.epoch);
        ownerRow(db,j);validateUnifiedData(db);
      });
      await prepareMigrationBaseline(db,target,join(control,'unified-backup.zip'));
      db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    } finally {db.close();}
    j.targetDigest=inspectDatabaseBaseline(join(target,'ganksoft.sqlite'),target,606).digest;
    j.recoveryHash=digest(join(control,'unified-backup.zip'));j.state='prepared';durable(join(control,'journal.json'),j);
    await checkpoint('prepared');
    if(inspectDatabaseBaseline(path,source).digest!==before.digest) fail('MIGRATION_SOURCE_CHANGED','源库/图片在冻结后变化');
    lock.assert();
    durable(join(control,'active.json'),{version:1,operationId:j.operationId,activeDir:target,epoch:j.epoch,state:'target'});
    await checkpoint('pointer');
    const result=await recoverLocked(control,j);await checkpoint('committed');return result;
  } catch(e) {
    if(frozen) {
      const state=await recoverLocked(control,readJournal(control));
      if(state.state==='committed') throw new DomainError('MIGRATION_COMMITTED','迁移已提交，按日志重开活动库；不得重试旧库');
      ctx.db.exec('PRAGMA query_only=OFF');
    }
    throw e;
  } finally {
    try{if(sourceLock){if(sourceLock.isTransaction)sourceLock.exec('ROLLBACK');sourceLock.close();}}
    finally{lock.release();}
  }
}
/** Only a validated committed pointer plus exclusive lease can open a writable 606 application. */
export function openUnifiedOwner(controlDirectory:string, beforeProjection:()=>void=()=>{}, projectionCheckpoint:(phase:string)=>void=()=>{}) {
  const control=realpathSync(controlDirectory),lock=lease(control);
  let db:DatabaseSync|undefined;
  try {
    const pending=readPendingRestore(control);if(pending && !['committed','aborted'].includes(pending.state))fail('RESTORE_RECOVERY_REQUIRED','恢复尚未核对，请先按唯一活动指针恢复');
    const j=readJournal(control),p=read(join(control,'active.json'),Pointer),target=targetDirectory(control,j);
    if(j.state!=='committed' || p.state!=='target' || p.activeDir!==target || p.operationId!==j.operationId || p.epoch!==j.epoch)
      fail('MIGRATION_NOT_ACTIVATED','必须先恢复并核实唯一已提交活动路径');
    assertOwnedPath(target);assertMarker(target,control,j.operationId,'target');
    assertMarker(j.sourceDir,control,j.operationId,'source');
    inspectDatabaseBaseline(join(target,'ganksoft.sqlite'),target,606);
    db=new DatabaseSync(join(target,'ganksoft.sqlite'));db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000');
    if(Number(db.prepare('PRAGMA application_id').get()?.application_id)!==APPLICATION_ID) fail('MIGRATION_SCHEMA_UNSUPPORTED','应用标识错误');
    assertOwnerRow(db,j);const owned=db;let transition:'idle'|'restoring'|'retired'|'blocked'='idle',closed=false;
    const guard=()=>{
      if(closed||transition!=='idle')fail('RESTORE_OWNER_UNAVAILABLE','恢复中或已退役的连接不能继续访问');
      lock.assert();assertMarker(target,control,j.operationId,'target');
      assertMarker(j.sourceDir,control,j.operationId,'source');
      const pointer=read(join(control,'active.json'),Pointer);
      if(pointer.activeDir!==target || pointer.epoch!==j.epoch || pointer.operationId!==j.operationId || pointer.state!=='target')
        fail('DATA_EPOCH_CHANGED','活动路径/epoch已变化，旧窗口不能写入');
      assertOwnerRow(owned,j);
    };
    bindWriteOwner(db,{active:true,guard,beforeCommit:()=>{
      beforeProjection();
      const current=legacyProjectionDigest(owned),old=owned.prepare('SELECT legacy_digest FROM learning_owner').get();
      if(old?.legacy_digest!==current) synchronizeLegacyModel(owned,projectionCheckpoint);
      ownerRow(owned,j);validateUnifiedData(owned);
    }});
    return {db,dataDir:target,epoch:j.epoch,
      async restore(preview:FullBackupPreview,confirmation:FullRestoreConfirmationDTO,hooks:ActivationHooks={},externalTarget?:string) {
        const confirmed=FullRestoreConfirmation.parse(confirmation);
        const old=readRestoreStatus(control,confirmed.operationId);
        if(old){if((externalTarget&&old.activeDir!==externalTarget)||old.archiveSha256!==confirmed.archiveSha256 || old.confirmationSha256!==createHash('sha256').update(JSON.stringify(confirmed)).digest('hex'))fail('RESTORE_OPERATION_CONFLICT','操作ID已用于其他备份');return old;}
        guard();transition='restoring';
        try {const result=await restoreUnderOwner({db:owned,dataDir:target,now:()=>new Date()},control,j,preview,confirmed,lock.assert,hooks,externalTarget);transition='retired';return result;}
        catch(error){const status=readRestoreStatus(control,confirmed.operationId);transition=!status || status.state==='aborted'?'idle':status?.state==='committed'?'retired':'blocked';throw error;}
      },
      close(){if(closed)return;if(transition==='restoring')fail('RESTORE_BUSY','正在恢复，不能提前释放写租约');closed=true;try{owned.close();}finally{lock.release();}},
    };
  } catch(e){db?.close();lock.release();throw e;}
}

function readRestore(control:string,id:string):RestoreData {
  const paths=restorePaths(control,id);assertOwnedPath(paths.directory);
  const r=read(paths.record,RestoreRecord),a=r.before,b=r.after;
  if(r.operationId!==id || a.state!=='committed' || b.state!=='committed' || b.generation!==id || a.epoch===b.epoch ||
     a.operationId!==b.operationId || a.sourceDir!==b.sourceDir || a.sourceDigest!==b.sourceDigest || a.sourceEpoch!==b.sourceEpoch)
    fail('RESTORE_JOURNAL_INVALID','恢复日志与原所有者不一致');
  return r;
}
function readPendingRestore(control:string) {
  const path=join(control,'restore-pending.json');if(!existsSync(path))return null;
  return readRestore(control,read(path,z.strictObject({version:z.literal(1),operationId:z.uuid()})).operationId);
}
/** Owner-side durable receipt, outside the database which is being replaced. */
export function readRestoreStatus(controlDirectory:string,operationId:string) {
  const control=realpathSync(controlDirectory),paths=restorePaths(control,operationId);
  if(!existsSync(paths.record))return null;
  const r=readRestore(control,operationId);
  const pendingPath=join(control,'restore-pending.json');
  const registered=existsSync(pendingPath)?read(pendingPath,z.strictObject({version:z.literal(1),operationId:z.uuid()})).operationId:null;
  // An operation recorded before publishing its pending descriptor has not
  // frozen/staged anything. A crash here leaves a durable aborted receipt.
  const state=r.state==='preparing' && registered!==operationId && samePointer(read(join(control,'active.json'),Pointer),pointer(r.before,control))?'aborted':r.state;
  return {operationId:r.operationId,archiveSha256:r.archiveSha256,confirmationSha256:r.confirmationSha256,sourceEpoch:r.before.epoch,state,
    activeDir:targetDirectory(control,r.state==='committed'?r.after:r.before),
    epoch:r.state==='committed'?r.after.epoch:r.before.epoch,
    recoveryPoint:r.beforeBackupSha?paths.beforeBackup:null};
}
/** Only external-path operations have a durable relocation destination. */
export function readRelocationStatus(controlDirectory:string,operationId:string) {
  const control=realpathSync(controlDirectory),paths=restorePaths(control,operationId);
  if(!existsSync(paths.record))return null;
  const target=readRestore(control,operationId).after.targetDir;
  if(!target)return null;
  return {...readRestoreStatus(control,operationId)!,destination:target,sourceDigest:readRestore(control,operationId).beforeDigest};
}
function saveRestore(control:string,r:RestoreData) {durable(restorePaths(control,r.operationId).record,r);}
async function recoverPendingRestore(control:string) {
  const r=readPendingRestore(control);if(!r)return;
  const p=read(join(control,'active.json'),Pointer),before=pointer(r.before,control),after=pointer(r.after,control),paths=restorePaths(control,r.operationId);
  // The sole commit point is active.json. Never infer success from a new folder,
  // nor infer rollback from a lost response or the old migration journal.
  if(samePointer(p,before)) {
    if(r.state==='committed')fail('RESTORE_RECOVERY_BLOCKED','已提交恢复指针不允许回退');
    const dir=before.activeDir;assertOwnedPath(dir);assertMarker(dir,control,r.before.operationId,'target');
    if(r.state!=='aborted' && inspectDatabaseBaseline(join(dir,'ganksoft.sqlite'),dir,606).digest!==r.beforeDigest)
      fail('RESTORE_RECOVERY_BLOCKED','恢复前库发生变化，禁止继续或覆盖');
    const current=readJournal(control);
    if(JSON.stringify(current)!==JSON.stringify(r.before))fail('RESTORE_RECOVERY_BLOCKED','提交前所有权日志发生变化');
    r.state='aborted';saveRestore(control,r);return;
  }
  if(!samePointer(p,after) || !['prepared','committed'].includes(r.state))
    fail('RESTORE_RECOVERY_BLOCKED','未知活动指针，禁止回退旧库');
  const target=after.activeDir;assertOwnedPath(target);assertMarker(target,control,r.after.operationId,'target');
  assertMarker(r.before.sourceDir,control,r.before.operationId,'source');
  const current=inspectDatabaseBaseline(join(target,'ganksoft.sqlite'),target,606);
  if(r.state==='prepared') {
    if(!r.beforeBackupSha || !r.afterBackupSha || current.digest!==r.candidateDigest ||
       digest(paths.beforeBackup)!==r.beforeBackupSha || digest(paths.afterBackup)!==r.afterBackupSha)
      fail('RESTORE_RECOVERY_BLOCKED','候选或恢复点与切换前证据不一致');
    for(const path of [paths.beforeBackup,paths.afterBackup])if((await readVerifiedBackup(path)).manifest.schemaVersion!==606)
      fail('RESTORE_RECOVERY_BLOCKED','恢复点版本错误');
  }
  const db=new DatabaseSync(join(target,'ganksoft.sqlite'),{readOnly:true});try{assertOwnerRow(db,r.after);}finally{db.close();}
  const j=readJournal(control);
  if(JSON.stringify(j)!==JSON.stringify(r.before) && JSON.stringify(j)!==JSON.stringify(r.after))
    fail('RESTORE_RECOVERY_BLOCKED','所有权日志不是切换前或切换后的状态');
  durable(join(control,'journal.json'),r.after);r.state='committed';saveRestore(control,r);
}
async function restoreUnderOwner(ctx:Context,control:string,j:JournalData,preview:FullBackupPreview,
 confirmation:FullRestoreConfirmationDTO,assertLease:()=>void,hooks:ActivationHooks,externalTarget?:string) {
  const checkpoint=hooks.checkpoint??(()=>{}),meta=ctx.db.prepare('SELECT epoch,revision FROM protocol_meta WHERE singleton=1').get()!;
  if(confirmation.expectedEpoch!==j.epoch || meta.epoch!==j.epoch || confirmation.expectedRevision!==Number(meta.revision))
    fail('DATA_EPOCH_CHANGED','确认后的活动库已变化，请重新预览');
  if(confirmation.previewId!==preview.summary.previewId || confirmation.archiveSha256!==preview.archiveSha256 ||
     confirmation.migrateLegacy!==preview.summary.requiresUnifiedMigration)
    fail('RESTORE_CONFIRMATION_CHANGED','备份或版本迁移确认与预览不一致');
  if(ctx.db.isTransaction || ctx.db.prepare("SELECT 1 FROM platform_operations WHERE state='pending' LIMIT 1").get())
    fail('RESTORE_OPERATION_PENDING','请先结束事务并核对未决平台操作');
  const previous=readPendingRestore(control);if(previous&&!['committed','aborted'].includes(previous.state))fail('RESTORE_RECOVERY_REQUIRED','存在未核对的恢复');
  await preview.verify();assertLease();
  // Awaited preflight must not let another application commit invalidate consent.
  const checked=ctx.db.prepare('SELECT epoch,revision FROM protocol_meta WHERE singleton=1').get()!;
  if(checked.epoch!==meta.epoch || checked.revision!==meta.revision)fail('DATA_EPOCH_CHANGED','预检期间活动库已变化');
  if(externalTarget){
    if(!isAbsolute(externalTarget)||resolve(externalTarget)!==externalTarget||existsSync(externalTarget)||inside(control,externalTarget)||inside(externalTarget,control)||inside(ctx.dataDir,externalTarget)||inside(externalTarget,ctx.dataDir)||realpathSync(dirname(externalTarget))!==dirname(externalTarget))
      fail('RELOCATE_TARGET_CHANGED','目标路径已变化或与活动目录重叠');
  }
  const before=inspectDatabaseBaseline(join(ctx.dataDir,'ganksoft.sqlite'),ctx.dataDir,606);
  const storage=statfsSync(control,{bigint:true}),size=(path:string)=>existsSync(path)?BigInt(lstatSync(path).size):0n;
  const currentBytes=size(join(ctx.dataDir,'ganksoft.sqlite'))+size(join(ctx.dataDir,'ganksoft.sqlite-wal'))+BigInt(before.media.reduce((n,m)=>n+m.size,0));
  const candidateBytes=size(join(preview.candidateDirectory,'ganksoft.sqlite'))+BigInt(preview.baseline.media.reduce((n,m)=>n+m.size,0));
  // Conservative room for before/after ZIPs, conversion tables, SQLite WAL and
  // candidate files. Actual ENOSPC is still handled by pointer-based recovery.
  if(storage.bavail*storage.bsize<currentBytes+4n*candidateBytes+16n*1024n*1024n || externalTarget && (()=>{const disk=statfsSync(dirname(externalTarget),{bigint:true});return disk.bavail*disk.bsize<3n*candidateBytes+16n*1024n*1024n;})())
    fail('RESTORE_SPACE_REQUIRED','可用空间不足以保留完整恢复点和候选库');
  const root=join(control,'restores');if(!existsSync(root)){mkdirSync(root);syncDirectory(control);}assertOwnedPath(root);
  const paths=restorePaths(control,confirmation.operationId);mkdirSync(paths.directory);syncDirectory(root);
  const after:JournalData={...j,generation:confirmation.operationId,epoch:randomUUID(),targetDigest:null,recoveryHash:null,targetDir:externalTarget};
  const r:RestoreData={version:1,operationId:confirmation.operationId,archiveSha256:preview.archiveSha256,confirmationSha256:createHash('sha256').update(JSON.stringify(confirmation)).digest('hex'),before:{...j},after,
    beforeDigest:before.digest,candidateDigest:null,beforeBackupSha:null,afterBackupSha:null,state:'preparing'};
  let reserved:DatabaseSync|undefined;
  try {
    saveRestore(control,r);await checkpoint('restore:registered');durable(join(control,'restore-pending.json'),{version:1,operationId:r.operationId});
    reserved=new DatabaseSync(join(ctx.dataDir,'ganksoft.sqlite'));reserved.exec('PRAGMA busy_timeout=0;BEGIN IMMEDIATE');ctx.db.exec('PRAGMA query_only=ON');
    await checkpoint('restore:frozen');
    const recovery=await prepareMigrationBaseline(ctx.db,ctx.dataDir,paths.beforeBackup);flushFile(paths.beforeBackup);syncDirectory(paths.directory);
    if(recovery.baseline.digest!==before.digest)fail('RESTORE_SOURCE_CHANGED','恢复点不是确认时的活动库');
    r.beforeBackupSha=recovery.backupSha256;saveRestore(control,r);await checkpoint('restore:recovery-point');
    const candidate=targetDirectory(control,after);
    const staged=await preview.stageTo(candidate,()=>marker(candidate,control,j.operationId,'target'));
    if(staged.digest!==preview.baseline.digest)fail('RESTORE_CANDIDATE_CHANGED','候选与确认备份不同');
    await checkpoint('restore:candidate-staged');
    const db=new DatabaseSync(join(candidate,'ganksoft.sqlite'));db.exec('PRAGMA foreign_keys=ON;PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000');
    bindWriteOwner(db,{active:false,guard:assertLease,beforeCommit:()=>{}});
    try {
      if(staged.schemaVersion===604)stageUnifiedModel({db,dataDir:candidate,now:ctx.now},join(preview.candidateDirectory,'ganksoft.sqlite'));
      transaction(db,()=>{db.prepare('UPDATE protocol_meta SET epoch=?,revision=0 WHERE singleton=1').run(after.epoch);ownerRow(db,after);validateUnifiedData(db);});
      const built=await prepareMigrationBaseline(db,candidate,paths.afterBackup);r.afterBackupSha=built.backupSha256;flushFile(paths.afterBackup);
      db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    } finally {db.close();}
    const complete=inspectDatabaseBaseline(join(candidate,'ganksoft.sqlite'),candidate,606);
    flushFile(join(candidate,'ganksoft.sqlite'));for(const m of complete.media)flushFile(join(candidate,'attachments',m.name));
    syncDirectory(join(candidate,'attachments'));syncDirectory(candidate);syncDirectory(paths.directory);
    r.candidateDigest=complete.digest;after.targetDigest=complete.digest;after.recoveryHash=r.afterBackupSha;r.state='prepared';saveRestore(control,r);
    await checkpoint('restore:prepared');
    await preview.verify();
    if(inspectDatabaseBaseline(join(candidate,'ganksoft.sqlite'),candidate,606).digest!==r.candidateDigest ||
       inspectDatabaseBaseline(join(ctx.dataDir,'ganksoft.sqlite'),ctx.dataDir,606).digest!==before.digest)
      fail('RESTORE_CANDIDATE_CHANGED','候选或原库在切换前发生变化');
    assertLease();if(!samePointer(read(join(control,'active.json'),Pointer),pointer(j,control)))fail('DATA_EPOCH_CHANGED','活动指针已变化');
    durable(join(control,'active.json'),pointer(after,control));await checkpoint('restore:pointer');
    await recoverPendingRestore(control);await checkpoint('restore:committed');
    return readRestoreStatus(control,r.operationId)!;
  } catch(error) {
    if(existsSync(join(control,'restore-pending.json')) && readPendingRestore(control)?.operationId===r.operationId) {
      await recoverPendingRestore(control);const status=readRestoreStatus(control,r.operationId);
      if(status?.state==='committed')throw new DomainError('RESTORE_COMMITTED','恢复已提交；读取操作回执并重开唯一活动库，禁止重复覆盖');
      if(status?.state==='aborted')ctx.db.exec('PRAGMA query_only=OFF');
    }
    throw error;
  } finally {if(reserved){try{if(reserved.isTransaction)reserved.exec('ROLLBACK');}finally{reserved.close();}}}
}
