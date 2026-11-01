// E2E transport observation/failure injection only. Production handlers stay unchanged.
const {ipcMain}=require('electron');
if(process.env.GANKSOFT_E2E!=='1')throw Error('E2E_ONLY');
let rejectMethod='',mode='',events=[],held=null,heldAfter=null,releaseHold=null,hiddenReceipt=null;
globalThis.v077Faults={arm(method='draft.save',nextMode='reject'){rejectMethod=method;mode=nextMode;},clear(){rejectMethod='';mode='';hiddenReceipt=null;},events:()=>events,hold(method){held=method;},holdAfter(method){heldAfter=method;},release(){held=null;heldAfter=null;releaseHold?.();releaseHold=null;}};
const register=ipcMain.handle.bind(ipcMain);
ipcMain.handle=(channel,handler)=>register(channel,async(event,request)=>{
 if(channel!=='gank:protocol')return handler(event,request);
 const row={method:request?.method,requestId:request?.requestId};events.push(row);
 if(hiddenReceipt&&request?.method==='operation.status'&&request?.payload?.requestId===hiddenReceipt){row.injected=true;throw Error('V077_SYNTHETIC_RECEIPT_UNAVAILABLE');}
 if(request?.method===held){row.held=true;await new Promise(resolve=>{releaseHold=resolve;});row.released=true;}
 if(request?.method===rejectMethod&&mode==='reject'){row.injected=true;throw Error('V077_SYNTHETIC_TRANSPORT_FAILURE:'+rejectMethod);}
 if(request?.method===rejectMethod&&mode==='conflict'){rejectMethod='';mode='';const competing=structuredClone(request);competing.requestId=require('node:crypto').randomUUID();competing.payload.fields.payload.fields.body='T2-A newer competing flow';const other=await handler(event,competing);row.competing={requestId:competing.requestId,ok:other.ok,error:other.error};}
 const result=await handler(event,request);row.ok=result?.ok;row.error=result?.error;if(request?.method===heldAfter){row.heldAfter=true;await new Promise(resolve=>{releaseHold=resolve;});row.releasedAfter=true;}if(request?.method===rejectMethod&&['drop','drop-unknown'].includes(mode)&&result?.ok){row.dropped=true;if(mode==='drop-unknown')hiddenReceipt=request.requestId;rejectMethod='';throw Error('V077_SYNTHETIC_REPLY_INTERRUPTED_AFTER_COMMIT');}return result;
});
require('../r7/host.cjs');
