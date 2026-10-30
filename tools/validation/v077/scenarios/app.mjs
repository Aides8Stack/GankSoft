import assert from 'node:assert/strict';
import {executeCase,restart} from '../helpers.mjs';
import {observe,evidence,step} from './core-support.mjs';
const id=process.argv[2],out=process.argv[3];
if(id!=='ENV-01'||!out)throw Error('UNSUPPORTED_APP_CASE');
await executeCase(id,out,async ctx=>{
  await observe(ctx);
  assert.equal(ctx.session.page.url(),'gank-app://ui/index.html');
  await ctx.session.page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
  const before=await ctx.session.api.call('workspace.catalog',{});
  assert.ok(before.items.some(x=>x.id===ctx.fixture.deck.id));
  step(ctx,'Production Electron opens learning home on isolated Schema606');
  const reboot=await restart(ctx);await observe(ctx);
  await ctx.session.page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
  assert.deepEqual(await ctx.session.api.call('workspace.catalog',{}),before);
  step(ctx,'Graceful exit releases writer lock; new PID opens same home/catalog');
  return {...await evidence(ctx),reboot,limitation:'Linux Electron; Windows portable startup remains NOT_RUN'};
});
