import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {aiFixture,review,immutableData} from './fixtures/ai-adjustment-v077.ts';
import {writeAnalysisZip} from '../electron/modules/workspace-unified/analysis-zip.ts';
import {readContainer} from '../electron/infrastructure/containers.ts';
import {Manifest} from '../shared/protocol/ai-analysis.ts';
test('W5-08 W4 next export reads effective AI due and current policy while retaining original FSRS state',async()=>{const a=await aiFixture();try{
 await review(a);const old=(await a.client.call('card.listSummary',{deckId:a.deckId})).items[0].dueAt!,dueAt=new Date(Date.parse(old)-1000).toISOString(),p=await a.prepare([{actionId:'due',type:'card.schedule.advance_due',cardId:a.ids[0],dueAt,reason:'合成提前'},{actionId:'max',type:'card.policy.max_interval.set',cardId:a.ids[0],value:30,reason:'合成策略'}]);const before=immutableData(a.f);await a.client.call('learning.aiAdjustment.apply',p);const path=join(a.f.root,'after-ai.zip');await writeAnalysisZip(a.f.ctx,{deckId:a.deckId,jobId:randomUUID(),date:{range:'all'},includeImages:false},path,{cancelled:false,progress:{phase:'idle',cardCount:0,eventCount:0,bytes:0}});const files=await readContainer(path),manifest=Manifest.parse(JSON.parse(files.get('data/manifest.json')!.toString())),entry=[...files].find(([name])=>name.startsWith('data/cards/'))!,card=JSON.parse(entry[1].toString()).items[0];assert.equal(manifest.dataRevision,a.client.snapshot()!.dataRevision);assert.equal(card.due.dueAt,dueAt);assert.equal(card.schedule.state.due,old);assert.equal(card.policy.maxIntervalDays,30);assert.equal(immutableData(a.f),before);
 }finally{a.close();}});
