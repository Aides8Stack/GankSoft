import {digest} from '../cards-unified/schedule.ts';
import {DomainError} from '../../../shared/domain-error.ts';
import {AppendConfirmation,AppendSelection} from '../../../shared/protocol/external-append.ts';
import {openUnifiedOwner,readRestoreStatus} from '../../infrastructure/migrations/coordinator.ts';
import {scanExternalDatabase,type ExternalScan} from './external-scan.ts';
import {planAppendSelection} from './append-selection.ts';
import {prepareIndependentAppend,readIndependentAppendResult} from './append-service.ts';

export const appendMethods=['storage.append.open','storage.append.decks','storage.append.preview','storage.append.cancel','storage.append.confirm','storage.append.status'] as const;
/** Shares the existing storage session's owner, lock and reopen lifecycle. No
 * second DB owner, pointer or gateway receipt is created for an append. */
export function createAppendController(control:string,ports:{
 owner:()=>ReturnType<typeof openUnifiedOwner>;selectDatabase:()=>Promise<string|null>;workspaceParent:string;
 available:()=>boolean;busy:()=>boolean;lock:(busy:boolean)=>void;reopen:()=>void;
}){
 let scan:ExternalScan|undefined,prepared:Awaited<ReturnType<typeof prepareIndependentAppend>>|undefined;
 let inFlight:{id:string;hash:string;promise:Promise<unknown>}|undefined;
 const fail=(code:string,message:string):never=>{throw new DomainError(code,message);};
 function disposePlan(){prepared?.close();prepared=undefined;}
 function dispose(){disposePlan();scan?.close();scan=undefined;}
 function result(operationId:string){const r=readIndependentAppendResult(control,operationId);return r?{...r,reopened:ports.available()&&ports.owner().epoch===r.epoch}:null;}
 function status(operationId:string){
  const r=readRestoreStatus(control,operationId);if(!r)return null;
  // A restore operation ID must never masquerade as an append receipt.
  const receipt=result(operationId);if(r.state==='committed'&&!receipt)return null;
  return {operationId,state:r.state,epoch:r.epoch,recoveryPointAvailable:r.recoveryPoint!==null,reopened:ports.available()&&ports.owner().epoch===r.epoch,result:receipt};
 }
 async function execute(method:string,input:unknown){
  if(method==='storage.append.status')return status((input as {operationId:string}).operationId);
  if(method==='storage.append.confirm'){
   const c=AppendConfirmation.parse(input),hash=digest(c);
   if(inFlight){if(inFlight.id!==c.operationId||inFlight.hash!==hash)fail('APPEND_BUSY','另一个追加正在提交');return inFlight.promise;}
   const known=result(c.operationId);if(known){if(known.requestHash!==hash)fail('APPEND_OPERATION_CONFLICT','追加操作编号的确认内容已变化');return known;}
   if(ports.busy())fail('APPEND_BUSY','数据操作正在执行');
   if(!ports.available()||!prepared?.confirmation||prepared.confirmation.previewId!==c.previewId)fail('APPEND_PREVIEW_EXPIRED','请重新选择来源并预览');
   const captured=prepared!;ports.lock(true);
   const promise=(async()=>{try{
    await captured.confirm(ports.owner(),control,c);
    // A reopen failure leaves the committed control receipt queryable.
    try{ports.reopen();}catch{/* shared session marks the connection unavailable */}
    dispose();return result(c.operationId)!;
   }finally{ports.lock(false);inFlight=undefined;}})();
   inFlight={id:c.operationId,hash,promise};return promise;
  }
  if(ports.busy())fail('APPEND_BUSY','数据操作正在执行');
  if(!ports.available())fail('APPEND_RECOVERY_REQUIRED','请重启并核对已提交操作');
  if(method==='storage.append.cancel'){
   if(scan?.summary.scanId===(input as {scanId:string}).scanId)dispose();return true;
  }
  if(method==='storage.append.open'){
   ports.lock(true);try{dispose();const file=await ports.selectDatabase();if(!file)return null;
    scan=await scanExternalDatabase(file,ports.workspaceParent);return scan.summary;
   }catch(e){dispose();throw e;}finally{ports.lock(false);}
  }
  if(!scan||scan.summary.scanId!==(input as {scanId:string}).scanId)fail('APPEND_SCAN_EXPIRED','来源预览已失效，请重新选择');
  const source=scan!;
  if(method==='storage.append.decks'){const p=input as {limit:number;cursor:string|null};return source.listDecks(p.limit,p.cursor);}
  const p=AppendSelection.parse(input);ports.lock(true);try{
   disposePlan();const selection=planAppendSelection(source,p.selectedDeckIds);
   if(!selection.closed)return {selection,duplicates:null,confirmation:null};
   prepared=await prepareIndependentAppend(ports.owner(),source,p.selectedDeckIds,ports.workspaceParent,{folderId:p.folderId,forceIndependent:p.forceIndependent});
   return {selection,duplicates:prepared.plan,confirmation:prepared.confirmation};
  }finally{ports.lock(false);}
 }
 return {execute,dispose};
}
