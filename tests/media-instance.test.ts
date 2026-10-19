import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Transformer } from "@napi-rs/image";
import { openDatabase } from "./fixture.ts";
import { Application } from "../electron/application.ts";
import { stageImage, draftImage } from "../electron/modules/media/drafts.ts";
import { createClient } from "../shared/protocol/client.ts";
import { createApplicationProtocol } from "../electron/protocol/gateway.ts";
import { imageLayout, resizedWidth } from "../shared/image-node.ts";
import { questionContentSnapshot } from "../electron/modules/questions/content.ts";
const pixel = () => Transformer.fromRgbaPixels(Buffer.from([30, 40, 50, 255]), 1, 1).pngSync();
test("image layout: bounded finite integer widths, strict properties and proportional width arithmetic", () => {
  assert.deepEqual(imageLayout(), { widthPx: 360, alignment: "left", fit: "contain" });
  for (const widthPx of [0, 63, 2401, NaN, Infinity, 80.5, "200"])
    assert.throws(() => imageLayout({ widthPx }));
  assert.throws(() => imageLayout({ alignment: "bad" }));
  assert.throws(() => imageLayout({ path: "C:/secret.png" }));
  assert.equal(resizedWidth(360, 120), 480);
  assert.equal(resizedWidth(100, -500), 64);
  assert.equal(resizedWidth(100, 9999), 2400);
});
test("image instances: shared source has independent persistent layouts, stable identity and atomic validation", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gank-instance-")); let db = openDatabase(join(dir, "ganksoft.sqlite"));
  try {
    let ctx = { db, dataDir: dir, now: () => new Date() }, app = new Application(ctx);
    let client = createClient(createApplicationProtocol(app).execute);
    await client.call("app.capabilities", {});
    const a = stageImage(ctx, "question-default", "question", pixel(), "image/png"),
      b = stageImage(ctx, "question-default", "question", pixel(), "image/png");
    const file = draftImage(ctx, a.id).file_name;
    const payload = { deckId: "question-default", stem: "Independent", answer: "A" as const,
      images: [{ id: a.id, role: "question" as const, layout: imageLayout({ widthPx: 200 }) },
        { id: b.id, role: "question" as const, layout: imageLayout({ widthPx: 700, alignment: "right" }) }] };
    const id = await client.call("content.question.save", payload);
    const snapshot = app.snapshot().questions.find(q => q.id === id)!;
    assert.deepEqual(snapshot.assets.map(a => a.layout?.widthPx), [200, 700]);
    assert.equal(snapshot.assets[0].assetId, snapshot.assets[1].assetId);
    assert.notEqual(snapshot.assets[0].instanceId, snapshot.assets[1].instanceId);
    const before = questionContentSnapshot(ctx, db.prepare("SELECT * FROM questions WHERE id=?").get(id));
    await client.call("content.question.save", { ...payload, id, expectedRevision: snapshot.version,
      images: [{ ...payload.images[0], layout: imageLayout({ widthPx: 400, alignment: "center" }) }, payload.images[1]] });
    assert.equal(before.assets[0].layout.widthPx, 200);
    assert.equal(app.snapshot().questions.find(q => q.id === id)!.assets[1].layout?.widthPx, 700);
    const counts = JSON.stringify(db.prepare("SELECT * FROM settings WHERE key LIKE 'image-layout:%'").all());
    await assert.rejects(client.call("content.question.save", { ...payload, id,
      images: [{ ...payload.images[0], layout: { ...imageLayout(), widthPx: -5 } }] }));
    assert.equal(JSON.stringify(db.prepare("SELECT * FROM settings WHERE key LIKE 'image-layout:%'").all()), counts);
    db.close(); db = openDatabase(join(dir, "ganksoft.sqlite"));
    ctx = { ...ctx, db }; app = new Application(ctx); client = createClient(createApplicationProtocol(app).execute);
    await client.call("app.capabilities", {});
    const restored = (await client.call("workspace.read", { deckId: "question-default", sections: ["content"] })).questions.find(q => q.id === id)!;
    assert.deepEqual(restored.assets.map(a => a.layout?.widthPx), [400, 700]);
    assert.deepEqual(readFileSync(join(dir, "attachments", file)), pixel());
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});
