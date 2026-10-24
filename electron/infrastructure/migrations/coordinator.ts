import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
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
  targetDigest:z.string().nullable(),recoveryHash:z.string().nullable()});
const Pointer=z.strictObject({version:z.literal(1),operationId:z.uuid(),activeDir:z.string(),epoch:z.string(),state:z.enum(['source','target'])});
type JournalData=z.infer<typeof Journal>;
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
  const p=read(join(control,'active.json'),Pointer),target=join(control,'target');
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
  try{return await recoverLocked(control,readJournal(control));}finally{lock.release();}
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
    const j=readJournal(control),p=read(join(control,'active.json'),Pointer),target=join(control,'target');
    if(j.state!=='committed' || p.state!=='target' || p.activeDir!==target || p.operationId!==j.operationId || p.epoch!==j.epoch)
      fail('MIGRATION_NOT_ACTIVATED','必须先恢复并核实唯一已提交活动路径');
    assertMarker(target,control,j.operationId,'target');
    assertMarker(j.sourceDir,control,j.operationId,'source');
    inspectDatabaseBaseline(join(target,'ganksoft.sqlite'),target,606);
    db=new DatabaseSync(join(target,'ganksoft.sqlite'));db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000');
    if(Number(db.prepare('PRAGMA application_id').get()?.application_id)!==APPLICATION_ID) fail('MIGRATION_SCHEMA_UNSUPPORTED','应用标识错误');
    assertOwnerRow(db,j);const owned=db;
    const guard=()=>{
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
    return {db,dataDir:target,epoch:j.epoch,close(){try{owned.close();}finally{lock.release();}}};
  } catch(e){db?.close();lock.release();throw e;}
}
