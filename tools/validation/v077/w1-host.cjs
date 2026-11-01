// W1-only transport ordering/SQLite fault seam. Never loaded by production.
const {ipcMain}=require('electron');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {DatabaseSync}=require('node:sqlite');
if(process.env.GANKSOFT_E2E!=='1'||!/gank-b2-lifecycle-/.test(process.env.GANKSOFT_DATA_DIR||''))throw Error('SYNTHETIC_W1_ONLY');
let method=null,releases=[],trace=[];
globalThis.w1Faults={
 holdReply(m){method=m;},release(){method=null;for(const r of releases.splice(0))r();},events:()=>trace,
 receiptFailure(on){const active=JSON.parse(readFileSync(process.env.GANKSOFT_DATA_DIR+'-control606/active.json'));const db=new DatabaseSync(join(active.activeDir,'ganksoft.sqlite'));try{db.exec(on?"CREATE TRIGGER w1_fail_receipt BEFORE INSERT ON protocol_receipts WHEN NEW.method='learning.review.submit' BEGIN SELECT RAISE(ABORT,'W1 synthetic receipt failure'); END":"DROP TRIGGER w1_fail_receipt");}finally{db.close();}},
};
const register=ipcMain.handle.bind(ipcMain);
ipcMain.handle=(channel,handler)=>register(channel,async(e,request)=>{
 if(channel!=='gank:protocol')return handler(e,request);
 const row={method:request.method,requestId:request.requestId,payload:request.payload};trace.push(row);
 const reply=await handler(e,request);Object.assign(row,{ok:reply.ok,dataEpoch:reply.dataEpoch,dataRevision:reply.dataRevision,error:reply.error});
 if(method===request.method){method=null;row.held=true;await new Promise(resolve=>releases.push(resolve));row.released=true;}
 return reply;
});
require('./host.cjs');
