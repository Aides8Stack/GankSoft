import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync,cpSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {createClient} from '../../../shared/protocol/client.ts';
export const out='docs/v076/rebuild-v37-source-first/stages/R5/evidence';
export const require=createRequire(import.meta.url);
export const args=['--no-sandbox','--ozone-platform=headless','--ozone-override-screen-size=1600,1000','--disable-gpu'];
export function restoreCache(){
 const cache=process.env.R5_SEED_CACHE??'validation-results/r2-seed-v2';
 const f=JSON.parse(readFileSync(join(cache,'fixture.json'),'utf8'));
 assert.match(f.root,/^\/tmp\/gank-r0-matched-/);assert.equal(f.data,join(f.root,'synthetic606'));
 assert.ok(existsSync(join(cache,'root/synthetic606-control606/target/ganksoft.sqlite')));
 if(!existsSync(f.root))cpSync(join(cache,'root'),f.root,{recursive:true});
 return f;
}
export async function start(data:string){
 const app=await electron.launch({executablePath:require('electron'),args:[...args,resolve('.')],env:{...process.env,TZ:'Asia/Shanghai',GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:data}});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);
 await page.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();
 const api=createClient(r=>page.evaluate((v:any)=>(window as any).gank.protocol(v),r));await api.call('app.capabilities',{});
 return {app,page,api};
}
export async function stop(app:any,data:string){if(app){await app.close();assert.equal(existsSync(data+'-control606/writer.lock'),false);}}
export async function openMap(page:any,deckName:string){
 await page.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:new RegExp('^'+deckName+'，')}).click();
 await page.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'知识图谱',exact:true}).click();
 await page.locator('.mind-canvas .me-tpc').first().waitFor();
}
export function saveReport(name:string,data:any){mkdirSync(out,{recursive:true});writeFileSync(join(out,name),JSON.stringify(data,null,2)+'\n');}
export async function select(page:any,name:string){await page.locator('.mind-canvas .me-tpc').filter({hasText:new RegExp('^'+name+'$')}).click();}
export async function saveMap(page:any){const save=page.getByRole('button',{name:'保存图谱修改',exact:true});if(await save.count())await save.click();await page.waitForFunction(()=>document.querySelector('.r5-map-footer [role=status]')?.textContent?.includes('图谱已保存')||document.querySelector('.r5-map-footer [role=status]')?.textContent?.includes('已保存 ·'));}
export async function nameNew(page:any,name:string){const input=page.locator('.mind-canvas #input-box');await input.waitFor();await input.fill(name);await input.press('Enter');await input.waitFor({state:'hidden'});await saveMap(page);}
