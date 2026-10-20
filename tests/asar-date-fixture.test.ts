import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

// Each child starts a new host timezone, SQLite database and scheduler. Exercise
// the actual smoke fixture and protocol, rather than reproducing its seeding logic.
const worker = `
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, DEFAULT_QUESTION_DECK as Q } from './electron/infrastructure/database.ts';
import { Application } from './electron/application.ts';
import { createApplicationProtocol } from './electron/protocol/gateway.ts';
import { createClient } from './shared/protocol/client.ts';
import { seedDateBoundaryReviews } from './tools/fixtures/v070-date-reviews.ts';
import { calendarDay } from './shared/calendar.ts';
const dir = mkdtempSync(join(tmpdir(), 'gank-date fixture-日期-'));
const path = join(dir, 'db.sqlite');
let db = openDatabase(path), now = new Date('2026-10-18T08:00:00Z');
try {
  const initialZone = db.prepare("SELECT value FROM settings WHERE key='studyTimezone'").get().value;
  const model = new Application({db, dataDir:dir, now:()=>new Date(now)});
  const card = model.handle('question.save', {module:Q,stem:'日期边界',answer:'B'});
  seedDateBoundaryReviews(model, db, card, (iso)=>{now=new Date(iso)});
  const rows = db.prepare('SELECT created_at,effective,score,self_score FROM attempts ORDER BY created_at').all();
  const plan = db.prepare('SELECT due_at,algorithm FROM plans WHERE question_id=?').get(card);
  const scheduling = db.prepare('SELECT * FROM scheduling').all();
  const client = createClient((r)=>createApplicationProtocol(model).execute(r));
  await client.call('app.capabilities', {});
  const summary = await client.call('analytics.collection',{deckId:Q,range:'custom',start:'2026-10-18',end:'2026-10-18'});
  const adjacent = [];
  for (const day of ['2026-10-17','2026-10-18','2026-10-19']) {
    const r=await client.call('analytics.collection',{deckId:Q,range:'custom',start:day,end:day});
    adjacent.push({day,effective:r.summary.effective,practice:r.summary.practice,total:r.daily.reduce((n,d)=>n+d.count,0)});
  }
  const invalid = await client.call('analytics.collection',{deckId:Q,range:'custom',start:'2026-10-19',end:'2026-10-18'}).then(()=>false,()=>true);
  // Changing a reporting window/zone never retroactively changes saved credits.
  db.prepare("UPDATE settings SET value='UTC' WHERE key='studyTimezone'").run();
  const utc = await client.call('analytics.collection',{deckId:Q,range:'custom',start:'2026-10-18',end:'2026-10-18'});
  const unchanged = JSON.stringify(rows)===JSON.stringify(db.prepare('SELECT created_at,effective,score,self_score FROM attempts ORDER BY created_at').all()) && JSON.stringify(scheduling)===JSON.stringify(db.prepare('SELECT * FROM scheduling').all());
  db.prepare("UPDATE settings SET value='Asia/Shanghai' WHERE key='studyTimezone'").run();
  db.close(); db=openDatabase(path);
  const reopened = new Application({db,dataDir:dir,now:()=>new Date(now)});
  const reopenedClient=createClient((r)=>createApplicationProtocol(reopened).execute(r));
  await reopenedClient.call('app.capabilities',{});
  const persisted=await reopenedClient.call('analytics.collection',{deckId:Q,range:'custom',start:'2026-10-18',end:'2026-10-18'});
  console.log(JSON.stringify({initialZone,rows,plan,summary,adjacent,invalid,utc:utc.summary,unchanged,persisted:persisted.summary,days:rows.map(r=>calendarDay(new Date(r.created_at),'Asia/Shanghai')),schema:db.prepare('PRAGMA user_version').get().user_version}));
} finally {db.close();rmSync(dir,{recursive:true,force:true});}
`;
for (const zone of ["UTC", "Asia/Shanghai", "America/New_York"]) {
  test(`ASAR date fixture is independent of host ${zone}, preserves credits across reporting zones and restart`, () => {
    const r = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", worker],
      {
        cwd: new URL("..", import.meta.url),
        env: { ...process.env, TZ: zone },
        encoding: "utf8",
        timeout: 20000,
      },
    );
    assert.equal(r.status, 0, r.stderr);
    const d = JSON.parse(r.stdout);
    assert.equal(d.initialZone, zone);
    assert.deepEqual(
      d.rows.map((r: any) => r.effective),
      [1, 0, 1, 0],
    );
    assert.deepEqual(
      d.rows.map((r: any) => r.created_at),
      [
        "2026-10-17T15:59:59.000Z",
        "2026-10-17T16:00:00.000Z",
        "2026-10-18T15:59:59.000Z",
        "2026-10-18T16:00:00.000Z",
      ],
    );
    assert(d.rows.every((r: any) => r.score === 1 && r.self_score === 3));
    assert.deepEqual(d.days, [
      "2026-10-17",
      "2026-10-18",
      "2026-10-18",
      "2026-10-19",
    ]);
    assert.deepEqual(d.summary.window, {
      start: "2026-10-18",
      end: "2026-10-18",
      timeZone: "Asia/Shanghai",
    });
    assert.equal(d.summary.summary.effective, 1);
    assert.equal(d.summary.summary.practice, 1);
    assert.equal(d.summary.summary.failures, 1);
    assert.deepEqual(d.summary.daily, [{ date: "2026-10-18", count: 2 }]);
    assert.deepEqual(d.adjacent, [
      { day: "2026-10-17", effective: 1, practice: 0, total: 1 },
      { day: "2026-10-18", effective: 1, practice: 1, total: 2 },
      { day: "2026-10-19", effective: 0, practice: 1, total: 1 },
    ]);
    assert.equal(d.utc.effective, 1);
    assert.equal(d.utc.practice, 1);
    assert.equal(d.invalid, true);
    assert.equal(d.unchanged, true);
    assert.deepEqual(d.persisted, d.summary.summary);
    assert.equal(d.plan.due_at, "2026-10-18T16:00:59.000Z");
    assert.match(d.plan.algorithm, /FSRS/);
    assert.equal(d.schema, 604);
  });
}
