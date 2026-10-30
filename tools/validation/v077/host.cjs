// E2E transport observation/failure injection only. Production handlers stay unchanged.
const {ipcMain}=require('electron');
if(process.env.GANKSOFT_E2E!=='1')throw Error('E2E_ONLY');
let rejectMethod='',mode='',events=[];
globalThis.v077Faults={arm(method='draft.save',nextMode='reject'){rejectMethod=method;mode=nextMode;},clear(){rejectMethod='';mode='';},events:()=>events};
const register=ipcMain.handle.bind(ipcMain);
ipcMain.handle=(channel,handler)=>register(channel,async(event,request)=>{
 if(channel!=='gank:protocol')return handler(event,request);
 const row={method:request?.method,requestId:request?.requestId};events.push(row);
 if(request?.method===rejectMethod&&mode==='reject'){row.injected=true;throw Error('V077_SYNTHETIC_TRANSPORT_FAILURE:'+rejectMethod);}
 const result=await handler(event,request);row.ok=result?.ok;row.error=result?.error;if(request?.method===rejectMethod&&mode==='drop'&&result?.ok){row.dropped=true;rejectMethod='';throw Error('V077_SYNTHETIC_REPLY_INTERRUPTED_AFTER_COMMIT');}return result;
});
require('../r7/host.cjs');
