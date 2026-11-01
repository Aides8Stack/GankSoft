// Synthetic only: substitute native picker choices and optionally lose one committed IPC reply.
const {dialog,ipcMain}=require('electron');
if(process.env.GANKSOFT_E2E!=='1'||!/gank-b2-lifecycle-/.test(process.env.GANKSOFT_DATA_DIR||''))throw Error('SYNTHETIC_W5_ONLY');
let save=null,drop=null,dropped=[];
globalThis.w5Full={save(v){save=v;},drop(v){drop=v;},dropped:()=>dropped};
dialog.showSaveDialog=async()=>save?{canceled:false,filePath:save}:{canceled:true};
const handle=ipcMain.handle.bind(ipcMain);ipcMain.handle=(channel,fn)=>handle(channel,async(event,request)=>{const r=await fn(event,request);if(channel==='gank:protocol'&&request?.method===drop&&r?.ok){drop=null;dropped.push({requestId:request.requestId,method:request.method,payload:request.payload});throw Error('synthetic lost committed reply');}return r;});
require('./w5-host.cjs');
