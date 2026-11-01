// Only native save-dialog choice is substituted; production renderer/IPC/export stay real.
const {app,dialog}=require('electron');
const {join,dirname,resolve}=require('node:path');
if(process.env.GANKSOFT_E2E!=='1'||!/gank-b2-lifecycle-/.test(process.env.GANKSOFT_DATA_DIR||''))throw Error('SYNTHETIC_W4_ONLY');
app.setPath('userData',join(dirname(process.env.GANKSOFT_DATA_DIR),'w4-electron-profile'));
let path=null,hold=false,release=null,calls=[];
globalThis.w4Dialogs={set(next){path=next;},hold(){hold=true;},release(){hold=false;release?.();release=null;},calls:()=>calls};
dialog.showSaveDialog=async(...args)=>{const options=args.at(-1);calls.push({title:options.title,defaultPath:options.defaultPath});if(hold)await new Promise(r=>{release=r;});return path?{canceled:false,filePath:path}:{canceled:true};};
import(require('node:url').pathToFileURL(resolve('dist-electron/electron/main.js')).href);
