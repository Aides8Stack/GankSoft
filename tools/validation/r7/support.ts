import {_electron as electron} from 'playwright-core';
import {resolve} from 'node:path';
import {createClient} from '../../../shared/protocol/client.ts';
import {args,require} from '../r5/support.ts';
export {stop,snapshot,active,hash,openBackup,selectFile} from '../r6/storage-support.ts';
export async function launch(f:any){
 const app=await electron.launch({executablePath:require('electron'),args:[...args,resolve('tools/validation/r7/host.cjs')],env:{...process.env,TZ:'Asia/Shanghai',GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:f.data,GANK_R6_MAIN:resolve('dist-electron/electron/main.js')},timeout:20000});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();const api=createClient(r=>page.evaluate((v:any)=>(window as any).gank.protocol(v),r));await api.call('app.capabilities',{});return{app,page,api};
}
