import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase,DEFAULT_QUESTION_DECK } from '../electron/infrastructure/database.ts';
import { Application } from '../electron/application.ts';
import { createApplicationProtocol } from '../electron/protocol/gateway.ts';
import { createClient } from '../shared/protocol/client.ts';
test('DAT-06, DUE-09,12,13, SCH-12 configuration commands use validated atomic receipts and queries never write',async()=>{
 const db=openDatabase(':memory:');const app=new Application({db,dataDir:'',now:()=>new Date('2026-10-19T00:00:00Z')});const gateway=createApplicationProtocol(app);const client=createClient(r=>gateway.execute(r));
 try{
 await client.call('app.capabilities',{});const deckId=DEFAULT_QUESTION_DECK;
 const before=db.prepare('SELECT total_changes() n').get()!.n;
 const config=await client.call('policy.config.get',{deckId});
 await client.call('policy.config.preview',{deckId});await client.call('policy.previewQueue',{deckId});
 assert.equal(db.prepare('SELECT total_changes() n').get()!.n,before);
 const req=client.prepare('policy.config.save',{deckId,expectedRevision:0,config:{...config.config,desiredRetention:.95}});
 const first=await client.send(req);assert.deepEqual(await client.send(req),first);
 assert.equal(db.prepare('SELECT count(*) n FROM deck_review_config_v2').get()!.n,1);
 await assert.rejects(()=>client.call('policy.config.save',{deckId,expectedRevision:0,config:config.config}));
 await assert.rejects(()=>client.call('policy.config.save',{deckId,expectedRevision:1,config:{...config.config,desiredRetention:.99}}));
 assert.equal((await client.call('policy.config.get',{deckId})).revision,1);
 const view=await client.call('policy.config.preview',{deckId});const apply=client.prepare('policy.config.applyExisting',{previewToken:view.previewToken});
 const result=await client.send(apply);assert.deepEqual(await client.send(apply),result);
 const status=await client.call('operation.status',{requestId:apply.requestId,method:apply.method,payload:apply.payload});assert.equal(status.state,'committed');
 }finally{db.close()}
});
