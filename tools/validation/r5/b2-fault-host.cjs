// Validation-only wrapper around Electron's PUBLIC IPC registration. The
// production main bundle, sender guard, protocol service and SQLite stay real.
// Never installed by production or offered as an application feature.
const {ipcMain}=require('electron');
const {appendFileSync}=require('node:fs');
const log=row=>{if(process.env.GANK_B2_EVENT_LOG)appendFileSync(process.env.GANK_B2_EVENT_LOG,JSON.stringify(row)+'\n');};
if(process.env.GANKSOFT_E2E!=='1'||!process.env.GANK_B2_MAIN||!/gank-b2-lifecycle-/.test(process.env.GANKSOFT_DATA_DIR||''))throw Error('SYNTHETIC_B2_ONLY');
const state={mode:'',nodeId:'',hiddenRequest:'',events:[]};
globalThis.b2Faults={arm(mode,nodeId){state.mode=mode;state.nodeId=nodeId;state.hiddenRequest='';},clear(){state.mode='';state.hiddenRequest='';},events:()=>state.events};
const register=ipcMain.handle.bind(ipcMain);
ipcMain.handle=(channel,handler)=>register(channel,async(event,request)=>{
 if(channel!=='gank:protocol')return handler(event,request);
 if(request?.method==='operation.status'&&request.payload?.requestId===state.hiddenRequest)throw Error('synthetic temporarily unavailable receipt query');
 if(request?.method!=='knowledge.node.save')return handler(event,request);
 const row={requestId:request.requestId,nodeId:request.payload.nodeId,expectedRevision:request.payload.expectedRevision,markdown:request.payload.markdown,mode:state.mode};state.events.push(row);
 if(request.payload.nodeId===state.nodeId&&state.mode==='reject'){row.ok=false;log(row);return {ok:false,requestId:request.requestId,dataEpoch:request.dataEpoch,error:{code:'B2_SYNTHETIC_REJECTED',message:'合成保存失败，正文未写入',outcome:'rejected',retryable:true,fieldErrors:[]}};}
 const result=await handler(event,request);row.ok=result.ok;row.revision=result.ok?result.data.revision:null;log(row);
 if(request.payload.nodeId===state.nodeId&&state.mode==='unknown-once'){state.mode='';state.hiddenRequest=request.requestId;throw Error('synthetic response loss AFTER actual commit');}
 return result;
});
import(require('node:url').pathToFileURL(process.env.GANK_B2_MAIN).href);
