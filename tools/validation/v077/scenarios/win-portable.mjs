// WIN-09 portable-GankSoft.exe GUI loop on actual Win10 OR Win11.
// A single host NEVER signs off WIN-09. Pair both host proofs via win09-verify.mjs.
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {basename,dirname,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {_electron as electron} from 'playwright-core';
import {createClient} from '../../../../shared/protocol/client.ts';
import {executeCase,enterCards,awaitDraft,exitEditorToList,draftBoxOpen,restart} from '../helpers.mjs';
import {observe,evidence,step,editor,newQuestion,publish} from './core-support.mjs';
import {integrity} from './system-support.mjs';
import {preflight,actualOs,sha256,blocked,recordLocalProof} from './win-native-support.mjs';

const id=process.argv[2],out=process.argv[3];
if(id!=='WIN-09'||!out)throw Error('UNKNOWN_WIN_PORTABLE_CASE');
async function portableLaunch(f){
  const exe=process.env.GANKSOFT_WIN_PORTABLE_EXE;
  const app=await electron.launch({executablePath:exe,args:[],
    env:{...process.env,GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:f.data,TZ:'Asia/Shanghai'},
    timeout:30000});
  const page=await app.firstWindow();
  page.setDefaultTimeout(15000);
  await page.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();
  const api=createClient(req=>page.evaluate(v=>window.gank.protocol(v),req));
  await api.call('app.capabilities',{});
  return {app,page,api};
}
const cardName='WIN-09 Win10 Win11 统一便携测试卡';
if(preflight(id,out,{portable:true})){
  await executeCase(id,out,async ctx=>{
    await observe(ctx);
    const os=actualOs(),zip=process.env.GANKSOFT_WIN_PORTABLE_ZIP,
      exe=process.env.GANKSOFT_WIN_PORTABLE_EXE;
    assert.ok(existsSync(zip)&&existsSync(exe));
    assert.match(basename(exe),/^GankSoft\.exe$/i,'Must use extracted GankSoft.exe, not a dev Electron process');
    const zipHash=sha256(zip),exeHash=sha256(exe);
    if(process.env.GANKSOFT_WIN_EXPECT_ZIP_SHA256)
      assert.equal(zipHash,process.env.GANKSOFT_WIN_EXPECT_ZIP_SHA256.toLowerCase(),
        'Portable ZIP digest does not equal official artifact');
    const metadataFile=join(dirname(exe),'build-metadata.json');
    if(!existsSync(metadataFile))throw blocked('Packaged build-metadata.json must be present next to GankSoft.exe');
    const build=JSON.parse(readFileSync(metadataFile,'utf8'));
    assert.ok(build.sha&&build.version,'Cannot associate native Windows evidence with original built source');
    if(process.env.GANKSOFT_WIN_EXPECT_BUILD_SHA)
      assert.equal(build.sha,process.env.GANKSOFT_WIN_EXPECT_BUILD_SHA,'Portable app build SHA differs from expected');
    await enterCards(ctx);
    let p=ctx.session.page;
    await newQuestion(ctx,cardName,true);
    await p.getByTestId('save-draft').click();
    const saved=await awaitDraft(ctx,cardName,'stem','T1-A GUI 题干');
    assert.ok(saved.cardId);
    await exitEditorToList(ctx);
    await draftBoxOpen(ctx,cardName);
    assert.ok((await editor(ctx,'stem').innerText()).includes('T1-A GUI 题干'));
    const pub=await publish(ctx,cardName);
    assert.equal(pub.card.cardId,saved.cardId,'Publish created a second card instead of completing the draft');
    await exitEditorToList(ctx);
    await p.getByRole('checkbox',{name:'选择 '+cardName,exact:true}).check();
    await p.getByRole('button',{name:'学习选中卡片',exact:true}).click();
    await p.getByRole('heading',{name:cardName,exact:true}).waitFor();
    await p.getByRole('radio',{name:'甲正确',exact:true}).check();
    await p.getByLabel('独立思路',{exact:true}).fill('WIN-09 portable verified native GUI answer');
    await p.getByRole('button',{name:'揭示答案',exact:true}).click();
    const slider=p.getByRole('slider');await slider.press('End');
    for(let i=0;i<14;i++)await slider.press('ArrowLeft'); // 8.6/10 = Good
    assert.equal(await slider.getAttribute('aria-valuetext'),'8.6 分');
    await p.getByTestId('review-save-state').filter({hasText:'草稿已保存'}).waitFor();
    await p.getByRole('button',{name:'保存本次复盘',exact:true}).click();
    await p.getByRole('status').filter({hasText:'复盘已保存 · 自评 8.6'}).waitFor();
    const eventList=(await ctx.session.api.call('learning.history.list',pub.card)).items;
    assert.equal(eventList.length,1);
    const full=await ctx.session.api.call('learning.history.get',{...pub.card,eventId:eventList[0].eventId});
    assert.equal(full.scoreTenths,86);
    assert.equal(full.rating,'good');
    assert.equal(full.objectiveCorrect,true);
    const due=(await ctx.session.api.call('card.listSummary',{deckId:ctx.fixture.deck.id,limit:100}))
      .items.find(x=>x.cardId===pub.card.cardId).dueAt;
    assert.ok(due,'Formal native review must produce a scheduling due date');
    await p.getByRole('button',{name:'返回卡片列表',exact:true}).click();
    const reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
    const live=await ctx.session.api.call('card.getPublishedContent',pub.card);
    assert.equal(live.title,cardName);
    assert.deepEqual(live.payload,pub.content.payload);
    const savedEvents=(await ctx.session.api.call('learning.history.list',pub.card)).items;
    assert.equal(savedEvents.length,1);assert.equal(savedEvents[0].eventId,full.eventId);
    assert.equal((await ctx.session.api.call('card.listSummary',{deckId:ctx.fixture.deck.id,limit:100}))
      .items.find(x=>x.cardId===pub.card.cardId).dueAt,due);
    await enterCards(ctx);
    await p.getByRole('button',{name:'详情 '+cardName,exact:true}).click();
    await p.getByRole('article',{name:'卡片详情'}).getByRole('heading',{name:cardName}).waitFor();
    await p.getByRole('button',{name:'查看学习历史',exact:true}).click();
    await p.locator('.detail-history-list button').first().click();
    assert.ok((await p.getByRole('region',{name:'当次复盘证据'}).innerText()).includes('8.6'));
    integrity(ctx);
    const proof={schema:'ganksoft.v077/native-win09-host-1',caseId:id,
      os,zipSha256:zipHash,exeSha256:exeHash,package:{buildSha:build.sha,version:build.version},
      source:'EXTRACTED_PORTABLE_GANKSOFT_EXE',localOutcome:'PASS',
      attended:process.env.GANKSOFT_WIN_SUPERVISED==='1',at:new Date().toISOString(),
      workflow:{newCard:true,autoDraft:true,draftReopen:true,publishSameCard:true,
        formalReview:true,objectiveCorrect:true,scoreTenths:86,rating:'good',
        newPid:reboot.oldPid!==reboot.newPid,persistedEvent:true,dueOnRestart:true,
        guiHistory:true,contentMode:live.payload.mode},
      sealedSource:'Isolated synthetic606 fixture only; no user data'};
    recordLocalProof(out,'WIN-09-'+os.family+'-host-proof.json',proof);
    ctx.observations.checks.portable=proof;
    step(ctx,'Real packaged portable exe: GUI new→draft→publish→review→new PID, one-host proof written');
    await evidence(ctx);
    throw blocked('WIN-09 local '+os.family+' GUI PASS proof saved. Canonical PASS requires matching Win10 AND Win11 original ZIP evidence via win09-verify.mjs; single host must remain BLOCKED.');
  },{launch:portableLaunch});
}
