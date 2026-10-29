// Isolate renderer durable receipts as well as the synthetic Schema606 directory.
// Production main/preload/services are loaded unchanged by the existing fault adapter.
const {app}=require('electron');
const {join,dirname}=require('node:path');
if(process.env.GANKSOFT_E2E!=='1'||!/gank-b2-lifecycle-/.test(process.env.GANKSOFT_DATA_DIR||''))throw Error('SYNTHETIC_R7_ONLY');
app.setPath('userData',join(dirname(process.env.GANKSOFT_DATA_DIR),'r7-electron-profile'));
require('../r6/storage-host.cjs');
