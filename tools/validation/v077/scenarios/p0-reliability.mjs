import assert from 'node:assert/strict';
import {createClient} from '../../../../shared/protocol/client.ts';
import {executeCase,enterCards,awaitDraft,exitEditorToList} from '../helpers.mjs';
import {editor,evidence,step} from './core-support.mjs';
import {trace,reboot,snapshot,title,integrity,receipts,arm,clear} from './system-support.mjs';
import {reopen,protectedTables} from './p0-support.mjs';
const id=process.argv[2],out=process.argv[3];if(!['FAULT-04','FAULT-14'].includes(id))throw Error('UNKNOWN_P0_RELIABILITY');
await executeCase(id,out,async ctx=>{
 await trace(ctx);await enterCards(ctx);const p=ctx.session.page;await p.getByRole('button',{name:'编辑 '+title,exact:true}).click();await editor(ctx,'body').fill('T2-A baseline');await awaitDraft(ctx,title,'body','T2-A baseline');const before=snapshot(ctx.fixture);
 if(id==='FAULT-04'){
  await ctx.session.app.evaluate(()=>globalThis.v077Faults.arm('draft.save','conflict'));
  await editor(ctx,'body').fill('T2-A stale first GUI');await p.locator('[data-save-state=conflict],[data-save-state=error]').waitFor();const newer=await ctx.session.api.call('draft.get',ctx.fixture.card);assert.equal(newer.payload.fields.body,'T2-A newer competing flow');assert.match(await p.locator('[role=alert],[data-save-state=conflict],[data-save-state=error]').allTextContents().then(x=>x.join(' ')),/冲突|修订|conflict|REVISION/i);const requests=await receipts(ctx,'draft.save');assert.ok(requests.some(x=>x.competing?.ok));ctx.observations.checks.conflict={newer,requests,feedback:await p.locator('[role=alert]').allTextContents(),injection:'Real protocol handler competing write injected before stale GUI draft.save; no production handler substituted'};await reboot(ctx);await reopen(ctx,title,'body','T2-A newer competing flow');assert.deepEqual((await ctx.session.api.call('draft.get',ctx.fixture.card)).payload,newer.payload);step(ctx,'GUI stale save faces actual competing revision committed by fault harness; visible conflict and newer content preserved across new PID');
 }else{
  await arm(ctx,'draft.save');await editor(ctx,'body').fill('T2-A retry exact text');await p.locator('[data-save-state=error]').waitFor();assert.deepEqual(snapshot(ctx.fixture),before);await clear(ctx);await p.getByTestId('save-draft').click();const d=await awaitDraft(ctx,title,'body','T2-A retry exact text'),after=snapshot(ctx.fixture);assert.equal(d.revision,(await ctx.session.api.call('draft.get',ctx.fixture.card)).revision);assert.deepEqual(protectedTables(after),protectedTables(before));assert.deepEqual(after.media,before.media);assert.equal((await receipts(ctx,'draft.save')).filter(x=>x.ok&&!x.injected).length,2);await exitEditorToList(ctx);await reboot(ctx);await reopen(ctx,title,'body','T2-A retry exact text');assert.deepEqual(snapshot(ctx.fixture),after);step(ctx,'Pre-handler failure leaves exact SQLite/media snapshot; GUI retry commits one revision and restart preserves it');
 }
 integrity(ctx);return evidence(ctx);
});
