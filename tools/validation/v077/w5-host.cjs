// Substitute only the native file picker, for isolated synthetic data.
const {app,dialog}=require('electron');
const {join,dirname,resolve}=require('node:path');
if(process.env.GANKSOFT_E2E!=='1'||!/gank-b2-lifecycle-/.test(process.env.GANKSOFT_DATA_DIR||''))throw Error('SYNTHETIC_W5_ONLY');
app.setPath('userData',join(dirname(process.env.GANKSOFT_DATA_DIR),'w5-electron-profile'));
let paths=[],calls=[];
globalThis.w5Dialogs={set(v){paths=v;},calls:()=>calls};
dialog.showOpenDialog=async(...args)=>{calls.push(args.at(-1).title);const path=paths.shift();return path?{canceled:false,filePaths:[path]}:{canceled:true,filePaths:[]};};
import(require('node:url').pathToFileURL(resolve('dist-electron/electron/main.js')).href);
