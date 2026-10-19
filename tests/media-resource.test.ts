import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { Transformer } from "@napi-rs/image";
import { openDatabase, transaction } from "./fixture.ts";
import { Application } from "../electron/application.ts";
import { stageImage, draftImage, saveQuestionImages, discardMediaDraft } from "../electron/modules/media/drafts.ts";
import { createMediaAsset, recoverMediaWrites, collectOrphanMedia } from "../electron/modules/media/service.ts";
import { mediaReferences } from "../electron/modules/media/references.ts";
import { readMediaAsset, pendingAssets } from "../electron/modules/media/repository.ts";
import { createBackup, stageBackup } from "../electron/infrastructure/backup.ts";

const pixel = () => Transformer.fromRgbaPixels(Buffer.from([5, 6, 7, 255]), 1, 1).pngSync();
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "gank-media-"));
  const db = openDatabase(join(dir, "ganksoft.sqlite"));
  const ctx = { db, dataDir: dir, now: () => new Date("2026-10-19T10:00:00Z") };
  return { dir, db, ctx, app: new Application(ctx), close() { db.close(); rmSync(dir, { force: true, recursive: true }); } };
}
test("media: same bytes share immutable resource; draft identities and scopes remain independent", () => {
  const f = fixture(); try {
    const a = stageImage(f.ctx, "question-default", "question", pixel(), "image/png");
    const b = stageImage(f.ctx, "资料分析", "question", pixel(), "image/png");
    assert.notEqual(a.id, b.id);
    const ma = draftImage(f.ctx, a.id), mb = draftImage(f.ctx, b.id);
    assert.equal(ma.assetId, mb.assetId); assert.equal(ma.file_name, mb.file_name);
    assert.equal(readMediaAsset(f.ctx, ma.assetId)?.pixelWidth, 1);
    assert.equal(readdirSync(join(f.dir, "attachments")).filter(n => n.endsWith(".png")).length, 1);
    assert.throws(() => draftImage(f.ctx, a.id, "资料分析"));
    assert.throws(() => discardMediaDraft(f.ctx, a.id, "资料分析"));
    discardMediaDraft(f.ctx, a.id, "question-default");
    recoverMediaWrites(f.ctx);
    assert.deepEqual(collectOrphanMedia(f.ctx, true), []);
    assert.deepEqual(readFileSync(join(f.dir, "attachments", mb.file_name)), pixel());
  } finally { f.close(); }
});
test("media: invalid purpose/deck/MIME/content never publishes a resource", () => {
  const f = fixture(); try {
    for (const [deck, purpose, bytes, mime] of [
      ["missing", "question", pixel(), "image/png"], ["question-default", "unknown", pixel(), "image/png"],
      ["question-default", "question", pixel(), "image/jpeg"], ["question-default", "question", Buffer.from("bad"), "image/png"],
    ] as const) assert.throws(() => stageImage(f.ctx, deck, purpose, bytes, mime));
    assert.equal(mediaReferences(f.ctx).length, 0);
    assert.equal(pendingAssets(f.ctx).length, 0);
  } finally { f.close(); }
});
test("media: SQL failure and interrupted process recover uncommitted files without touching committed shared bytes", () => {
  const f = fixture(); try {
    assert.throws(() => transaction(f.db, () => {
      stageImage(f.ctx, "question-default", "question", pixel(), "image/png"); throw Error("rollback");
    }));
    assert.equal(mediaReferences(f.ctx).length, 0);
    assert.equal(recoverMediaWrites(f.ctx).compensated, 1);
    assert.equal(collectOrphanMedia(f.ctx).length, 0);
    const a = stageImage(f.ctx, "question-default", "question", pixel(), "image/png");
    const file = draftImage(f.ctx, a.id).file_name;
    recoverMediaWrites(f.ctx);
    const script = `import { openDatabase } from './electron/infrastructure/database.ts';
      import { stageImage } from './electron/modules/media/drafts.ts';
      const db=openDatabase(process.argv[1]); db.exec('BEGIN IMMEDIATE');
      stageImage({db,dataDir:process.argv[2],now:()=>new Date()},'question-default','response',Buffer.from(process.argv[3],'base64'),'image/png');
      process.exit(23);`;
    const child = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script,
      join(f.dir, "ganksoft.sqlite"), f.dir, pixel().toString("base64")], { encoding: "utf8" });
    assert.equal(child.status, 23, child.stderr);
    assert.deepEqual(recoverMediaWrites(f.ctx), { recovered: 0, compensated: 0 });
    assert.deepEqual(readFileSync(join(f.dir, "attachments", file)), pixel());
  } finally { f.close(); }
});
test("media: crash after publishing new bytes is compensated on restart", () => {
  const f = fixture(); try {
    const script = `import { openDatabase } from './electron/infrastructure/database.ts';
      import { stageImage } from './electron/modules/media/drafts.ts';
      const db=openDatabase(process.argv[1]); db.exec('BEGIN IMMEDIATE');
      stageImage({db,dataDir:process.argv[2],now:()=>new Date()},'question-default','question',Buffer.from(process.argv[3],'base64'),'image/png'); process.exit(23);`;
    const child = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script,
      join(f.dir, "ganksoft.sqlite"), f.dir, pixel().toString("base64")], { encoding: "utf8" });
    assert.equal(child.status, 23, child.stderr);
    assert.equal(recoverMediaWrites(f.ctx).compensated, 1);
    assert.equal(readdirSync(join(f.dir, "attachments")).filter(n => n.endsWith(".png")).length, 0);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM settings WHERE key LIKE 'media-asset:%'").get()?.n, 0);
  } finally { f.close(); }
});
test("media: damaged immutable data and recovery log reject without overwriting or deleting evidence", () => {
  const f = fixture(); try {
    const a = stageImage(f.ctx, "question-default", "question", pixel(), "image/png"), m = draftImage(f.ctx, a.id);
    const path = join(f.dir, "attachments", m.file_name);
    writeFileSync(path, "damaged");
    assert.throws(() => createMediaAsset(f.ctx, pixel(), "image/png"));
    assert.throws(() => recoverMediaWrites(f.ctx)); assert.equal(readFileSync(path, "utf8"), "damaged");
    const log = pendingAssets(f.ctx)[0].path; writeFileSync(log, "{}");
    assert.throws(() => recoverMediaWrites(f.ctx)); assert.ok(existsSync(log));
  } finally { f.close(); }
});
test("media: card binding consumes draft reference; history protects bytes after removing current instance", () => {
  const f = fixture(); try {
    const q = f.app.handle("question.save", { module: "question-default", stem: "test", answer: "A" }) as string;
    const a = stageImage(f.ctx, "question-default", "question", pixel(), "image/png"), m = draftImage(f.ctx, a.id);
    transaction(f.db, () => saveQuestionImages(f.ctx, q, "question-default", [{ id: a.id, role: "question" }]));
    assert.throws(() => draftImage(f.ctx, a.id));
    assert.equal(mediaReferences(f.ctx).filter(r => r.ownerType === "question").length, 1);
    // The production history shape is queried here; the full review workflow is covered by existing v072 tests.
    f.db.prepare("INSERT INTO attempts(id,question_id,created_at,answer,correct,basis,understanding,score,effective,algorithm,parameters,question_version,answer_snapshot,question_snapshot) VALUES (?,?,?,'A',1,'independent',2,3,1,'test','{}',1,'A',?)")
      .run("history", q, f.ctx.now().toISOString(), JSON.stringify({ assets: [{ ...m, role: "question" }] }));
    transaction(f.db, () => saveQuestionImages(f.ctx, q, "question-default", []));
    recoverMediaWrites(f.ctx); assert.deepEqual(collectOrphanMedia(f.ctx, true), []);
    f.db.prepare("DELETE FROM attempts").run();
    assert.deepEqual(collectOrphanMedia(f.ctx, false), [m.file_name]);
    assert.ok(existsSync(join(f.dir, "attachments", m.file_name)));
    assert.deepEqual(collectOrphanMedia(f.ctx, true), [m.file_name]);
    assert.equal(existsSync(join(f.dir, "attachments", m.file_name)), false);
  } finally { f.close(); }
});
test("media: committed draft resource and hash metadata survive complete backup and restore", async () => {
  const f = fixture(); try {
    const a = stageImage(f.ctx, "question-default", "response", pixel(), "image/png"), m = draftImage(f.ctx, a.id);
    await createBackup(f.db, f.dir, join(f.dir, "backup.zip"));
    await stageBackup(join(f.dir, "backup.zip"), join(f.dir, "restored"));
    const db = openDatabase(join(f.dir, "restored", "ganksoft.sqlite"));
    try {
      const ctx = { ...f.ctx, db, dataDir: join(f.dir, "restored") };
      assert.deepEqual(readMediaAsset(ctx, m.assetId), readMediaAsset(f.ctx, m.assetId));
      assert.equal(draftImage(ctx, a.id).assetId, m.assetId);
    } finally { db.close(); }
  } finally { f.close(); }
});
