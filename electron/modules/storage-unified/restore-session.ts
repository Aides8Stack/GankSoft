import {appendMethods,createAppendController} from './append-session.ts';
import {relocationMethods,createRelocationController} from './relocation-session.ts';
import {RelocationConfirmation} from '../../../shared/protocol/relocation.ts';
import {AppendConfirmation} from '../../../shared/protocol/external-append.ts';
import {randomUUID,createHash} from 'node:crypto';
import {FullRestoreConfirmation,type FullRestorePlanDTO,type FullRestoreResultDTO} from '../../../shared/protocol/full-backup.ts';
import {RequestSchema,registry,type Response} from '../../../shared/protocol/registry.ts';
import {assertWireValue,ProtocolError} from '../../../shared/protocol/data.ts';
import {DomainError} from '../../../shared/domain-error.ts';
import {Application} from '../../application.ts';
import {createApplicationProtocol,type PlatformHandlers} from '../../protocol/gateway.ts';
import type {ClipboardTextPort} from '../cards-unified/clipboard.ts';
import {openUnifiedOwner,readRestoreStatus,recoverUnifiedMigration} from '../../infrastructure/migrations/coordinator.ts';
import {guardDatabaseAccess} from '../../infrastructure/write-owner.ts';
import type {Context} from '../../infrastructure/context.ts';
import {previewFullBackup,type FullBackupPreview} from './backup-preview.ts';
const methods=['storage.restore.open','storage.restore.cancel','storage.restore.confirm','storage.restore.status'] as const;
export interface RestoreSessionPorts {
 selectBackup():Promise<string|null>;
 selectDatabase?:()=>Promise<string|null>;
 selectDataParent?:()=>Promise<string|null>;
 workspaceParent:string;
 platform?:(context:()=>Context)=>PlatformHandlers;
 clipboard?:ClipboardTextPort;
 /** Explicit owned-control recovery, never a production604 activation flag. */
 recover?:boolean;
}
/** Opt-in host for an already activated synthetic/owned606 control. Production
 * openDatabase/schema604 is unchanged. Storage receipts never use the replaced DB. */
export async function createFullRestoreSession(control:string,ports:RestoreSessionPorts) {
 if(ports.recover)await recoverUnifiedMigration(control);
 let owner=openUnifiedOwner(control),ctx:Context={db:owner.db,dataDir:owner.dataDir,now:()=>new Date()};
 let epoch=owner.epoch,available=true,busy=false,closed=false,preview:FullBackupPreview|undefined;
 let inFlight:{operationId:string;hash:string;promise:Promise<FullRestoreResultDTO>}|undefined;
 const activeMethods=[...methods,...(ports.selectDatabase?appendMethods:[]),...(ports.selectDataParent?relocationMethods:[])];
 const advertised:PlatformHandlers=Object.fromEntries(activeMethods.map(m=>[m,async()=>{throw Error('RESTORE_COORDINATOR_REQUIRED');}]));
 const makeHost=()=>createApplicationProtocol(new Application(ctx),()=>{if(busy)throw new DomainError('MAINTENANCE_BUSY','数据恢复进行中');},
  {...ports.platform?.(()=>ctx),...advertised},undefined,ports.clipboard);
 let host=makeHost();
 function disposePreview(){preview?.close();preview=undefined;}
 function present(r:NonNullable<ReturnType<typeof readRestoreStatus>>):FullRestoreResultDTO {
  return {operationId:r.operationId,state:r.state,epoch:r.epoch,recoveryPointAvailable:r.recoveryPoint!==null,reopened:available&&owner.epoch===r.epoch};
 }
 function reopen(){available=false;owner.close();owner=openUnifiedOwner(control);ctx={db:owner.db,dataDir:owner.dataDir,now:()=>new Date()};epoch=owner.epoch;host=makeHost();available=true;}
 const append=createAppendController(control,{owner:()=>owner,selectDatabase:()=>ports.selectDatabase!(),workspaceParent:ports.workspaceParent,
  available:()=>available,busy:()=>busy,lock:value=>{busy=value;},reopen:()=>{disposePreview();reopen();}});
 const relocation=createRelocationController(control,{owner:()=>owner,selectParent:()=>ports.selectDataParent!(),workspaceParent:ports.workspaceParent,
  available:()=>available,busy:()=>busy,lock:value=>{busy=value;},reopen:()=>{disposePreview();append.dispose();reopen();}});
 async function confirm(value:unknown) {
  const c=FullRestoreConfirmation.parse(value),hash=createHash('sha256').update(JSON.stringify(c)).digest('hex');
  if(inFlight){if(inFlight.operationId!==c.operationId || inFlight.hash!==hash)throw new DomainError('RESTORE_BUSY','另一个恢复正在执行');return inFlight.promise;}
  const known=readRestoreStatus(control,c.operationId);
  if(known){if(known.confirmationSha256!==hash)throw new DomainError('RESTORE_OPERATION_CONFLICT','操作ID确认内容已变化');return present(known);}
  if(busy)throw new DomainError('RESTORE_BUSY','请先关闭当前数据操作');
  if(!available||!preview||preview.summary.previewId!==c.previewId)throw new DomainError('RESTORE_PREVIEW_EXPIRED','请重新选择并预检备份');
  const captured=preview;busy=true;
  const promise=(async()=>{
   try {
    let result:NonNullable<ReturnType<typeof readRestoreStatus>>;
    try{result=await owner.restore(captured,c);}catch(e){
     const status=readRestoreStatus(control,c.operationId);
     if(!(e instanceof DomainError && e.code==='RESTORE_COMMITTED')||status?.state!=='committed')throw e;
     result=status;
    }
    epoch=result.epoch;
    // A committed switch cannot be undone because a connection reopen fails.
    try{reopen();}catch{available=false;}
    disposePreview();return present(result);
   }finally{busy=false;inFlight=undefined;}
  })();
  inFlight={operationId:c.operationId,hash,promise};return promise;
 }
 async function execute(raw:unknown):Promise<Response> {
  if(closed)throw new DomainError('RESTORE_SESSION_CLOSED','数据会话已关闭');
  try{assertWireValue(raw);}catch{return host.execute(raw);}
  const req=RequestSchema.safeParse(raw);
  if(!req.success)return host.execute(raw);
  const q=req.data;if(!activeMethods.includes(q.method as typeof activeMethods[number])){
   if(!available)return {ok:false,requestId:q.requestId,dataEpoch:epoch,error:{code:'RESTORE_RECOVERY_REQUIRED',message:'恢复已提交，但连接尚未重开，请重启后核对',outcome:'rejected',retryable:false,fieldErrors:[]}};
   return host.execute(raw);
  }
  try{
   if(q.protocol.major!==2||q.protocol.minor!==0)throw new ProtocolError('CONTRACT_UNSUPPORTED','不支持的协议版本');
   const definition=registry[q.method as typeof activeMethods[number]];
   const input=definition.input.parse(q.payload);
   if(q.method.startsWith('storage.append.')){
    if(q.method==='storage.append.confirm'){
     const c=AppendConfirmation.parse(input);
     if(q.requestId!==c.operationId||q.dataEpoch!==c.expectedEpoch)throw new DomainError('APPEND_CONFIRMATION_CHANGED','请求编号或代次与确认不一致');
    }else if(q.dataEpoch!==epoch)throw new DomainError('DATA_EPOCH_CHANGED','数据代次已变化，请刷新');
    const data=definition.output.parse(await append.execute(q.method,input));
    epoch=available?owner.epoch:q.method==='storage.append.confirm'?readRestoreStatus(control,(input as {operationId:string}).operationId)?.epoch??epoch:epoch;
    return {ok:true,requestId:q.requestId,dataEpoch:epoch,dataRevision:available?Number(ctx.db.prepare('SELECT revision FROM protocol_meta').get()!.revision):0,data:data as never};
   }
   if(q.method.startsWith('storage.relocate.')){
    if(q.method==='storage.relocate.confirm'){
     const c=RelocationConfirmation.parse(input);
     if(q.requestId!==c.operationId||q.dataEpoch!==c.expectedEpoch)throw new DomainError('RELOCATE_CONFIRMATION_CHANGED','请求编号或代次与迁移确认不一致');
    }else if(q.dataEpoch!==epoch)throw new DomainError('DATA_EPOCH_CHANGED','数据代次已变化，请刷新');
    const data=definition.output.parse(await relocation.execute(q.method,input));
    epoch=available?owner.epoch:q.method==='storage.relocate.confirm'?(data as {epoch:string}).epoch:epoch;
    return {ok:true,requestId:q.requestId,dataEpoch:epoch,dataRevision:available?Number(ctx.db.prepare('SELECT revision FROM protocol_meta').get()!.revision):0,data:data as never};
   }
   // Confirm is tied to its original owner epoch and durable operation ID, so
   // an exact retry remains safe after the successful epoch change or restart.
   if(q.method==='storage.restore.confirm'){
    const c=FullRestoreConfirmation.parse(input);
    if(q.requestId!==c.operationId||q.dataEpoch!==c.expectedEpoch)throw new DomainError('RESTORE_CONFIRMATION_CHANGED','请求编号或代次与确认不一致');
    const data=await confirm(c);
    return {ok:true,requestId:q.requestId,dataEpoch:epoch,dataRevision:0,data};
   }
   if(q.dataEpoch!==epoch)throw new DomainError('DATA_EPOCH_CHANGED','数据代次已变化，请刷新');
   if(busy)throw new DomainError('RESTORE_BUSY','数据操作进行中');
   let data:unknown;
   if(q.method==='storage.restore.status')data=(()=>{const r=readRestoreStatus(control,(input as {operationId:string}).operationId);return r?present(r):null;})();
   else {
    if(!available)throw new DomainError('RESTORE_RECOVERY_REQUIRED','请先重启并核对恢复状态');guardDatabaseAccess(ctx.db);
    if(q.method==='storage.restore.cancel'){if(preview?.summary.previewId===(input as {previewId:string}).previewId)disposePreview();data=true;}
    else {
     busy=true;try{
      disposePreview();append.dispose();relocation.dispose();const file=await ports.selectBackup();
      if(!file)data=null;
      else {preview=await previewFullBackup(file,ports.workspaceParent);guardDatabaseAccess(ctx.db);
       const m=ctx.db.prepare('SELECT epoch,revision FROM protocol_meta WHERE singleton=1').get()!;
       const plan:FullRestorePlanDTO={summary:preview.summary,confirmation:{operationId:randomUUID(),previewId:preview.summary.previewId,archiveSha256:preview.archiveSha256,expectedEpoch:String(m.epoch),expectedRevision:Number(m.revision),replaceAll:true,migrateLegacy:preview.summary.requiresUnifiedMigration}};data=plan;
      }
     }catch(e){disposePreview();throw e;}finally{busy=false;}
    }
   }
   const output=definition.output.parse(data);
   return {ok:true,requestId:q.requestId,dataEpoch:epoch,dataRevision:available?Number(ctx.db.prepare('SELECT revision FROM protocol_meta').get()!.revision):0,data:output as never};
  }catch(e){
   const c=q.method==='storage.restore.confirm'?FullRestoreConfirmation.safeParse(q.payload):null;
   const known=c?.success?readRestoreStatus(control,c.data.operationId):null;
   if(known?.state==='committed'&&!available)epoch=known.epoch;
   const appendCommitted=q.method==='storage.append.confirm'&&AppendConfirmation.safeParse(q.payload).success&&(!(e instanceof DomainError)||e.code==='APPEND_RECEIPT_UNAVAILABLE')&&readRestoreStatus(control,(q.payload as {operationId:string}).operationId)?.state==='committed';
   const domain=e instanceof DomainError||e instanceof ProtocolError;
   return {ok:false,requestId:q.requestId,dataEpoch:epoch,error:{code:domain?e.code:'RESTORE_REJECTED',message:e instanceof Error?e.message:'无法恢复备份',outcome:appendCommitted?'unknown':'rejected',retryable:!!appendCommitted,fieldErrors:[]}};
  }
 }
 return {get ctx(){return ctx;},execute,close(){if(closed)return;if(busy)throw new DomainError('RESTORE_BUSY','数据操作进行中');disposePreview();append.dispose();relocation.dispose();owner.close();closed=true;}};
}
