import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Transformer } from "@napi-rs/image";
import { openDatabase } from "./fixture.ts";
import { Application } from "../electron/application.ts";
import { createApplicationProtocol } from "../electron/protocol/gateway.ts";
import { createClient } from "../shared/protocol/client.ts";
import { stageImage } from "../electron/modules/media/drafts.ts";
import { mediaReferences } from "../electron/modules/media/references.ts";
import { imageLayout } from "../shared/image-node.ts";
import { cardReviewStats } from "../electron/modules/review/analytics.ts";
test("all content entries: option and memory nodes share resources with isolated instances and immutable memory history", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gank-media-entries-")), db = openDatabase(join(dir, "ganksoft.sqlite"));
  try {
    const ctx = { db, dataDir: dir, now: () => new Date() }, app = new Application(ctx), client = createClient(createApplicationProtocol(app).execute);
    await client.call("app.capabilities", {});
    const bytes = Transformer.fromRgbaPixels(Buffer.from([0, 30, 50, 255]), 1, 1).pngSync();
    const option = stageImage(ctx, "question-default", "option-A", bytes, "image/png");
    const question = await client.call("content.question.save", { deckId: "question-default", stem: "option test", answer: "A",
      images: [{ id: option.id, role: "option-A", layout: imageLayout({ widthPx: 220 }) }] });
    assert.equal(app.snapshot().questions.find(q => q.id === question)!.assets[0].role, "option-A");
    const prompt = stageImage(ctx, "memory-default", "question", bytes, "image/png"), content = stageImage(ctx, "memory-default", "analysis", bytes, "image/png");
    const payload = { deckId: "memory-default", title: "memory", cue: "prompt", content: "answer",
      images: [{ id: prompt.id, role: "question" as const, layout: imageLayout({ widthPx: 260 }) },
        { id: content.id, role: "analysis" as const, layout: imageLayout({ widthPx: 560 }) }] };
    const id = await client.call("content.memory.save", payload);
    const card = app.snapshot().memories.find(m => m.id === id)!;
    assert.deepEqual(card.assets!.map(a => a.layout!.widthPx), [260, 560]);
    assert.equal(card.assets![0].assetId, app.snapshot().questions.find(q => q.id === question)!.assets[0].assetId);
    app.handle("memory.review", { request_id: randomUUID(), id, content_version: card.learning_version, score: 3, note: "recall" });
    await client.call("content.memory.save", { ...payload, id, expectedRevision: app.snapshot().memories.find(m => m.id === id)!.version, images: [{ ...payload.images[0], layout: imageLayout({ widthPx: 600 }) }, payload.images[1]] });
    const history = cardReviewStats(ctx, { kind: "memory", card_id: id }).records;
    assert.equal(history[0].question!.assets[0].layout!.widthPx, 260);
    assert.equal(app.snapshot().memories.find(m => m.id === id)!.assets![0].layout!.widthPx, 600);
    assert.equal(app.snapshot().memories.find(m => m.id === id)!.learning_version, card.learning_version);
    await assert.rejects(client.call("content.memory.save", { ...payload, id, expectedRevision: app.snapshot().memories.find(m => m.id === id)!.version,
      images: [{ id: option.id, role: "question", layout: imageLayout() }] }));
    assert.equal(mediaReferences(ctx).filter(r => r.ownerType === "memory").length, 2);
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});
