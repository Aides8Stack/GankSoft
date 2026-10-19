import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Transformer } from "@napi-rs/image";
import { openDatabase } from "./fixture.ts";
import { Application } from "../electron/application.ts";
import { createApplicationProtocol } from "../electron/protocol/gateway.ts";
import { createClient } from "../shared/protocol/client.ts";
import { stageImage } from "../electron/modules/media/drafts.ts";
import { imageLayout, defaultImageEdit, imagePresentation } from "../shared/image-node.ts";
import { assertWireValue } from "../shared/protocol/data.ts";
import { mediaThumbnail } from "../electron/modules/media/thumbnail.ts";

test("instance edits: strict crop/annotation limits, quarter-turn geometry and rebuildable thumbnails preserve source", () => {
  const edit = { ...defaultImageEdit(), rotation: 90 as const, flipX: true, crop: { x: .25, y: 0, width: .5, height: 1 }, annotations: [{ text: "<script>literal</script>", x: .1, y: .2, color: "#d32f2f" as const }] };
  const layout = imageLayout({ widthPx: 480, edit });
  assert.deepEqual(layout.edit, edit);
  assertWireValue(imageLayout({ ...layout, edit: undefined }));
  assert.equal(Object.hasOwn(imageLayout({edit:undefined}), "edit"), false);
  assert.deepEqual([imagePresentation(800, 200, edit).width, imagePresentation(800, 200, edit).height], [200, 400]);
  for (const bad of [ { ...edit, rotation: 45 }, { ...edit, crop: { x: .9, y: 0, width: .5, height: 1 } }, { ...edit, annotations: [{text:"x",x:0,y:0,color:"url(x)"}] } ]) assert.throws(() => imageLayout({edit: bad}));
  const bytes = Transformer.fromRgbaPixels(Buffer.alloc(4 * 1400 * 2, 255), 1400, 2).pngSync(), original = Buffer.from(bytes);
  const preview = mediaThumbnail(bytes, "image/png");
  assert.equal(new Transformer(preview).metadataSync().width, 1280);
  assert.deepEqual(mediaThumbnail(bytes, "image/png"), preview); assert.deepEqual(bytes, original);
});

test("replacement: scoped draft preserves identity/layout, immutable history and original bytes, and rejects reuse atomically", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gank-edit-")), db = openDatabase(join(dir, "ganksoft.sqlite"));
  try {
    const ctx = { db, dataDir: dir, now: () => new Date() }, app = new Application(ctx), client = createClient(createApplicationProtocol(app).execute);
    await client.call("app.capabilities", {});
    const bytes = Transformer.fromRgbaPixels(Buffer.from([1, 2, 3, 255]), 1, 1).pngSync();
    const other = Transformer.fromRgbaPixels(Buffer.from([20, 21, 22, 255]), 1, 1).pngSync();
    const a = stageImage(ctx, "memory-default", "question", bytes, "image/png");
    const layout = imageLayout({ widthPx: 510, edit: { ...defaultImageEdit(), rotation: 90 } });
    const payload = { deckId: "memory-default", title: "edit", cue: "cue", content: "content", images: [{ id: a.id, role: "question" as const, layout }] };
    const id = await client.call("content.memory.save", payload), old = app.snapshot().memories.find(c=>c.id===id)!;
    app.handle("memory.review", { request_id: randomUUID(), id, content_version: old.learning_version, score: 3, note: "" });
    const replacement = stageImage(ctx, "memory-default", "question", other, "image/png");
    await client.call("content.memory.save", { ...payload, id, expectedRevision: app.snapshot().memories.find(c=>c.id===id)!.version, images: [{ ...payload.images[0], replacementId: replacement.id }] });
    const current = app.snapshot().memories.find(c=>c.id===id)!;
    assert.equal(current.assets![0].id, a.id); assert.deepEqual(current.assets![0].layout, layout);
    assert.notEqual(current.assets![0].file_name, old.assets![0].file_name); assert(current.learning_version > old.learning_version);
    assert.deepEqual(readFileSync(join(dir, "attachments", old.assets![0].file_name)), bytes);
    const snapshot = JSON.parse((db.prepare("SELECT card_snapshot FROM memory_reviews WHERE card_id=?").get(id) as any).card_snapshot);
    assert.equal(snapshot.assets[0].file_name, old.assets![0].file_name); assert.deepEqual(snapshot.assets[0].layout, layout);
    const foreign = stageImage(ctx, "question-default", "question", bytes, "image/png");
    await assert.rejects(client.call("content.memory.save", { ...payload, id, expectedRevision: current.version, images: [{ ...payload.images[0], replacementId: foreign.id }] }));
    assert.equal(app.snapshot().memories.find(c=>c.id===id)!.assets![0].file_name, current.assets![0].file_name);
    const q = stageImage(ctx, "question-default", "question", bytes, "image/png");
    const qid = await client.call("content.question.save", { deckId: "question-default", stem: "q", answer: "A", images: [{ id: q.id, role: "question", layout }] });
    const qr = stageImage(ctx, "question-default", "question", other, "image/png");
    await client.call("content.question.save", { id: qid, expectedRevision: app.snapshot().questions.find(c=>c.id===qid)!.version, deckId:"question-default",stem:"q",answer:"A", images:[{id:q.id,role:"question",layout,replacementId:qr.id}] });
    const updated = app.snapshot().questions.find(c=>c.id===qid)!;
    assert.equal(updated.assets[0].id,q.id); assert.deepEqual(updated.assets[0].layout,layout); assert.deepEqual(readFileSync(join(dir,"attachments",updated.assets[0].file_name)),other);
  } finally { db.close(); rmSync(dir, {recursive:true,force:true}); }
});
