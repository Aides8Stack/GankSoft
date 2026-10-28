// Test-only transport fault adapter; production main/preload/IPC/SQLite remain real.
const {ipcMain}=require('electron');
if(process.env.GANKSOFT_E2E!=='1'||!process.env.GANK_R6_MAIN||!/gank-b2-lifecycle-/.test(process.env.GANKSOFT_DATA_DIR||''))throw Error('SYNTHETIC_R6_ONLY');
const state={method:'',mode:'',hidden:'',events:[]};
globalThis.r6Faults={arm(method,mode='drop'){state.method=method;state.mode=mode;state.hidden='';},clear(){state.mode='';state.hidden='';},events:()=>state.events};
const register=ipcMain.handle.bind(ipcMain);
ipcMain.handle=(channel,handler)=>register(channel,async(event,request)=>{
 if(channel!=='gank:protocol')return handler(event,request);
 if(state.hidden&&(request?.method==='operation.status'||request?.method?.endsWith('.status')))throw Error('synthetic durable receipt temporarily unavailable');
 if(!request?.method?.match(/^storage\.(restore|merge|relocate)\.confirm$/))return handler(event,request);
 const row={method:request.method,requestId:request.requestId,dataEpoch:request.dataEpoch,payload:request.payload};state.events.push(row);
 const result=await handler(event,request);row.ok=result.ok;
 if(state.mode==='drop'&&state.method===request.method&&result.ok){state.mode='';state.hidden=request.requestId;throw Error('synthetic response lost after durable storage commit');}
 return result;
});
import(require('node:url').pathToFileURL(process.env.GANK_R6_MAIN).href);
