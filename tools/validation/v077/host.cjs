// Test-only fault at the transport boundary, before production handler execution.
const {ipcMain}=require('electron');
if(process.env.GANKSOFT_E2E!=='1')throw Error('E2E_ONLY');
let rejectDraft=false;
globalThis.v077Faults={arm(){rejectDraft=true;},clear(){rejectDraft=false;}};
const register=ipcMain.handle.bind(ipcMain);
ipcMain.handle=(channel,handler)=>register(channel,async(event,request)=>{
 if(channel==='gank:protocol'&&request?.method==='draft.save'&&rejectDraft)
   throw Error('V077_SYNTHETIC_DRAFT_TRANSPORT_FAILURE');
 return handler(event,request);
});
require('../r7/host.cjs');
