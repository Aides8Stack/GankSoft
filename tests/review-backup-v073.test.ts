import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase,SCHEMA_VERSION } from '../electron/infrastructure/database.ts';
import { createBackup,stageBackup } from '../electron/infrastructure/backup.ts';
import { reviewConfig,saveConfig,saveDiagnosisRule } from '../electron/modules/review/config-service.ts';
import { validateBusinessData } from '../electron/infrastructure/integrity.ts';
test('DAT-01..03 schema601 upgrades without policy loss, new configs and audits survive full ZIP restore',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'gank073-restore-'));let db=openDatabase(join(dir,'db.sqlite'));
 try{
 const deck=String(db.prepare("SELECT id FROM decks WHERE kind='question'").get()!.id);
 db.prepare('UPDATE deck_review_policies SET daily_limit=20,max_interval_days=30 WHERE deck_id=?').run(deck);
 db.exec('DROP TABLE attempt_evidence_snapshots;DROP TABLE deck_review_config_v2;DROP TABLE knowledge_specialty_prefs;DROP TABLE diagnosis_config;DROP TABLE review_due_overrides;DROP TABLE review_config_operations;PRAGMA user_version=601');db.close();
 db=openDatabase(join(dir,'db.sqlite'));assert.equal(db.prepare('PRAGMA user_version').get()!.user_version,SCHEMA_VERSION);
 const ctx={db,dataDir:dir,now:()=>new Date('2026-10-19T00:00:00Z')};const c=reviewConfig(ctx,deck);assert.equal(c.maxIntervalDays,30);assert.equal(c.dailyLimit,20);assert.equal(c.config.desiredRetention,.9);
 saveConfig(ctx,{deckId:deck,expectedRevision:0,config:{...c.config,desiredRetention:.95}});
 saveDiagnosisRule(ctx,{expectedRevision:0,rule:{evidenceHalfLifeDays:45}});validateBusinessData(db);
 const tables=['deck_review_config_v2','knowledge_specialty_prefs','diagnosis_config','review_due_overrides','review_config_operations','attempt_evidence_snapshots','audits'];
 const before=tables.map(t=>db.prepare('SELECT * FROM '+t).all());
 await createBackup(db,dir,join(dir,'backup.zip'));await stageBackup(join(dir,'backup.zip'),join(dir,'restored'));
 const restored=openDatabase(join(dir,'restored','ganksoft.sqlite'));try{for(const [i,t]of tables.entries())assert.deepEqual(restored.prepare('SELECT * FROM '+t).all(),before[i])}finally{restored.close()}
 }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});
