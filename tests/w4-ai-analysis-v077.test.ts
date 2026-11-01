import test from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  readdirSync,
  writeFileSync,
  unlinkSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { freshFixture, publishFresh } from "./fixtures/fresh-production.ts";
import {
  writeAnalysisZip,
  validateAnalysisZip,
  SHARD_BYTES,
  JsonSharder,
  type ExportControl,
} from "../electron/modules/workspace-unified/analysis-zip.ts";
import { readContainer } from "../electron/infrastructure/containers.ts";
import { getAnalysisPrompt } from "../electron/modules/workspace-unified/ai-prompt.ts";
import {
  Manifest,
  DEFAULT_ANALYSIS_PROMPT,
} from "../shared/protocol/ai-analysis.ts";
import { workspaceAnalyticsGrouped } from "../electron/modules/workspace-unified/analytics.ts";
import { stageImage } from "../electron/modules/media/drafts.ts";
import { Transformer } from "@napi-rs/image";
import { placementUrl } from "../shared/editor/document.ts";
const control = (): ExportControl => ({
  cancelled: false,
  progress: { phase: "idle", cardCount: 0, eventCount: 0, bytes: 0 },
});
const input = (deckId: string, includeImages = false) => ({
  deckId,
  jobId: randomUUID(),
  date: { range: "all" as const },
  includeImages,
});
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
type F = Awaited<ReturnType<typeof freshFixture>>;
async function base() {
  const f = await freshFixture(),
    d = await f.client.call("workspace.catalog.save", {
      kind: "deck",
      name: "W4合成数据",
      parentId: null,
    }),
    c = await publishFresh(f.client, "direct", d.id);
  return { f, deckId: d.id, cardId: c.cardId };
}
async function review(f: F, deckId: string, cardId: string) {
  let s = await f.client.call("learning.session.open", {
    deckId,
    cardIds: [cardId],
  });
  if (s.stage === "answer")
    s = await f.client.call("learning.session.change", {
      deckId,
      sessionId: s.sessionId,
      expectedRevision: s.revision,
      action: "reveal",
      draft: s.draft,
    });
  s = await f.client.call("learning.session.change", {
    deckId,
    sessionId: s.sessionId,
    expectedRevision: s.revision,
    action: "save",
    draft: { ...s.draft, scoreTenths: 85, reflection: "合成反思" },
  });
  await f.client.call("learning.review.submit", {
    deckId,
    sessionId: s.sessionId,
    expectedRevision: s.revision,
    eventId: s.entry.eventId,
    scoreTenths: 85,
    practice: false,
    faults: [],
    gaps: "",
    reflection: "合成反思",
  });
}
function clone(f: F, deckId: string, cardId: string, n: number) {
  const db = f.ctx.db,
    c = db.prepare("SELECT * FROM learning_cards WHERE id=?").get(cardId)!,
    v = JSON.parse(
      String(
        db
          .prepare("SELECT document FROM learning_content_versions WHERE id=?")
          .get(c.current_version_id)!.document,
      ),
    ),
    cycle = db
      .prepare("SELECT * FROM learning_study_cycles WHERE id=?")
      .get(c.current_cycle_id)!,
    e = db
      .prepare("SELECT document FROM learning_review_events WHERE card_id=?")
      .get(cardId);
  db.exec("BEGIN");
  try {
    for (let i = 1; i < n; i++) {
      const id = "w4-card-" + String(i).padStart(6, "0"),
        vid = "w4-version-" + i,
        cid = "w4-cycle-" + i;
      db.prepare("INSERT INTO learning_content_versions VALUES(?,?,?,?)").run(
        vid,
        id,
        c.published_type,
        JSON.stringify({
          ...v,
          versionId: vid,
          cardId: id,
          title: "合成卡片 " + i,
        }),
      );
      db.prepare("INSERT INTO learning_study_cycles VALUES(?,?,?,?,?)").run(
        cid,
        id,
        cycle.started_at,
        cycle.provenance,
        cycle.source_ordinal,
      );
      db.prepare("INSERT INTO learning_cards VALUES(?,?,?,?,?,?,?,?,?)").run(
        id,
        deckId,
        "合成卡片 " + i,
        c.published_type,
        vid,
        cid,
        1,
        null,
        null,
      );
      db.prepare("INSERT INTO learning_published_modes VALUES(?,?,?)").run(
        id,
        c.published_type,
        vid,
      );
      if (e) {
        const old = JSON.parse(String(e.document)),
          event = {
            ...old,
            eventId: "w4-event-" + i,
            cardId: id,
            contentVersionId: vid,
            cycleId: cid,
          };
        db.prepare(
          "INSERT INTO learning_review_events VALUES(?,?,?,?,?,?,?)",
        ).run(
          event.eventId,
          id,
          vid,
          cid,
          event.mode,
          event.createdAt,
          JSON.stringify(event),
        );
      }
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
function unchanged(f: F) {
  return sha(
    Buffer.from(
      JSON.stringify(
        [
          "learning_review_events",
          "schedule_events",
          "scheduling",
          "learning_cards",
          "learning_content_versions",
          "knowledge",
        ].map((t) =>
          f.ctx.db.prepare("SELECT * FROM " + t + " ORDER BY 1").all(),
        ),
      ),
    ),
  );
}
async function verify(
  path: string,
  expectedCards: number,
  expectedEvents: number,
) {
  const files = await readContainer(path),
    manifest = Manifest.parse(
      JSON.parse(files.get("data/manifest.json")!.toString()),
    );
  assert.equal(manifest.cardCount, expectedCards);
  assert.equal(manifest.eventCount, expectedEvents);
  let bytes = 0;
  for (const f of manifest.files) {
    const b = files.get(f.path)!;
    assert.equal(b.length, f.bytes);
    assert.equal(sha(b), f.sha256);
    if (f.path.startsWith("data/")) bytes += b.length;
    if (f.path.endsWith(".json")) assert.ok(b.length <= SHARD_BYTES);
  }
  assert.equal(bytes, manifest.totalDataBytes);
  const cardIds = new Set(),
    events = new Set();
  let cardFiles = 0;
  for (const [name, b] of files) {
    if (name.startsWith("data/cards/")) {
      cardFiles++;
      for (const c of JSON.parse(b.toString()).items) {
        assert.ok(!cardIds.has(c.cardId));
        cardIds.add(c.cardId);
      }
    }
    if (name.startsWith("data/reviews/"))
      for (const e of JSON.parse(b.toString()).items) {
        assert.ok(!events.has(e.eventId));
        assert.equal(e.cardId, e.event.cardId);
        events.add(e.eventId);
      }
  }
  let ci = 0,
    ei = 0;
  for (const [name, b] of files)
    if (name.startsWith("data/index/"))
      for (const item of JSON.parse(b.toString()).items) {
        const row = JSON.parse(files.get(item.path)!.toString()).items[
          item.position
        ];
        assert.equal(row.cardId, item.cardId);
        if (item.type === "event") {
          assert.equal(row.eventId, item.eventId);
          ei++;
        } else ci++;
      }
  assert.equal(ci, expectedCards);
  assert.equal(ei, expectedEvents);
  assert.equal(cardIds.size, expectedCards);
  assert.equal(events.size, expectedEvents);
  if (expectedCards >= 10) assert.ok(cardFiles < expectedCards);
  return { files, manifest, cardFiles };
}
for (const n of [1, 10, 225, 499, 500, 501, 1000, 5000, 10000])
  test(`W4-01/03 actual ZIP ${n} cards/events: multi-card sharding complete identity, CRC and hashes`, async () => {
    const { f, deckId, cardId } = await base();
    try {
      await review(f, deckId, cardId);
      clone(f, deckId, cardId, n);
      const before = unchanged(f),
        out = join(f.root, "analysis.zip"),
        c = control();
      await writeAnalysisZip(f.ctx, input(deckId), out, c);
      const { files, cardFiles } = await verify(out, n, n);
      assert.equal(unchanged(f), before);
      const w3 = workspaceAnalyticsGrouped(f.ctx, {
          deckId,
          dimension: "card",
          date: { range: "all" },
        }),
        summary = JSON.parse(files.get("data/summary.json")!.toString());
      assert.deepEqual(summary.summary, w3.summary);
      assert.deepEqual(summary.trend, w3.trend);
      console.log(
        JSON.stringify({
          cards: n,
          events: n,
          cardFiles,
          zipBytes: statSync(out).size,
          heapUsed: process.memoryUsage().heapUsed,
        }),
      );
    } finally {
      f.close();
    }
  });
test("W4-02 0/40/111 events and long items: exact split / explicit abnormal refusal", async () => {
  const { f, deckId, cardId } = await base();
  try {
    let c = control(),
      out = join(f.root, "zero.zip");
    await writeAnalysisZip(f.ctx, input(deckId), out, c);
    await verify(out, 1, 0);
    await review(f, deckId, cardId);
    const db = f.ctx.db,
      e = JSON.parse(
        String(
          db
            .prepare(
              "SELECT document FROM learning_review_events WHERE card_id=?",
            )
            .get(cardId)!.document,
        ),
      );
    for (let i = 1; i < 111; i++) {
      const v = { ...e, eventId: "long-history-" + i };
      db.prepare(
        "INSERT INTO learning_review_events VALUES(?,?,?,?,?,?,?)",
      ).run(
        v.eventId,
        cardId,
        v.contentVersionId,
        v.cycleId,
        v.mode,
        v.createdAt,
        JSON.stringify(v),
      );
      if (i === 39) {
        out = join(f.root, "forty.zip");
        await writeAnalysisZip(f.ctx, input(deckId), out, control());
        await verify(out, 1, 40);
      }
    }
    out = join(f.root, "111.zip");
    await writeAnalysisZip(f.ctx, input(deckId), out, control());
    const { files } = await verify(out, 1, 111);
    assert.ok(
      [...files.keys()].filter((n) => n.startsWith("data/reviews/")).length >=
        3,
    );
    const shards: Buffer[] = [];
    const s = new JsonSharder("cards/cards", 50, async (_, b) => {
      shards.push(b);
    });
    for (let i = 0; i < 10; i++)
      await s.add({ cardId: String(i), body: "中".repeat(30000) });
    await s.flush();
    assert.ok(shards.every((b) => b.length <= SHARD_BYTES));
    assert.equal(
      shards.reduce((n, b) => n + JSON.parse(b.toString()).items.length, 0),
      10,
    );
    await assert.rejects(() => s.add({ body: "中".repeat(100000) }), /256KiB/);
  } finally {
    f.close();
  }
});
test("W4-03 knowledge direct/aggregate statistics equal W3 with overlapping links", async () => {
  const { f, deckId, cardId } = await base();
  try {
    await review(f, deckId, cardId);
    let t = await f.client.call("knowledge.tree.read", { deckId });
    await f.client.call("knowledge.node.create", {
      deckId,
      expectedTreeHash: t.treeHash,
      parentId: null,
      name: "父",
    });
    t = await f.client.call("knowledge.tree.read", { deckId });
    const parent = t.nodes[0].nodeId;
    await f.client.call("knowledge.node.create", {
      deckId,
      expectedTreeHash: t.treeHash,
      parentId: parent,
      name: "子",
    });
    t = await f.client.call("knowledge.tree.read", { deckId });
    await f.client.call("knowledge.cardLinks.set", {
      deckId,
      cardId,
      expectedRevision: 0,
      nodeIds: t.nodes.map((n) => n.nodeId),
    });
    const out = join(f.root, "knowledge.zip");
    await writeAnalysisZip(f.ctx, input(deckId), out, control());
    const { files } = await verify(out, 1, 1),
      nodes = [...files]
        .filter(([n]) => n.startsWith("data/knowledge/"))
        .flatMap(([, b]) => JSON.parse(b.toString()).items);
    for (const scope of ["direct", "aggregate"] as const) {
      const w3 = workspaceAnalyticsGrouped(f.ctx, {
        deckId,
        dimension: "knowledge",
        date: { range: "all" },
        scope,
      });
      for (const n of nodes) {
        const row = w3.items.find((r) => r.id === n.nodeId)!;
        for (const [k, v] of Object.entries(n.statistics[scope]))
          assert.deepEqual(v, row[k as keyof typeof row]);
      }
    }
  } finally {
    f.close();
  }
});
test("W4-04 fixed read transaction excludes a real concurrent revision and new review", async () => {
  const { f, deckId, cardId } = await base();
  try {
    await review(f, deckId, cardId);
    const before = f.ctx.db.prepare("SELECT * FROM protocol_meta").get()!,
      c = control();
    let mutated = false;
    c.checkpoint = async () => {
      if (!mutated) {
        mutated = true;
        await review(f, deckId, cardId);
      }
    };
    const out = join(f.root, "snapshot.zip");
    await writeAnalysisZip(f.ctx, input(deckId), out, c);
    const { manifest, files } = await verify(out, 1, 1);
    assert.equal(manifest.dataRevision, before.revision);
    assert.equal(
      JSON.parse(files.get("data/summary.json")!.toString()).summary.eventCount,
      1,
    );
    assert.equal(
      Number(
        f.ctx.db.prepare("SELECT count(*) n FROM learning_review_events").get()!
          .n,
      ),
      2,
    );
    assert.ok(
      Number(
        f.ctx.db.prepare("SELECT revision FROM protocol_meta").get()!.revision,
      ) > manifest.dataRevision,
    );
  } finally {
    f.close();
  }
});
test("W4-05 Prompt first default, explicit save, cancel-by-no-write, stale save, reopen and incompatible version", async () => {
  const { f, deckId } = await base();
  try {
    const old = await f.client.call("learning.aiAdjustment.prompt.get", {});
    assert.equal(old.text, DEFAULT_ANALYSIS_PROMPT);
    const saved = await f.client.call("learning.aiAdjustment.prompt.save", {
      format: old.format,
      text: "自定义完整分析 Prompt",
      expectedRevision: old.revision,
    });
    assert.equal(getAnalysisPrompt(f.ctx).text, saved.text);
    await assert.rejects(() =>
      f.client.call("learning.aiAdjustment.prompt.save", {
        format: old.format,
        text: "旧修改",
        expectedRevision: old.revision,
      }),
    );
    await f.reopen();
    assert.deepEqual(
      await f.client.call("learning.aiAdjustment.prompt.get", {}),
      saved,
    );
    const out = join(f.root, "prompt.zip");
    await writeAnalysisZip(f.ctx, input(deckId), out, control());
    assert.equal(
      (await readContainer(out)).get("prompt/analysis-prompt.md")!.toString(),
      saved.text,
    );
    f.ctx.db
      .prepare("UPDATE settings SET value=? WHERE key='ai-analysis-prompt'")
      .run(JSON.stringify({ ...saved, format: "future/9" }));
    assert.throws(() => getAnalysisPrompt(f.ctx), /版本不兼容/);
  } finally {
    f.close();
  }
});
test("W4-07 cancellation, disk budget, mid-write failure clean partial and preserve old destination; corrupted ZIP refused", async () => {
  const { f, deckId } = await base();
  try {
    for (const mode of ["cancel", "disk", "failure"]) {
      const out = join(f.root, mode + ".zip");
      writeFileSync(out, "previous valid destination");
      const c = control();
      if (mode === "cancel")
        c.checkpoint = () => {
          c.cancelled = true;
        };
      if (mode === "disk") c.availableBytes = async () => 0;
      if (mode === "failure")
        c.checkpoint = () => {
          if (c.progress.bytes > 0) throw Error("synthetic mid-write failure");
        };
      await assert.rejects(
        () => writeAnalysisZip(f.ctx, input(deckId), out, c),
        mode === "cancel" ? /取消/ : mode === "disk" ? /空间不足/ : /synthetic/,
      );
      assert.equal(readFileSync(out, "utf8"), "previous valid destination");
      assert.ok(!readdirSync(f.root).some((n) => n.includes(".writing-")));
    }
    const out = join(f.root, "crc.zip");
    await writeAnalysisZip(f.ctx, input(deckId), out, control());
    const files = await readContainer(out),
      mb = files.get("data/manifest.json")!,
      m = Manifest.parse(JSON.parse(mb.toString())),
      data = readFileSync(out);
    data.fill(0, 40, 90);
    writeFileSync(out, data);
    await assert.rejects(() => validateAnalysisZip(out, m.files, mb));
  } finally {
    f.close();
  }
});
test("W4-06 real image opt-in, missing/corrupt/oversized attachment, incomplete material default", async () => {
  const { f, deckId } = await base();
  try {
    const bytes = Transformer.fromRgbaPixels(
        Buffer.from([0, 128, 255, 255]),
        1,
        1,
      ).pngSync(),
      asset = stageImage(f.ctx, deckId, "question", bytes, "image/png"),
      d = await f.client.call("draft.create", {
        deckId,
        initialType: "direct",
      }),
      placementId = randomUUID(),
      meta = JSON.parse(
        String(
          f.ctx.db
            .prepare("SELECT value FROM settings WHERE key=?")
            .get("media-draft:" + asset.id)!.value,
        ),
      );
    const saved = await f.client.call("draft.save", {
      deckId,
      cardId: d.cardId,
      expectedPublishedRevision: 0,
      expectedDraftRevision: 1,
      fields: {
        title: "带图卡片",
        payload: {
          encoding: "direct-v1",
          mode: "direct",
          fields: {
            body:
              "![合成图片](" +
              placementUrl({ assetId: asset.id, placementId, width: 100 }) +
              ")",
            source: "",
          },
        },
        mediaRefs: [
          {
            placementId,
            assetId: asset.id,
            fileName: meta.file_name,
            mime: "image/png",
            role: "question",
            width: 100,
          },
        ],
      },
    });
    await f.client.call("card.publish", {
      deckId,
      cardId: d.cardId,
      expectedPublishedRevision: 0,
      expectedDraftRevision: saved.revision,
      resetStudyCycle: false,
    });
    let out = join(f.root, "without-images.zip");
    await writeAnalysisZip(f.ctx, input(deckId), out, control());
    let v = await verify(out, 2, 0);
    assert.ok(![...v.files.keys()].some((n) => n.startsWith("data/images/")));
    const row = [...v.files]
      .filter(([n]) => n.startsWith("data/cards/"))
      .flatMap(([, b]) => JSON.parse(b.toString()).items)
      .find((c) => c.cardId === d.cardId);
    assert.equal(row.materialIncomplete, true);
    out = join(f.root, "images.zip");
    await writeAnalysisZip(f.ctx, input(deckId, true), out, control());
    v = await verify(out, 2, 0);
    assert.equal(
      [...v.files.keys()].filter((n) => n.startsWith("data/images/")).length,
      1,
    );
    assert.deepEqual(
      [...v.files].find(([n]) => n.startsWith("data/images/"))![1],
      bytes,
    );
    const path = join(f.ctx.dataDir, "attachments", meta.file_name);
    for (const mode of ["corrupt", "large", "missing"]) {
      if (mode === "corrupt") writeFileSync(path, Buffer.from("corrupt"));
      else if (mode === "large")
        writeFileSync(path, Buffer.alloc(21 * 1024 * 1024));
      else unlinkSync(path);
      out = join(f.root, "bad-" + mode + ".zip");
      await assert.rejects(() =>
        writeAnalysisZip(f.ctx, input(deckId, true), out, control()),
      );
      assert.ok(!readdirSync(f.root).includes("bad-" + mode + ".zip"));
      assert.ok(!readdirSync(f.root).some((n) => n.includes(".writing-")));
    }
  } finally {
    f.close();
  }
});

test("W4 platform gateway query export, active status/cancel, no revision write and job replay", async () => {
  const { f, deckId } = await base();
  try {
    const { createApplicationProtocol } =
        await import("../electron/protocol/gateway.ts"),
      { Application } = await import("../electron/application.ts"),
      { analysisExportPlatform, analysisFilename } =
        await import("../electron/modules/workspace-unified/analysis-platform.ts"),
      { createClient } = await import("../shared/protocol/client.ts");
    let destination: string | null = join(f.root, "platform.zip"),
      held: (() => void) | undefined;
    const host = createApplicationProtocol(
      new Application(f.ctx),
      undefined,
      analysisExportPlatform(
        () => f.ctx,
        async () => {
          if (destination === null)
            await new Promise<void>((r) => {
              held = r;
            });
          return destination;
        },
      ),
    );
    const client = createClient((r) => host.execute(r));
    await client.call("app.capabilities", {});
    const rev = f.ctx.db.prepare("SELECT revision FROM protocol_meta").get()!
        .revision,
      p = input(deckId),
      r = await client.call("learning.aiAdjustment.export", p);
    assert.equal(r.saved, true);
    assert.equal(
      f.ctx.db.prepare("SELECT revision FROM protocol_meta").get()!.revision,
      rev,
    );
    assert.deepEqual(await client.call("learning.aiAdjustment.export", p), r);
    assert.equal(
      (
        await client.call("learning.aiAdjustment.export.status", {
          jobId: p.jobId,
        })
      ).phase,
      "done",
    );
    destination = null;
    const p2 = input(deckId),
      pending = client.call("learning.aiAdjustment.export", p2);
    await new Promise<void>((r) => setImmediate(r));
    assert.equal(
      (
        await client.call("learning.aiAdjustment.export.status", {
          jobId: p2.jobId,
        })
      ).phase,
      "choosing",
    );
    await client.call("learning.aiAdjustment.export.cancel", {
      jobId: p2.jobId,
    });
    held!();
    assert.equal((await pending).saved, false);
    assert.equal(
      analysisFilename(new Date("2026-11-01T20:00:00Z")),
      "GankSoft-v0.7.7-20261102-ai-analysis.zip",
    );
  } finally {
    f.close();
  }
});

test("W4-02 actual published ultra-long UTF8 body is explicitly refused without truncation or leftover ZIP", async () => {
  const { f, deckId } = await base();
  try {
    const d = await f.client.call("draft.create", {
        deckId,
        initialType: "direct",
      }),
      body = "中".repeat(100000),
      saved = await f.client.call("draft.save", {
        deckId,
        cardId: d.cardId,
        expectedPublishedRevision: 0,
        expectedDraftRevision: 1,
        fields: {
          title: "超长完整正文",
          payload: {
            encoding: "direct-v1",
            mode: "direct",
            fields: { body, source: "" },
          },
          mediaRefs: [],
        },
      });
    await f.client.call("card.publish", {
      deckId,
      cardId: d.cardId,
      expectedPublishedRevision: 0,
      expectedDraftRevision: saved.revision,
      resetStudyCycle: false,
    });
    const before = unchanged(f),
      out = join(f.root, "too-long.zip");
    await assert.rejects(
      () => writeAnalysisZip(f.ctx, input(deckId), out, control()),
      /256KiB/,
    );
    assert.equal(unchanged(f), before);
    assert.ok(!readdirSync(f.root).some((n) => n.includes("too-long.zip")));
  } finally {
    f.close();
  }
});

test("W4 summary date restricts statistics only; all historical events and current cards still exported", async () => {
  const { f, deckId, cardId } = await base();
  try {
    await review(f, deckId, cardId);
    const out = join(f.root, "date.zip"),
      p = {
        ...input(deckId),
        date: {
          range: "custom" as const,
          start: "2000-01-01",
          end: "2000-01-02",
        },
      };
    await writeAnalysisZip(f.ctx, p, out, control());
    const { files } = await verify(out, 1, 1),
      summary = JSON.parse(files.get("data/summary.json")!.toString());
    assert.equal(summary.summary.eventCount, 0);
    assert.equal(summary.summary.cardCount, 1);
    const w3 = workspaceAnalyticsGrouped(f.ctx, {
      deckId,
      dimension: "card",
      date: p.date,
    });
    assert.deepEqual(summary.summary, w3.summary);
  } finally {
    f.close();
  }
});
