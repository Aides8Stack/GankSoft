import {createHash,randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {mkdtempSync,rmSync} from 'node:fs';
import {DomainError} from '../../../shared/domain-error.ts';
import {FullRestoreConfirmation} from '../../../shared/protocol/full-backup.ts';
import {RelocationConfirmation,type RelocationConfirmationDTO} from '../../../shared/protocol/relocation.ts';
import {createBackup} from '../../infrastructure/backup.ts';
import {openUnifiedOwner,readRelocationStatus,readRestoreStatus} from '../../infrastructure/migrations/coordinator.ts';
import {inspectDatabaseBaseline} from '../../infrastructure/migrations/baseline.ts';
import {previewFullBackup,type FullBackupPreview} from './backup-preview.ts';
import {previewRelocation} from './relocation-preview.ts';

export const relocationMethods=['storage.relocate.open','storage.relocate.cancel','storage.relocate.confirm','storage.relocate.status'] as const;
/** All temporary files stay in the private workspace; only the coordinator
 * publishes an external directory through its durable active pointer. */
export function createRelocationController(control:string,ports:{owner:()=>ReturnType<typeof openUnifiedOwner>;
 selectParent:()=>Promise<string|null>;workspaceParent:string;available:()=>boolean;busy:()=>boolean;
 lock:(value:boolean)=>void;reopen:()=>void}){
 let plan:ReturnType<typeof previewRelocation>|undefined,preview:FullBackupPreview|undefined,workspace:string|undefined;
 let inFlight:{id:string;hash:string;promise:Promise<unknown>}|undefined;
 const fail=(code:string,message:string):never=>{throw new DomainError(code,message);};
 function dispose(){preview?.close();preview=undefined;plan=undefined;if(workspace)rmSync(workspace,{recursive:true,force:true});workspace=undefined;}
 function status(id:string){const r=readRelocationStatus(control,id);if(!r)return null;
  return {operationId:r.operationId,state:r.state,epoch:r.epoch,recoveryPointAvailable:r.recoveryPoint!==null,
   reopened:ports.available()&&ports.owner().epoch===r.epoch,destination:r.destination};
 }
 async function execute(method:string,input:unknown){
  if(method==='storage.relocate.status')return status((input as {operationId:string}).operationId);
  if(method==='storage.relocate.confirm'){
   const c=RelocationConfirmation.parse(input),base=FullRestoreConfirmation.parse({operationId:c.operationId,previewId:c.previewId,
    archiveSha256:c.archiveSha256,expectedEpoch:c.expectedEpoch,expectedRevision:c.expectedRevision,replaceAll:true,migrateLegacy:false}),
    hash=createHash('sha256').update(JSON.stringify(base)).digest('hex');
   if(inFlight){if(inFlight.id!==c.operationId||inFlight.hash!==createHash('sha256').update(JSON.stringify(c)).digest('hex'))fail('RELOCATE_BUSY','另一个目录迁移正在提交');return inFlight.promise;}
   const known=readRelocationStatus(control,c.operationId);
   if(known){if(known.confirmationSha256!==hash||known.archiveSha256!==c.archiveSha256||known.destination!==c.destination||known.sourceDigest!==c.sourceDigest)fail('RELOCATE_OPERATION_CONFLICT','目录迁移编号与原确认不符');return status(c.operationId);}
   if(readRestoreStatus(control,c.operationId))fail('RELOCATE_OPERATION_CONFLICT','操作编号已用于其他数据操作');
   if(ports.busy())fail('RELOCATE_BUSY','数据操作正在执行');
   if(!ports.available()||!plan||!preview||plan.destination!==c.destination||plan.sourceDigest!==c.sourceDigest||preview.summary.previewId!==c.previewId)
    fail('RELOCATE_PREVIEW_EXPIRED','请重新预检目标目录');
   const current=ports.owner(),capturedPlan=plan!,captured=preview!;
   if(current.epoch!==capturedPlan.expectedEpoch||Number(current.db.prepare('SELECT revision FROM protocol_meta').get()?.revision)!==capturedPlan.expectedRevision||
    inspectDatabaseBaseline(join(current.dataDir,'ganksoft.sqlite'),current.dataDir,606).digest!==capturedPlan.sourceDigest)
    fail('RELOCATE_SOURCE_CHANGED','活动数据在预览后发生变化');
   ports.lock(true);
   const promise=(async()=>{try{
    try{await current.restore(captured,base,{},c.destination);}catch(e){
     if(!(e instanceof DomainError&&e.code==='RESTORE_COMMITTED'&&readRelocationStatus(control,c.operationId)?.state==='committed'))throw e;
    }
    try{ports.reopen();}catch{/* The committed receipt stays queryable after restart. */}
    const result=status(c.operationId);dispose();return result;
   }finally{ports.lock(false);inFlight=undefined;}})();
   inFlight={id:c.operationId,hash:createHash('sha256').update(JSON.stringify(c)).digest('hex'),promise};return promise;
  }
  if(ports.busy())fail('RELOCATE_BUSY','数据操作正在执行');
  if(!ports.available())fail('RELOCATE_RECOVERY_REQUIRED','请重启并核对唯一活动数据目录');
  if(method==='storage.relocate.cancel'){if(preview?.summary.previewId===(input as {previewId:string}).previewId)dispose();return true;}
  ports.lock(true);try{
   dispose();const parent=await ports.selectParent();if(!parent)return null;
   const owner=ports.owner(),p=previewRelocation(owner,control,parent);
   workspace=mkdtempSync(join(ports.workspaceParent,'gank-relocation-'));
   const archive=join(workspace,'snapshot.zip');await createBackup(owner.db,owner.dataDir,archive);
   preview=await previewFullBackup(archive,ports.workspaceParent);
   if(preview.baseline.digest!==p.sourceDigest||preview.summary.schemaVersion!==606||
    owner.epoch!==p.expectedEpoch||Number(owner.db.prepare('SELECT revision FROM protocol_meta').get()?.revision)!==p.expectedRevision)
    fail('RELOCATE_SOURCE_CHANGED','创建固定快照时活动数据已变化');
   plan=p;
   const confirmation:RelocationConfirmationDTO={operationId:randomUUID(),previewId:preview.summary.previewId,
    archiveSha256:preview.archiveSha256,expectedEpoch:p.expectedEpoch,expectedRevision:p.expectedRevision,
    replaceAll:true,migrateLegacy:false,destination:p.destination,sourceDigest:p.sourceDigest};
   return {source:p.source,destination:p.destination,mediaFiles:p.mediaFiles,mediaBytes:p.mediaBytes,
    estimatedBytes:p.estimatedBytes,requiredBytes:p.requiredBytes,confirmation};
  }catch(e){dispose();throw e;}finally{ports.lock(false);}
 }
 return {execute,dispose};
}
