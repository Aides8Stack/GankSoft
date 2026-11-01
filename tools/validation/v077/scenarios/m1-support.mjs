// Test-only M1 GUI operations. All writes under a real action use Playwright.
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {prepareFreshUnified} from '../../../../electron/infrastructure/migrations/coordinator.ts';
import {createFullRestoreSession} from '../../../../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../../../../shared/protocol/client.ts';
import {step} from './core-support.mjs';

export async function freshFixture(options={}){
  const root=mkdtempSync(join(tmpdir(),options.unicode?'gank-b2-lifecycle-中文 空格-':'gank-b2-lifecycle-'));
  const data=join(root,'synthetic606');
  await prepareFreshUnified(data,data+'-control606');
  const owner=await createFullRestoreSession(data+'-control606',{workspaceParent:root,selectBackup:async()=>null,allowLegacyRestore:false});
  let deck;
  try{
    const api=createClient(r=>owner.execute(r));
    await api.call('app.capabilities',{});
    deck=(await api.call('workspace.catalog',{})).items.find(item=>item.kind==='deck');
  }finally{owner.close();}
  const fixture={fixtureVersion:2,root,data,deck:deck?{id:deck.id,name:deck.name}:null,secondDeck:null,parameters:{emptySchema606:true,unicode:!!options.unicode}};
  if(options.metadata)writeFileSync(options.metadata,JSON.stringify(fixture,null,2)+'\n');
  return fixture;
}
export const escapeRE=s=>s.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');
export async function gotoHome(ctx){
  const p=ctx.session.page;
  await p.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:'学习总览',exact:true}).click();
  await p.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
  await p.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();
}
export async function chooseDeck(ctx,item){
  await ctx.session.page.getByRole('complementary',{name:'学习导航'})
    .getByRole('button',{name:new RegExp('^'+escapeRE(item.name)+'，')}).click();
  await ctx.session.page.getByRole('heading',{name:item.name,exact:true}).waitFor();
}
export async function allCatalog(ctx,folderId=null){
  const items=[];let cursor=null;
  do{
    const response=await ctx.session.api.call('workspace.catalog',{folderId,cursor,limit:50});
    items.push(...response.items);cursor=response.nextCursor;
    assert.ok(items.length<1500,'Unexpected unbounded catalog fixture');
  }while(cursor);
  return items;
}
export async function findCatalog(ctx,kind,name,folderId=null){
  return (await allCatalog(ctx,folderId)).filter(item=>item.kind===kind&&item.name===name);
}
export async function openCatalogDialog(ctx,kind){
  const p=ctx.session.page;
  await p.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
  if(kind==='folder'){
    const details=p.locator('details.catalog-management');
    if(await details.getAttribute('open')===null)await details.locator('summary').click();
    await details.getByRole('button',{name:'新建文件夹',exact:true}).click();
  }else await p.getByRole('button',{name:'新建卡片集',exact:true}).click();
  const dialog=p.getByRole('dialog',{name:'编辑目录项',exact:true});
  await dialog.waitFor();
  return dialog;
}
export async function createCatalog(ctx,kind,name,folder=null){
  await gotoHome(ctx);
  const dialog=await openCatalogDialog(ctx,kind);
  if(folder)await dialog.getByLabel('目标文件夹',{exact:true}).getByRole('button',{name:folder.name,exact:true}).click();
  await dialog.getByRole('textbox',{name:'目录项名称',exact:true}).fill(name);
  await dialog.getByRole('button',{name:'保存目录',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  const matches=await findCatalog(ctx,kind,name,folder?.id??null);
  assert.equal(matches.length,1,'GUI catalog save must create one record');
  step(ctx,'GUI created '+kind+' '+name+' under '+(folder?.name??'root'));
  return matches[0];
}
export async function manageCatalog(ctx,name){
  const p=ctx.session.page;
  const details=p.locator('details.catalog-management');
  if(await details.getAttribute('open')===null)await details.locator('summary').click();
  await p.getByRole('article',{name,exact:true}).getByRole('button',{name:'管理目录项',exact:true}).click();
  const dialog=p.getByRole('dialog',{name:'编辑目录项',exact:true});
  await dialog.waitFor();
  return dialog;
}
export async function systemSection(ctx,section){
  const p=ctx.session.page;
  await p.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:'系统设置',exact:true}).click();
  await p.getByRole('navigation',{name:'设置分类'}).getByRole('button',{name:section,exact:true}).click();
  await p.getByRole('region',{name:section,exact:true}).waitFor();
}
export async function confirmAction(ctx,action){
  const p=ctx.session.page;
  if(process.platform==='linux'){
    // Headless Linux has no native modal surface. Only confirm's platform response
    // is injected; the click and all production lifecycle writes remain genuine.
    await p.evaluate(()=>{window.v077ConfirmOriginal=window.confirm;window.v077ConfirmCalls=[];window.confirm=message=>{window.v077ConfirmCalls.push(message);return true;};});
    try{await action();
      const calls=await p.evaluate(()=>window.v077ConfirmCalls);
      assert.equal(calls.length,1,'Actual GUI action must request one confirmation');
      ctx.observations.checks.nativeConfirmation={platform:'linux',response:'SIMULATED_NOT_WINDOWS_SIGNOFF',prompts:[...(ctx.observations.checks.nativeConfirmation?.prompts??[]),...calls]};
    }finally{await p.evaluate(()=>{window.confirm=window.v077ConfirmOriginal;});}
  }else{
    let resolveDialog,rejectDialog;const accepted=new Promise((resolve,reject)=>{resolveDialog=resolve;rejectDialog=reject;});
    p.once('dialog',d=>d.accept().then(resolveDialog,rejectDialog));
    await action();await accepted;
  }
}
export async function deleteDeckGUI(ctx,item){
  const p=ctx.session.page;
  const dialog=await manageCatalog(ctx,item.name);
  await confirmAction(ctx,()=>dialog.getByRole('button',{name:'删除卡片集',exact:true}).click());
  await dialog.waitFor({state:'hidden'});
  assert.ok(!(await ctx.session.api.call('workspace.recycle.decks',{deleted:false})).items.some(x=>x.id===item.id));
  assert.ok((await ctx.session.api.call('workspace.recycle.decks',{deleted:true})).items.some(x=>x.id===item.id));
  step(ctx,'GUI deleted deck with confirmation and read-only recycle verification');
}
export async function restoreDeckGUI(ctx,item){
  await systemSection(ctx,'回收站');
  const p=ctx.session.page,region=p.getByRole('region',{name:'统一回收站',exact:true});
  await region.getByRole('navigation',{name:'回收站分类'}).getByRole('button',{name:'卡片集',exact:true}).click();
  await region.getByRole('checkbox',{name:'恢复卡片集 '+item.name,exact:true}).check();
  await confirmAction(ctx,()=>region.getByRole('button',{name:'恢复选中卡片集',exact:true}).click());
  await region.getByRole('checkbox',{name:'恢复卡片集 '+item.name,exact:true}).waitFor({state:'hidden'});
  assert.ok((await ctx.session.api.call('workspace.recycle.decks',{deleted:false})).items.some(x=>x.id===item.id));
  step(ctx,'GUI recovered original deck identity through settings recycle');
}
