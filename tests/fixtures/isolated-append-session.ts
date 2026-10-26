// Internal S8.b host. No production import, registration, environment flag or IPC.
import {Application} from '../../electron/application.ts';
import {createApplicationProtocol} from '../../electron/protocol/gateway.ts';
import {openUnifiedOwner,readRestoreStatus,recoverUnifiedMigration} from '../../electron/infrastructure/migrations/coordinator.ts';
import {appendMethods,createAppendController} from '../../electron/modules/storage-unified/append-session.ts';
import {AppendConfirmation} from '../../shared/protocol/external-append.ts';
import {RequestSchema,registry,type Response} from './isolated-append-registry.ts';
import {DomainError} from '../../shared/domain-error.ts';
import {ProtocolError,assertWireValue} from '../../shared/protocol/data.ts';
import type {Context} from '../../electron/infrastructure/context.ts';
export async function createFullRestoreSession(control:string,ports:{workspaceParent:string;selectDatabase:()=>Promise<string|null>;selectBackup:()=>Promise<string|null>;recover?:boolean}){
 if(ports.recover)await recoverUnifiedMigration(control);
 let owner=openUnifiedOwner(control),ctx:Context={db:owner.db,dataDir:owner.dataDir,now:()=>new Date()},epoch=owner.epoch,available=true,busy=false,closed=false;
 const makeHost=()=>createApplicationProtocol(new Application(ctx),()=>{if(busy)throw new DomainError('MAINTENANCE_BUSY','数据操作进行中');});let host=makeHost();
 const append=createAppendController(control,{owner:()=>owner,selectDatabase:ports.selectDatabase,workspaceParent:ports.workspaceParent,
  available:()=>available,busy:()=>busy,lock:v=>{busy=v;},reopen:()=>{available=false;owner.close();owner=openUnifiedOwner(control);ctx={db:owner.db,dataDir:owner.dataDir,now:()=>new Date()};epoch=owner.epoch;host=makeHost();available=true;}});
 async function execute(raw:unknown):Promise<Response>{
  if(closed)throw new DomainError('RESTORE_SESSION_CLOSED','数据会话已关闭');
  assertWireValue(raw);const req=RequestSchema.safeParse(raw);if(!req.success)return host.execute(raw);
  const q=req.data;if(!appendMethods.includes(q.method as typeof appendMethods[number])){
   const r=await host.execute(raw);if(q.method==='app.capabilities'&&r.ok){const caps=r.data as unknown as {supportedMethods:string[];definedMethods:string[]};caps.supportedMethods.push(...appendMethods);caps.definedMethods=Object.keys(registry).sort();}return r;
  }
  try{
   if(q.protocol.major!==2||q.protocol.minor!==0)throw new ProtocolError('CONTRACT_UNSUPPORTED','不支持的协议版本');
   const definition=registry[q.method as typeof appendMethods[number]],input=definition.input.parse(q.payload);
   if(q.method==='storage.append.confirm'){const c=AppendConfirmation.parse(input);if(q.requestId!==c.operationId||q.dataEpoch!==c.expectedEpoch)throw new DomainError('APPEND_CONFIRMATION_CHANGED','请求编号或代次与确认不一致');}
   else if(q.dataEpoch!==epoch)throw new DomainError('DATA_EPOCH_CHANGED','数据代次已变化，请刷新');
   const data=definition.output.parse(await append.execute(q.method,input));epoch=available?owner.epoch:q.method==='storage.append.confirm'?readRestoreStatus(control,(input as {operationId:string}).operationId)?.epoch??epoch:epoch;
   return {ok:true,requestId:q.requestId,dataEpoch:epoch,dataRevision:available?Number(ctx.db.prepare('SELECT revision FROM protocol_meta').get()!.revision):0,data:data as never};
  }catch(e){
   const committed=q.method==='storage.append.confirm'&&AppendConfirmation.safeParse(q.payload).success&&(!(e instanceof DomainError)||e.code==='APPEND_RECEIPT_UNAVAILABLE')&&readRestoreStatus(control,(q.payload as {operationId:string}).operationId)?.state==='committed';
   const domain=e instanceof DomainError||e instanceof ProtocolError;
   return {ok:false,requestId:q.requestId,dataEpoch:epoch,error:{code:domain?e.code:'RESTORE_REJECTED',message:e instanceof Error?e.message:'追加失败',outcome:committed?'unknown':'rejected',retryable:!!committed,fieldErrors:[]}};
  }
 }
 return {get ctx(){return ctx;},execute,close(){if(closed)return;if(busy)throw Error('BUSY');append.dispose();owner.close();closed=true;}};
}
