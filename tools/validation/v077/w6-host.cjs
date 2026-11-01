// Synthetic-only fault boundary. Renderer, gateway and SQLite remain production code.
const {app,ipcMain}=require('electron');
const {join,dirname,resolve}=require('node:path');
if(process.env.GANKSOFT_E2E!=='1'||!/gank-b2-lifecycle-/.test(process.env.GANKSOFT_DATA_DIR||''))throw Error('SYNTHETIC_W6_ONLY');
app.setPath('userData',join(dirname(process.env.GANKSOFT_DATA_DIR),'w6-profile'));
const state={calls:[],failRead:0,failTree:0,missingNode:'',failSet:false,unknown:false,statusUnknown:0,failAfterSet:0,hold:false,held:false,release:null,epoch:false};
globalThis.w6={set(flags){Object.assign(state,flags);},calls:()=>state.calls,held:()=>state.held,release(){state.hold=false;state.release?.();state.release=null;}};
const handle=ipcMain.handle.bind(ipcMain);
ipcMain.handle=(channel,listener)=>handle(channel,channel!=='gank:protocol'?listener:async(event,request)=>{
 state.calls.push({method:request.method,requestId:request.requestId,payload:request.payload});
 const fail=(message,code='W6_SYNTHETIC_FAILURE')=>({dataEpoch:request.dataEpoch,requestId:request.requestId,ok:false,error:{code,message,outcome:'rejected',retryable:false,fieldErrors:[]}});
 if(request.method==='knowledge.cardLinks.set'&&state.epoch){state.epoch=false;return fail('W6 obsolete page references','DATA_EPOCH_CHANGED');}
 if(request.method==='knowledge.cardLinks.set'&&state.failSet){state.failSet=false;return fail('W6 synthetic save rejected');}
 if(request.method==='operation.status'&&state.statusUnknown>0){state.statusUnknown--;throw Error('W6 receipt transport unavailable');}
 if(request.method==='knowledge.cardLinks.get'&&state.failRead>0){state.failRead--;throw Error('W6 relation read unavailable');}
 if(request.method==='knowledge.tree.read'&&state.failTree>0){state.failTree--;throw Error('W6 tree read unavailable');}
 const response=await listener(event,request);
 if(request.method==='knowledge.cardLinks.set'&&response.ok){
  if(state.failAfterSet){state.failRead+=state.failAfterSet;state.failAfterSet=0;}
  if(state.unknown){state.unknown=false;throw Error('W6 committed reply lost');}
 }
 if(request.method==='knowledge.tree.read'&&response.ok&&state.missingNode){response.data.nodes=response.data.nodes.filter(n=>n.nodeId!==state.missingNode);}
 if(request.method==='knowledge.cardLinks.get'&&state.hold){state.hold=false;state.held=true;await new Promise(r=>state.release=r);state.held=false;}
 return response;
});
import(require('node:url').pathToFileURL(resolve('dist-electron/electron/main.js')).href);
