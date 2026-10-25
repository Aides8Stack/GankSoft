import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { unifiedWorkspaceFixture } from "./fixtures/unified-workspace.ts";
import {
  preparedCardExport,
  stageCardPackage,
  writeCardPackage,
  readCardPackage,
} from "../electron/modules/cards-unified/exchange.ts";
import { stageImage } from "../electron/modules/media/drafts.ts";
import { placementUrl, parsePlacement } from "../shared/editor/document.ts";
import { validateUnifiedData } from "../electron/infrastructure/migrations/unified-integrity.ts";
import {
  createBackup,
  stageBackup,
} from "../electron/infrastructure/backup.ts";
import { DatabaseSync } from "node:sqlite";
const code = (value: string) => (e: unknown) =>
  (e as { code?: string }).code === value;
type Fixture = Awaited<ReturnType<typeof unifiedWorkspaceFixture>>;
async function selected(
  f: Fixture,
  cards: { cardId: string; deckId: string }[],
) {
  const deckId = cards[0].deckId,
    summary = await f.client.call("card.listSummary", { deckId });
  return f.client.call("card.exchange.preview", {
    deckId,
    cards: cards.map((c) => ({
      cardId: c.cardId,
      expectedRevision: summary.items.find((r) => r.cardId === c.cardId)!
        .revision,
    })),
  });
}
async function withImages(f: Fixture) {
  const c = await f.card("direct"),
    bytes = readFileSync(
      join(
        f.ctx.dataDir,
        "attachments",
        String(
          f.ctx.db.prepare("SELECT file_name FROM assets LIMIT 1").get()!
            .file_name,
        ),
      ),
    ),
    asset = stageImage(f.ctx, c.deckId, "question", bytes, "image/png");
  const refs = [30, 80].map((width) => ({
    assetId: asset.id,
    placementId: randomUUID(),
    fileName: asset.id + ".png",
    mime: "image/png" as const,
    role: "question" as const,
    width,
  }));
  const payload = {
    encoding: "direct-v1" as const,
    mode: "direct" as const,
    fields: {
      body: refs
        .map(
          (r) =>
            "![](" +
            placementUrl({
              assetId: r.assetId,
              placementId: r.placementId,
              width: r.width,
            }) +
            ")",
        )
        .join("\n\n"),
      source: "原始来源",
    },
  };
  const d = await f.client.call("draft.save", {
    deckId: c.deckId,
    cardId: c.cardId,
    expectedPublishedRevision: 1,
    expectedDraftRevision: null,
    fields: { title: "双宽度正文", payload, mediaRefs: refs },
  });
  await f.client.call("card.publish", {
    deckId: c.deckId,
    cardId: c.cardId,
    expectedPublishedRevision: 1,
    expectedDraftRevision: d.revision,
    resetStudyCycle: false,
  });
  const node = await f.client.call("knowledge.node.read", {
    deckId: c.deckId,
    nodeId: f.source.ids.child1,
  });
  const k = stageImage(f.ctx, c.deckId, "knowledge", bytes, "image/png");
  await f.client.call("knowledge.node.save", {
    deckId: c.deckId,
    nodeId: node.nodeId,
    expectedRevision: node.revision,
    markdown:
      "# 正文标题\n\n![](" +
      placementUrl({ assetId: k.id, placementId: randomUUID(), width: 45 }) +
      ")",
  });
  await f.client.call("knowledge.cardLinks.set", {
    deckId: c.deckId,
    cardId: c.cardId,
    nodeIds: [node.nodeId],
    expectedRevision: 0,
  });
  return { c, refs, bytes };
}

test("T34 three-mode content export is read-only, ignores unpublished drafts/history and imports independent identities", async () => {
  const f = await unifiedWorkspaceFixture();
  try {
    const cards = [
        await f.card("question"),
        await f.card("qa"),
        await f.card("direct"),
      ],
      deckId = cards[0].deckId;
    const d = await f.client.call("draft.previewSwitch", {
      deckId,
      cardId: cards[0].cardId,
      targetType: "direct",
    });
    await f.client.call("draft.switchType", {
      deckId,
      cardId: cards[0].cardId,
      targetType: "direct",
      expectedPublishedRevision: 1,
      expectedDraftRevision: null,
      previewToken: d.token,
      confirmDiscard: true,
    });
    const before = f.ctx.db.prepare("SELECT * FROM protocol_meta").get();
    const p = await selected(f, cards);
    assert.deepEqual(
      f.ctx.db.prepare("SELECT * FROM protocol_meta").get(),
      before,
    );
    assert.deepEqual(p.modes, { question: 1, qa: 1, direct: 1 });
    assert.doesNotMatch(JSON.stringify(p), /stem|payload|base64|mediaRefs/);
    const doc = preparedCardExport(f.ctx, { token: p.token });
    assert.equal(doc.cards[0].payload.mode, "question");
    assert.doesNotMatch(
      JSON.stringify(doc),
      /ReviewEvent|scoreTenths|draftType|schedule/,
    );
    const file = join(f.source.root, "合成 卡片.zip");
    await writeCardPackage(file, doc);
    assert.deepEqual(await readCardPackage(file), doc);
    const staged = stageCardPackage(f.ctx, await readCardPackage(file));
    const req = f.client.prepare("card.exchange.import", {
        token: staged.token,
        name: "三模式独立导入",
      }),
      result = await f.client.send(req);
    assert.deepEqual(await f.client.send(req), result);
    const imported = await f.client.call("card.listSummary", {
      deckId: result.deckId,
    });
    assert.equal(imported.items.length, 3);
    for (const row of imported.items) {
      assert.ok(!cards.some((c) => c.cardId === row.cardId));
      assert.equal(
        (
          await f.client.call("learning.history.list", {
            deckId: result.deckId,
            cardId: row.cardId,
          })
        ).items.length,
        0,
      );
      assert.equal(
        (
          await f.client.call("card.getPublishedContent", {
            deckId: result.deckId,
            cardId: row.cardId,
          })
        ).payload!.mode,
        row.publishedType,
      );
    }
    assert.equal(
      (await f.client.call("card.listSummary", { deckId })).items.length,
      4,
    );
    const again = await f.client.call("card.exchange.import", {
      token: staged.token,
      name: "重复时不新建",
    });
    assert.equal(again.skipped, true);
    assert.equal(again.deckId, result.deckId);
    const extra = await f.client.call("card.exchange.import", {
      token: staged.token,
      name: "主动另导一份",
      allowDuplicate: true,
    });
    assert.equal(extra.skipped, false);
    assert.notEqual(extra.deckId, result.deckId);
    f.reopen();
    validateUnifiedData(f.ctx.db);
  } finally {
    f.close();
  }
});

test("T34 current media placements and ancestor knowledge Markdown survive ZIP roundtrip, backup and reopen", async () => {
  const f = await unifiedWorkspaceFixture();
  try {
    const { c, refs, bytes } = await withImages(f),
      p = await selected(f, [c]);
    assert.equal(p.knowledgeCount, 2);
    const doc = preparedCardExport(f.ctx, { token: p.token });
    assert.match(doc.knowledgeMarkdown, /data:image\/png;base64/);
    const stage = stageCardPackage(f.ctx, doc),
      r = await f.client.call("card.exchange.import", {
        token: stage.token,
        name: "含图独立集",
      });
    const row = (await f.client.call("card.listSummary", { deckId: r.deckId }))
        .items[0],
      content = await f.client.call("card.getPublishedContent", {
        deckId: r.deckId,
        cardId: row.cardId,
      });
    assert.deepEqual(
      content.mediaRefs.map((r) => r.width),
      [30, 80],
    );
    assert.equal(new Set(content.mediaRefs.map((r) => r.assetId)).size, 1);
    for (const r of content.mediaRefs) {
      assert.ok(
        !refs.some(
          (old) =>
            old.assetId === r.assetId || old.placementId === r.placementId,
        ),
      );
      assert.deepEqual(
        readFileSync(join(f.ctx.dataDir, "attachments", r.fileName)),
        bytes,
      );
    }
    assert.equal(content.payload!.mode, "direct");
    if (content.payload!.mode === "direct")
      for (const match of content.payload!.fields.body.matchAll(
        /gank-asset:\/\/[^)]+/g,
      ))
        assert.ok(
          content.mediaRefs.some(
            (r) => r.placementId === parsePlacement(match[0]).placementId,
          ),
        );
    const links = await f.client.call("knowledge.cardLinks.get", {
      deckId: r.deckId,
      cardId: row.cardId,
    });
    assert.equal(links.nodeIds.length, 1);
    assert.notEqual(links.nodeIds[0], f.source.ids.child1);
    const node = await f.client.call("knowledge.node.read", {
      deckId: r.deckId,
      nodeId: links.nodeIds[0],
    });
    assert.match(node.markdown, /# 正文标题/);
    assert.match(node.markdown, /width=45/);
    assert.equal(node.assets.length, 1);
    const backup = join(f.source.root, "roundtrip-backup.zip");
    await createBackup(f.ctx.db, f.ctx.dataDir, backup, f.ctx.now());
    const restored = join(f.source.root, "restored");
    await stageBackup(backup, restored);
    const db = new DatabaseSync(join(restored, "ganksoft.sqlite"));
    try {
      validateUnifiedData(db);
      assert.equal(
        db
          .prepare("SELECT count(*) n FROM learning_cards WHERE deck_id=?")
          .get(r.deckId)!.n,
        1,
      );
    } finally {
      db.close();
    }
    f.reopen();
    validateUnifiedData(f.ctx.db);
  } finally {
    f.close();
  }
});

test("T34 stale selection/preview, foreign cards, corrupt closures and package integrity are rejected before writes", async () => {
  const f = await unifiedWorkspaceFixture();
  try {
    const { c } = await withImages(f),
      p = await selected(f, [c]),
      doc = preparedCardExport(f.ctx, { token: p.token });
    const invalid = structuredClone(doc);
    invalid.cards[0].images = [];
    assert.throws(
      () => stageCardPackage(f.ctx, invalid),
      code("MEDIA_REFERENCE_INVALID"),
    );
    const bad = structuredClone(doc);
    bad.cards[0].knowledgeKeys.push("missing:path");
    assert.throws(
      () => stageCardPackage(f.ctx, bad),
      code("INVALID_KNOWLEDGE_SCOPE"),
    );
    await assert.rejects(
      () =>
        f.client.call("card.exchange.preview", {
          deckId: c.deckId,
          cards: [{ cardId: c.cardId, expectedRevision: 1 }],
        }),
      code("REVISION_CONFLICT"),
    );
    await assert.rejects(
      () =>
        f.client.call("card.exchange.preview", {
          deckId: f.source.ids.mDeck,
          cards: [{ cardId: c.cardId, expectedRevision: 2 }],
        }),
      code("CARD_SCOPE_CONFLICT"),
    );
    await f.client.call("draft.create", {
      deckId: c.deckId,
      initialType: "qa",
    });
    assert.throws(
      () => preparedCardExport(f.ctx, { token: p.token }),
      code("PREVIEW_EXPIRED"),
    );
    f.advance(300001);
    await assert.rejects(
      () =>
        f.client.call("card.exchange.import", { token: p.token, name: "过期" }),
      code("PREVIEW_EXPIRED"),
    );
  } finally {
    f.close();
  }
});

test("T34 failed import receipt rolls back the entire new deck, links and all card/knowledge files; retry is idempotent", async () => {
  const f = await unifiedWorkspaceFixture();
  try {
    const { c } = await withImages(f),
      p = await selected(f, [c]),
      doc = preparedCardExport(f.ctx, { token: p.token }),
      staged = stageCardPackage(f.ctx, doc);
    const count = () =>
        f.ctx.db.prepare("SELECT count(*) n FROM decks").get()!.n,
      before = count(),
      files = readdirSync(join(f.ctx.dataDir, "attachments")).sort();
    const req = f.client.prepare("card.exchange.import", {
      token: staged.token,
      name: "回滚合成集",
    });
    f.ctx.db.exec(
      "CREATE TEMP TRIGGER reject_exchange_receipt BEFORE INSERT ON protocol_receipts WHEN NEW.method='card.exchange.import' BEGIN SELECT RAISE(ABORT,'synthetic receipt failure'); END",
    );
    await assert.rejects(() => f.client.send(req));
    assert.equal(count(), before);
    assert.deepEqual(
      readdirSync(join(f.ctx.dataDir, "attachments")).sort(),
      files,
    );
    f.ctx.db.exec("DROP TRIGGER reject_exchange_receipt");
    const r = await f.client.send(req);
    assert.equal(count(), Number(before) + 1);
    assert.deepEqual(await f.client.send(req), r);
    validateUnifiedData(f.ctx.db);
  } finally {
    f.close();
  }
});

test("T34 legacy text options remain exact and are never guessed into native options on content roundtrip", async () => {
  const f = await unifiedWorkspaceFixture();
  try {
    const c = { cardId: f.source.ids.question, deckId: f.source.ids.qDeck },
      p = await selected(f, [c]),
      doc = preparedCardExport(f.ctx, { token: p.token }),
      old = doc.cards[0].payload;
    assert.equal(old.encoding, "legacy-question-604");
    const s = stageCardPackage(f.ctx, doc),
      r = await f.client.call("card.exchange.import", {
        token: s.token,
        name: "旧题文本往返",
      }),
      row = (await f.client.call("card.listSummary", { deckId: r.deckId }))
        .items[0];
    const restored = await f.client.call("card.getPublishedContent", {
      deckId: r.deckId,
      cardId: row.cardId,
    });
    assert.deepEqual(restored.payload, old);
    assert.deepEqual(
      restored.mediaRefs.map((ref) => ref.role),
      doc.cards[0].mediaRefs.map((ref) => ref.role),
    );
    f.reopen();
    validateUnifiedData(f.ctx.db);
  } finally {
    f.close();
  }
});

test("T34 ZIP manifest corruption and unlisted files fail closed without creating a target", async () => {
  const f = await unifiedWorkspaceFixture();
  try {
    const { readContainer, writeContainer } =
      await import("../electron/infrastructure/containers.ts");
    const c = await f.card("direct"),
      p = await selected(f, [c]),
      file = join(f.source.root, "verified.zip");
    await writeCardPackage(file, preparedCardExport(f.ctx, { token: p.token }));
    const files = await readContainer(file);
    files.set("cards.json", Buffer.from("{}"));
    const corrupt = join(f.source.root, "corrupt.zip");
    await writeContainer(corrupt, files);
    await assert.rejects(
      () => readCardPackage(corrupt),
      code("EXCHANGE_INVALID"),
    );
    const extra = await readContainer(file);
    extra.set("unexpected.bin", Buffer.from("synthetic"));
    const unlisted = join(f.source.root, "unlisted.zip");
    await writeContainer(unlisted, extra);
    await assert.rejects(
      () => readCardPackage(unlisted),
      code("EXCHANGE_INVALID"),
    );
  } finally {
    f.close();
  }
});

test("T34 native file coordinator cancellation replays once and rechecks revision after the save dialog", async () => {
  const f = await unifiedWorkspaceFixture();
  try {
    const { cardExchangePlatform } =
        await import("../electron/modules/cards-unified/exchange-platform.ts"),
      { createApplicationProtocol } =
        await import("../electron/protocol/gateway.ts"),
      { Application } = await import("../electron/application.ts"),
      { createClient } = await import("../shared/protocol/client.ts");
    let saves = 0,
      change = false;
    const host = createApplicationProtocol(
        new Application(f.ctx),
        undefined,
        cardExchangePlatform(() => f.ctx, {
          save: async () => {
            saves++;
            if (change) {
              await f.client.call("draft.create", {
                deckId: f.source.ids.qDeck,
                initialType: "direct",
              });
              return join(f.source.root, "must-not-write.zip");
            }
            return null;
          },
          open: async () => null,
        }),
      ),
      client = createClient((r) => host.execute(r));
    await client.call("app.capabilities", {});
    const c = await f.card("direct"),
      p = await selected(f, [c]),
      req = client.prepare("card.exchange.save", { token: p.token });
    assert.deepEqual(await client.send(req), { saved: false, name: null });
    assert.deepEqual(await client.send(req), { saved: false, name: null });
    assert.equal(saves, 1);
    assert.equal(await client.call("card.exchange.open", {}), null);
    change = true;
    const next = await selected(f, [c]);
    await assert.rejects(
      () => client.call("card.exchange.save", { token: next.token }),
      (e: unknown) =>
        (e as { code?: string; outcome?: string }).code ===
          "CARD_EXPORT_REJECTED" &&
        (e as { outcome?: string }).outcome === "rejected",
    );
    assert.equal(
      f.ctx.db
        .prepare(
          "SELECT count(*) n FROM platform_operations WHERE method='card.exchange.save' AND state='pending'",
        )
        .get()!.n,
      0,
    );
    const { existsSync } = await import("node:fs");
    assert.equal(existsSync(join(f.source.root, "must-not-write.zip")), false);
  } finally {
    f.close();
  }
});
