import assert from 'node:assert/strict';
import {Transformer} from '@napi-rs/image';
import {executeCase,enterCards,restart,awaitDraft,exitEditorToList,draftBoxOpen} from '../helpers.mjs';
import {snapshot} from '../../r7/support.ts';
import {observe,evidence,step} from './core-support.mjs';
import {nav} from './module-support.mjs';
const id=process.argv[2],out=process.argv[3];
if(!['MEDIA-01','MEDIA-03'].includes(id)||!out)throw Error('UNSUPPORTED_MEDIA_CASE');
async function loaded(images){for(const img of await images.all()){await img.evaluate(el=>new Promise((resolve,reject)=>{if(el.complete)return el.naturalWidth?resolve():reject(Error('IMAGE_NOT_LOADED'));el.addEventListener('load',resolve,{once:true});el.addEventListener('error',()=>reject(Error('IMAGE_LOAD_ERROR')),{once:true});}));assert.equal(await img.evaluate(el=>el.naturalWidth),4);}}
await executeCase(id,out,async ctx=>{
  await observe(ctx);await enterCards(ctx);let p=ctx.session.page;const title='B2 保持发布和历史';
  const publishedBefore=await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card);
  await p.getByRole('button',{name:'编辑 '+title,exact:true}).click();
  const body=p.locator('[data-editor-field=body] .ProseMirror[contenteditable=true]');await body.waitFor();
  const png=Transformer.fromRgbaPixels(Buffer.from(Array.from({length:16},()=>[200,50,130,255]).flat()),4,4).pngSync();
  await ctx.session.app.evaluate(({clipboard,ClipboardItem},base64)=>clipboard.write([new ClipboardItem({'image/png':new Blob([Buffer.from(base64,'base64')],{type:'image/png'})})]),png.toString('base64'));
  await body.click();await p.keyboard.press('Control+End');await p.keyboard.press('Enter');await p.keyboard.press('Control+V');
  const images=body.locator('img[data-gank-placement]');await images.first().waitFor();await loaded(images);
  if(id==='MEDIA-03'){
    const tools=p.getByLabel('正文图片管理',{exact:true}).first();await tools.locator('summary').click();await tools.getByRole('button',{name:'重新插入图片',exact:true}).click();
    assert.equal(await images.count(),2);
    for(const [index,width]of [[1,30],[2,80]]){const input=p.getByLabel('图片 '+index+' 宽度',{exact:true});await input.fill(String(width));await input.press('Tab');}
  }
  ctx.observations.checks.widthUiBeforeSave=await p.locator('.editor-image-size input').evaluateAll(inputs=>inputs.map(e=>({label:e.getAttribute('aria-label'),value:e.value})));
  await p.getByTestId('save-draft').click();const saved=await awaitDraft(ctx,title,'body','不可意外修改的已发布正文');
  ctx.observations.checks.persistedPlacements=saved.mediaRefs;
  assert.equal(saved.mediaRefs.length,id==='MEDIA-03'?2:1);const assetId=saved.mediaRefs[0].assetId;
  assert.ok(saved.mediaRefs.every(x=>x.assetId===assetId));
  if(id==='MEDIA-03'){assert.equal(new Set(saved.mediaRefs.map(x=>x.placementId)).size,2);assert.deepEqual(saved.mediaRefs.map(x=>x.width).sort((a,b)=>a-b),[30,80]);}
  const mediaBefore=snapshot(ctx.fixture).media;assert.ok(Object.keys(mediaBefore).some(x=>x.startsWith(assetId)));
  await exitEditorToList(ctx);await nav(ctx,'图片资源');const resource=p.locator('[data-resource="'+assetId+'"]');await resource.waitFor();await loaded(resource.locator('img'));assert.ok((await resource.innerText()).includes(assetId));
  await nav(ctx,'所有卡片');await draftBoxOpen(ctx,title);await loaded(p.locator('[data-editor-field=body] img[data-gank-placement]'));
  await exitEditorToList(ctx);const reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);await enterCards(ctx);await draftBoxOpen(ctx,title);
  const restored=p.locator('[data-editor-field=body] img[data-gank-placement]');await restored.first().waitFor();assert.equal(await restored.count(),saved.mediaRefs.length);await loaded(restored);
  if(id==='MEDIA-03'){assert.equal(await p.getByLabel('图片 1 宽度',{exact:true}).inputValue(),'30');assert.equal(await p.getByLabel('图片 2 宽度',{exact:true}).inputValue(),'80');}
  assert.deepEqual((await ctx.session.api.call('draft.get',ctx.fixture.card)).payload,saved.payload);assert.deepEqual((await ctx.session.api.call('draft.get',ctx.fixture.card)).mediaRefs,saved.mediaRefs);
  assert.deepEqual(snapshot(ctx.fixture).media,mediaBefore);assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card),publishedBefore);
  ctx.observations.checks.media={assetId,placements:saved.mediaRefs,hashes:mediaBefore};step(ctx,'Native synthetic PNG clipboard + real GUI paste, image loaded, resource library found asset, exact draft refs/independent widths and file hashes survive new PID');
  return {...await evidence(ctx),reboot};
});
