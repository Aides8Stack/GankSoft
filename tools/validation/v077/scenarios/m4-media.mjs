// Six MEDIA journeys. Real image gallery GUI; fixture writes only before launch.
import assert from 'node:assert/strict';
import {executeCase} from '../helpers.mjs';
import {observe,evidence,step,editor} from './core-support.mjs';
import {placementUrl} from '../../../../shared/editor/document.ts';
import {oldMediaFixture,qaFixture,fixtureOwner,openPublished,writeImage,paste,
  saveDraft,enterCards,exitEditorToList,restart,inspectMedia,openMedia,mediaList,
  protectedFacts,snapshot,integrity,backup,readContainer,hash,draft,published} from './m4-support.mjs';
const id=process.argv[2],out=process.argv[3];
const ids=['MEDIA-02','MEDIA-04','MEDIA-05','MEDIA-06','MEDIA-07','MEDIA-08'];
if(!ids.includes(id)||!out)throw Error('UNKNOWN_M4_MEDIA_CASE');
async function sharedAssetFixture(f){
  await oldMediaFixture(f);await qaFixture(f);
  await fixtureOwner(f,async api=>{
    const q=await api.call('card.getPublishedContent',f.qa);
    const summary=(await api.call('card.listSummary',{deckId:f.deck.id,limit:100})).items.find(x=>x.cardId===f.qa.cardId);
    assert.ok(summary?.title,'QA fixture must have a published title');
    const ref={...f.oldMedia,placementId:crypto.randomUUID(),role:'question',width:40};
    const payload=structuredClone(q.payload);
    payload.fields.front='QA same image\n\n![reused]('+placementUrl({assetId:ref.assetId,placementId:ref.placementId,width:ref.width})+')\n';
    const d=await api.call('draft.save',{...f.qa,expectedPublishedRevision:summary.revision,expectedDraftRevision:null,
      fields:{title:summary.title,payload,mediaRefs:[ref]}});
    await api.call('card.publish',{...f.qa,expectedPublishedRevision:summary.revision,expectedDraftRevision:d.revision,resetStudyCycle:false});
    const node=await api.call('knowledge.node.read',{deckId:f.deck.id,nodeId:f.ids[1]});
    await api.call('knowledge.node.save',{deckId:f.deck.id,nodeId:f.ids[1],expectedRevision:node.revision,
      markdown:node.markdown+'\n![same asset]('+placementUrl({assetId:ref.assetId,placementId:crypto.randomUUID(),width:60})+')\n'});
  });
}
const fixtureSetup=['MEDIA-02','MEDIA-05','MEDIA-07'].includes(id)?
  (id==='MEDIA-02'?sharedAssetFixture:oldMediaFixture):undefined;
await executeCase(id,out,async ctx=>{
  await observe(ctx);const p=ctx.session.page;let reboot;
  const base=protectedFacts(ctx),originalPublished=await published(ctx);
  if(id==='MEDIA-02'){
    const impact=await ctx.session.api.call('media.library.impact',{deckId:ctx.fixture.deck.id,assetId:ctx.fixture.oldMedia.assetId});
    assert.ok(impact.item.references>=3,'One asset must be referenced by published cards and knowledge');
    assert.ok(impact.refs.some(x=>String(x.label).includes('B2 保持发布')));
    assert.ok(impact.refs.some(x=>String(x.label).includes('T2-A published QA')));
    assert.ok(impact.refs.some(x=>String(x.label).includes('生命周期乙')));
    const {row,panel}=await inspectMedia(ctx,ctx.fixture.oldMedia.assetId);
    assert.ok((await row.innerText()).includes('处引用'));
    assert.ok((await panel.innerText()).includes('保护内容'));
    assert.equal(await panel.getByRole('button',{name:'删除引用与资源'}).isDisabled(),true);
    assert.deepEqual(protectedFacts(ctx),base);
    reboot=await restart(ctx);await observe(ctx);
    assert.deepEqual(await ctx.session.api.call('media.library.impact',{deckId:ctx.fixture.deck.id,assetId:ctx.fixture.oldMedia.assetId}),impact);
    await inspectMedia(ctx,ctx.fixture.oldMedia.assetId);
    step(ctx,'Gallery GUI shows every same-asset placement across published cards and knowledge; protected deletion disabled');
  }else if(id==='MEDIA-04'){
    await openPublished(ctx);
    await writeImage(ctx);await paste(ctx,'body');
    const body=editor(ctx,'body'),imgs=body.locator('img[data-gank-placement]');
    await imgs.first().waitFor();
    const placement=await imgs.first().getAttribute('data-gank-placement');
    const before=await imgs.count();
    await body.press('Control+z');
    await p.waitForFunction(n=>document.querySelectorAll('[data-editor-field=body] img[data-gank-placement]').length<n,before);
    await body.press('Control+Shift+z');
    await imgs.first().waitFor();
    assert.equal(await imgs.first().getAttribute('data-gank-placement'),placement);
    await imgs.first().click();await p.keyboard.press('Backspace');
    await p.getByTestId('save-draft').click();
    const d=await ctx.session.api.call('draft.get',ctx.fixture.card);
    assert.equal(d.mediaRefs.length,0,'Deleted editor placement must not remain a current draft reference');
    assert.deepEqual(await published(ctx),originalPublished,'Removing draft placement changed immutable published content');
    assert.equal((await ctx.session.api.call('learning.history.list',ctx.fixture.card)).items.length,1);
    reboot=await restart(ctx);await observe(ctx);
    assert.equal((await draft(ctx)).mediaRefs.length,0);
    step(ctx,'GUI PNG paste, actual undo/redo and deletion revoke only mutable placement, not history or archived media');
  }else if(id==='MEDIA-05'){
    const assetId=ctx.fixture.oldMedia.assetId;
    const {panel}=await inspectMedia(ctx,assetId);
    const data=await ctx.session.api.call('media.library.impact',{deckId:ctx.fixture.deck.id,assetId});
    assert.equal(data.item.blocked,true);
    assert.match(await panel.innerText(),/发布|历史|保护/);
    assert.equal(await panel.getByRole('button',{name:'删除引用与资源'}).isDisabled(),true);
    assert.deepEqual(protectedFacts(ctx),base);
    step(ctx,'UI explicitly rejects deleting a published/history referenced media asset; zero persisted writes');
  }else if(id==='MEDIA-06'){
    await openPublished(ctx);
    await writeImage(ctx);await paste(ctx);
    const d=await saveDraft(ctx,'B2 保持发布和历史','body','');
    const assetId=d.mediaRefs.at(-1)?.assetId;
    assert.ok(assetId);
    await exitEditorToList(ctx);
    const {panel}=await inspectMedia(ctx,assetId);
    assert.equal(await panel.getByRole('button',{name:'删除引用与资源'}).isDisabled(),false);
    await panel.getByRole('button',{name:'删除引用与资源'}).click();
    const dlg=p.getByRole('dialog',{name:'二次确认删除图片'});
    await dlg.waitFor();
    assert.equal(await dlg.getByRole('button',{name:'确认删除图片'}).isDisabled(),true);
    await dlg.getByRole('button',{name:'取消删除'}).click();
    assert.ok((await mediaList(ctx)).items.some(x=>x.assetId===assetId));
    assert.ok((await draft(ctx)).mediaRefs.some(x=>x.assetId===assetId));
    await panel.getByRole('button',{name:'删除引用与资源'}).click();
    await dlg.getByLabel('同时删除所有当前可变引用及图片资源').check();
    await dlg.getByRole('button',{name:'确认删除图片'}).click();
    await p.getByRole('status').filter({hasText:'资源已安全退役'}).waitFor();
    assert.ok(!(await mediaList(ctx)).items.some(x=>x.assetId===assetId),'Deleted asset still listed');
    assert.ok(!(await draft(ctx)).mediaRefs.some(x=>x.assetId===assetId),'Detached draft references still persist');
    assert.equal((await ctx.session.api.call('learning.history.list',ctx.fixture.card)).items.length,1);
    reboot=await restart(ctx);await observe(ctx);
    assert.ok(!(await mediaList(ctx)).items.some(x=>x.assetId===assetId));
    step(ctx,'Two-stage delete preview/cancel/confirm with explicit detach checkbox; history unchanged; restart proves closure');
  }else if(id==='MEDIA-07'){
    const beforeBytes=snapshot(ctx.fixture).media;
    const saved=await backup(ctx);
    const container=await readContainer(saved);
    const img=Object.entries(beforeBytes);
    for(const [file,sha] of img){
      const bytes=container.get('attachments/'+file);
      assert.ok(bytes,'Backup missing media attachment '+file);
      assert.equal(hash(bytes),sha,'Backup image digest mismatch '+file);
    }
    reboot=await restart(ctx);await observe(ctx);
    const media=await openMedia(ctx);
    await media.locator('[data-resource="'+ctx.fixture.oldMedia.assetId+'"] img').first().waitFor();
    assert.ok(await media.locator('[data-resource="'+ctx.fixture.oldMedia.assetId+'"] img').first()
      .evaluate(e=>e.complete&&e.naturalWidth>0));
    const publishedContent=await published(ctx);
    assert.ok(publishedContent.mediaRefs.some(x=>x.assetId===ctx.fixture.oldMedia.assetId));
    assert.deepEqual(snapshot(ctx.fixture).media,beforeBytes);
    step(ctx,'Actual backup ZIP bytes match every asset, published media loads after new PID, and no historical link breaks');
  }else if(id==='MEDIA-08'){
    await openPublished(ctx);
    const body=editor(ctx,'body');
    const original=await body.innerText();
    const unsafe=['file:///C:/Users/secret/private.png','gank-asset://../../outside','javascript:alert(1)',
      '<script>globalThis.__m4_executed=1</script>'];
    const traffic=[];p.on('request',req=>traffic.push(req.url()));
    for(const text of unsafe){
      await body.fill(original+'\n\n![unsafe]('+text+')\n');
      await p.getByTestId('save-draft').click();
      assert.equal(await p.evaluate(()=>globalThis.__m4_executed===1),false);
      assert.ok(!(await body.innerText()).includes('C:\\Users\\secret'),'Editor leaked an OS path');
    }
    assert.ok(!traffic.some(u=>u.includes('private.png')||u.includes('outside')));
    const d=await draft(ctx),pub=await published(ctx);
    assert.equal(pub.title,'B2 保持发布和历史');
    assert.ok(!d.mediaRefs.some(x=>x.assetId?.includes('..')));
    assert.ok(d.mediaRefs.every(x=>!/^file:/i.test(x.assetId)));
    step(ctx,'Native editor unsafe URI / forged asset reference never resolves external files or runs JavaScript; published unaffected');
  }
  integrity(ctx);
  return {...await evidence(ctx),...(reboot?{reboot}:{})};
},{fixtureSetup});
