// Validation bootstrap only. Real app, IPC sender guard, transactions and SQLite.
const {ipcMain}=require('electron');
if(process.env.GANKSOFT_E2E!=='1'||!process.env.GANK_MEDIA_MAIN||!/gank-b2-lifecycle-/.test(process.env.GANKSOFT_DATA_DIR||''))throw Error('SYNTHETIC_EXCHANGE_ONLY');
const state={mode:'',hidden:'',events:[]};
globalThis.mediaFaults={arm(mode){state.mode=mode;},clear(){state.mode='';state.hidden='';},events:()=>state.events};
const register=ipcMain.handle.bind(ipcMain);
ipcMain.handle=(channel,handler)=>register(channel,async(event,request)=>{
 if(channel!=='gank:protocol')return handler(event,request);
 if(request?.method==='operation.status'&&request.payload?.requestId===state.hidden)throw Error('synthetic receipt query temporarily unavailable');
 if(request?.method!=='media.library.delete')return handler(event,request);
 const row={requestId:request.requestId,payload:request.payload};state.events.push(row);
 const result=await handler(event,request);row.ok=result.ok;row.result=result.ok?result.data:result.error;
 if(state.mode==='unknown-once'&&result.ok){state.mode='';state.hidden=request.requestId;throw Error('synthetic reply lost after actual Markdown commit');}
 return result;
});
import(require('node:url').pathToFileURL(process.env.GANK_MEDIA_MAIN).href);
