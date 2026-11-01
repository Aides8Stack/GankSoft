// Framework feasibility only: never promotes a business CASE or edits the ledger.
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {executeCase,enterCards,restart} from './helpers.mjs';
const out=resolve('validation-results/v077/m0-smoke');
let fixtureRoot;
await executeCase('M0-SMOKE',out,async ctx=>{
  fixtureRoot=ctx.fixture.root;
  await enterCards(ctx);
  await ctx.session.page.screenshot({path:resolve(out,'production-ui.png')});
  const reboot=await restart(ctx);
  await enterCards(ctx);
  assert.ok((await ctx.session.api.call('card.listSummary',
    {deckId:ctx.fixture.deck.id,limit:100})).items.some(x=>x.cardId===ctx.fixture.card.cardId));
  return {steps:['production Vue ready','visible cards controls','fresh PID','synthetic persisted card readback'],
    reboot,evidence:['production-ui.png']};
});
if(fixtureRoot && !process.exitCode)assert.equal(existsSync(fixtureRoot),false);
