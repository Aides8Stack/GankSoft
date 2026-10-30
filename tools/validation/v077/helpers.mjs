import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {join, dirname, basename} from 'node:path';
import {tmpdir} from 'node:os';
import {b2Fixture} from '../../../tests/fixtures/ganksoft/b2.ts';
import {stop} from '../r7/support.ts';
import {_electron as electron} from 'playwright-core';
import {createClient} from '../../../shared/protocol/client.ts';
import {args,require} from '../r5/support.ts';
import {resolve} from 'node:path';
async function launch(f) {
  const app=await electron.launch({executablePath:require('electron'),
    args:[...args,resolve('tools/validation/v077/host.cjs')],
    env:{...process.env,TZ:'Asia/Shanghai',GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:f.data,
      GANK_R6_MAIN:resolve('dist-electron/electron/main.js')},timeout:20000});
  const page=await app.firstWindow();page.setDefaultTimeout(15000);
  await page.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();
  const api=createClient(r=>page.evaluate(v=>window.gank.protocol(v),r));
  await api.call('app.capabilities',{});
  return {app,page,api};
}

export async function executeCase(id, out, fn, options = {}) {
  mkdirSync(out, {recursive:true});
  const errors = [];
  const ctx = {id, out, fixture:null, session:null, errors};
  let report = {id,status:'FAIL',layer:'electronUi',platform:process.platform,
    clipboardEvidence:'NONE',steps:[],evidence:[]};
  try {
    // Fixture writes are allowed. All user actions in fn MUST use the real GUI.
    ctx.fixture = await b2Fixture({metadata:join(out,'fixture.json')});
    if(options.fixtureSetup)await options.fixtureSetup(ctx.fixture);
    ctx.observations={steps:[],checks:{}};
    ctx.session = await launch(ctx.fixture);
    ctx.session.page.on('pageerror', error => errors.push(String(error)));
    const detail = await fn(ctx);
    assert.deepEqual(errors,[], 'Renderer emitted uncaught page errors');
    report = {...report,status:'PASS',actual:'UI actions + persisted readback succeeded',
      ...detail};
  } catch (error) {
    report = {...report,status:ctx.session?'FAIL':'BLOCKED',kind:ctx.session?'UNCLASSIFIED_TEST_FAILURE':'TEST_ENVIRONMENT',actual:String(error?.stack ?? error),observations:ctx.observations};
    if(ctx.session?.page){try{writeFileSync(join(out,'failure-ui.txt'),await ctx.session.page.locator('body').innerText());report.evidence.push('failure-ui.txt');}catch{}}
    if(ctx.collectEvidence){try{report.diagnostics=await ctx.collectEvidence();writeFileSync(join(out,'diagnostics.json'),JSON.stringify(report.diagnostics,null,2)+'\n');report.evidence.push('diagnostics.json');}catch(e){report.diagnosticError=String(e);}}
    if (ctx.session?.page) {
      try {await ctx.session.page.screenshot({path:join(out,'failure.png'),timeout:3000});
        report.evidence.push('failure.png');} catch {}
    }
    process.exitCode = 1;
  } finally {
    let closed = !ctx.session;
    if (ctx.session && ctx.fixture) {
      try {await stop(ctx.session.app, ctx.fixture.data); closed = true;}
      catch (error) {
        report.status='FAIL';
        report.cleanupError=String(error);
        process.exitCode=1;
      }
    }
    if (ctx.fixture && closed) {
      try {
        assert.equal(dirname(ctx.fixture.root),tmpdir());
        assert.ok(basename(ctx.fixture.root).startsWith('gank-b2-lifecycle-'));
        assert.equal(ctx.fixture.data,join(ctx.fixture.root,'synthetic606'));
        rmSync(ctx.fixture.root,{recursive:true,force:true});
        report.cleanup='REMOVED_ISOLATED_FIXTURE';
      } catch (error) {
        report.status='FAIL'; report.cleanupError=String(error); process.exitCode=1;
      }
    }
    writeFileSync(join(out,'case.json'),JSON.stringify(report,null,2)+'\n');
  }
}

export async function enterCards(ctx) {
  const p = ctx.session.page;
  const name = ctx.fixture.deck.name;
  const pattern = new RegExp('^' + name.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&') + '，');
  await p.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:pattern}).click();
  await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',
    {name:'所有卡片',exact:true}).click();
  await p.getByRole('heading',{name:'所有卡片',exact:true}).waitFor();
}

export async function restart(ctx) {
  if(ctx.collectEvidence){ctx.beforeRestart??=[];ctx.beforeRestart.push(await ctx.collectEvidence());}
  const previous = ctx.session.app.process().pid;
  await stop(ctx.session.app,ctx.fixture.data);
  ctx.session = null;
  ctx.session = await launch(ctx.fixture);
  ctx.session.page.on('pageerror',e=>ctx.errors.push(String(e)));
  const current = ctx.session.app.process().pid;
  assert.notEqual(current,previous,'Fresh Electron process required for durable readback');
  return {oldPid:previous,newPid:current};
}

export async function awaitDraft(ctx,title,expectedField,expectedText, checkEditor=true) {
  const scope = {deckId:ctx.fixture.deck.id};
  const until = Date.now()+15000;
  let last = 'not returned';
  while (Date.now()<until) {
    const summaries = (await ctx.session.api.call('draft.listSummary',scope)).items;
    const found = summaries.find(d=>d.title===title);
    if (found) {
      const saved = await ctx.session.api.call('draft.get',
        {...scope,cardId:found.cardId});
      if (saved?.title===title && (!expectedField ||
          saved.payload?.fields?.[expectedField]?.includes(expectedText))) {
        if(checkEditor)await ctx.session.page.locator('[data-save-state="clean"]').waitFor({timeout:5000});
        return saved;
      }
      last=JSON.stringify({summary:found,storedField:saved?.payload?.fields?.[expectedField]});
    }
    await new Promise(resolve=>setTimeout(resolve,100)); // bounded condition poll; not a blind test pass delay
  }
  throw Error('DRAFT_NOT_DURABLY_READABLE: '+title+'; '+last);
}

export async function draftBoxOpen(ctx,title) {
  const p=ctx.session.page;
  await p.getByRole('button',{name:'草稿箱',exact:true}).click();
  const box=p.getByRole('navigation',{name:'已保存草稿'});
  await box.waitFor();
  const button=box.getByRole('button',{name:title,exact:true});
  await button.waitFor();
  await p.screenshot({path:join(ctx.out,'draft-box.png')});
  await button.click();
  await p.getByTestId('draft-title').waitFor();
}

export async function exitEditorToList(ctx) {
  const p=ctx.session.page;
  await p.getByRole('button',{name:/返回上一页/}).click();
  await p.getByRole('heading',{name:'所有卡片',exact:true}).waitFor();
}

export async function assertEditor(ctx,title,field,text) {
  const p=ctx.session.page;
  assert.equal(await p.getByTestId('draft-title').inputValue(),title);
  const visible = await p.locator('[data-editor-field="'+field+'"] .ProseMirror[contenteditable=true]').innerText();
  assert.ok(visible.includes(text),'Editor did not restore expected '+field+': '+visible);
}
