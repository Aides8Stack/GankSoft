import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { writeFileSync, readFileSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { randomUUID } from "node:crypto";
import yazl from "yazl";
import { freshFixture, publishFresh } from "./fixtures/fresh-production.ts";
import { transaction } from "../electron/infrastructure/database.ts";
import { writeAnalysisZip } from "../electron/modules/workspace-unified/analysis-zip.ts";
import {
  readAdjustmentZip,
  safeJson,
  sha256,
  IMPORT_BUDGET,
} from "../electron/modules/workspace-unified/adjustment-zip.ts";
import {
  readSourceZip,
  buildAdjustmentPreview,
  adjustmentPreviewPlatform,
  meta,
} from "../electron/modules/workspace-unified/adjustment-preview.ts";
import {
  digest,
  currentDue,
  publishedCard,
} from "../electron/modules/cards-unified/schedule.ts";
import {
  ACTION_FORMAT,
  PreviewPage,
  Source,
} from "../shared/protocol/ai-adjustments.ts";
import { createApplicationProtocol } from "../electron/protocol/gateway.ts";
import { Application } from "../electron/application.ts";
import { createClient } from "../shared/protocol/client.ts";
const reason = () => randomUUID() + "：根据历史表现调整间隔";
const action = (cardId: string, i = 0) => ({
  actionId: "action-" + i,
  type: "card.policy.max_interval.set",
  cardId,
  value: 30,
  reason: reason(),
});
const source = (ctx: Parameters<typeof meta>[0], deckId: string) => {
  const m = meta(ctx),
    exportId = randomUUID();
  return {
    ...m,
    exportId,
    deckId,
    snapshotId: digest({
      exportId,
      epoch: m.dataEpoch,
      revision: m.dataRevision,
    }),
  };
};
export async function zip(
  path: string,
  files: Array<[string, unknown]>,
  compress = true,
) {
  const z = new yazl.ZipFile();
  for (const [name, v] of files)
    z.addBuffer(Buffer.isBuffer(v) ? v : Buffer.from(JSON.stringify(v)), name, {
      compress,
    });
  z.end();
  await pipeline(z.outputStream, createWriteStream(path));
}
async function base() {
  const f = await freshFixture(),
    deckId = (
      await f.client.call("workspace.catalog.save", {
        kind: "deck",
        name: "W5合成",
        parentId: null,
      })
    ).id,
    c = await publishFresh(f.client, "direct", deckId);
  return { f, deckId, cardId: c.cardId };
}
function dump(f: Awaited<ReturnType<typeof freshFixture>>) {
  const tables = f.ctx.db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
    .map(({ name }) => ({
      name,
      rows: f.ctx.db
        .prepare(
          'SELECT * FROM "' +
            String(name).replaceAll('"', '""') +
            '" ORDER BY rowid',
        )
        .all(),
    }));
  return sha256(Buffer.from(JSON.stringify(tables)));
}
async function exported(
  f: Awaited<ReturnType<typeof freshFixture>>,
  deckId: string,
) {
  const path = join(f.root, "source.zip");
  await writeAnalysisZip(
    f.ctx,
    {
      deckId,
      jobId: randomUUID(),
      date: { range: "all" },
      includeImages: false,
    },
    path,
    {
      cancelled: false,
      progress: { phase: "idle", cardCount: 0, eventCount: 0, bytes: 0 },
    },
  );
  return { path, source: await readSourceZip(path) };
}
function clone(
  f: Awaited<ReturnType<typeof freshFixture>>,
  deckId: string,
  cardId: string,
  n: number,
) {
  const db = f.ctx.db,
    c = db.prepare("SELECT * FROM learning_cards WHERE id=?").get(cardId)!,
    v = JSON.parse(
      String(
        db
          .prepare("SELECT document FROM learning_content_versions WHERE id=?")
          .get(c.current_version_id)!.document,
      ),
    ),
    cy = db
      .prepare("SELECT * FROM learning_study_cycles WHERE id=?")
      .get(c.current_cycle_id)!;
  transaction(db, () => {
    for (let i = 1; i < n; i++) {
      const id = "w5-card-" + i,
        vid = "w5-version-" + i,
        cid = "w5-cycle-" + i;
      db.prepare("INSERT INTO learning_content_versions VALUES(?,?,?,?)").run(
        vid,
        id,
        c.published_type,
        JSON.stringify({ ...v, versionId: vid, cardId: id }),
      );
      db.prepare("INSERT INTO learning_study_cycles VALUES(?,?,?,?,?)").run(
        cid,
        id,
        cy.started_at,
        cy.provenance,
        cy.source_ordinal,
      );
      db.prepare("INSERT INTO learning_cards VALUES(?,?,?,?,?,?,?,?,?)").run(
        id,
        deckId,
        "合成" + i,
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
    }
  });
}
test("W5-01 complete legal 1/500/501/1000/6000 suggestions across shards, every row visible without count cap", async () => {
  const { f, deckId, cardId } = await base();
  try {
    clone(f, deckId, cardId, 6000);
    const original = await exported(f, deckId),
      s = original.source;
    for (const n of [1, 500, 501, 1000, 6000]) {
      const actions = Array.from({ length: n }, (_, i) =>
        action(i ? "w5-card-" + i : cardId, i),
      );
      const files: Array<[string, unknown]> = [],
        descriptors = [];
      for (let i = 0; i < actions.length; i += 350) {
        const part = actions.slice(i, i + 350),
          b = Buffer.from(JSON.stringify({ actions: part })),
          path =
            "adjustments/part-" +
            String(descriptors.length + 1).padStart(4, "0") +
            ".json";
        files.push([path, b]);
        descriptors.push({
          path,
          bytes: b.length,
          sha256: sha256(b),
          count: part.length,
        });
      }
      files.unshift([
        "manifest.json",
        {
          format: ACTION_FORMAT,
          source: s,
          actionCount: n,
          files: descriptors,
        },
      ]);
      const path = join(f.root, "many.zip");
      await zip(path, files);
      const p = await readAdjustmentZip(path),
        preview = buildAdjustmentPreview(f.ctx, p.source, p.actions);
      assert.equal(preview.rows.length, n);
      assert.ok(preview.rows.every((r) => r.status === "valid"));
      assert.equal(preview.rows.at(-1)!.actionId, "action-" + (n - 1));
      if (n === 6000) {
        const platform = adjustmentPreviewPlatform(
            () => f.ctx,
            async (kind) => (kind === "source" ? original.path : path),
          ),
          client = createClient((r) => createHost.execute(r)),
          createHost = createApplicationProtocol(
            new Application(f.ctx),
            undefined,
            platform,
          );
        await client.call("app.capabilities", {});
        const before = dump(f),
          first = await client.call("learning.aiAdjustment.preview.open", {
            deckId,
          });
        assert.ok(first);
        let offset = 0;
        const seen = new Set<string>();
        while (offset < n) {
          const page = await client.call("learning.aiAdjustment.preview.page", {
            deckId,
            token: first.token,
            offset,
            limit: 100,
          });
          assert.equal(page.total, n);
          assert.ok(page.rows.length);
          for (const r of page.rows) {
            assert.equal(r.status, "valid");
            seen.add(r.actionId!);
          }
          offset += page.rows.length;
        }
        assert.equal(seen.size, n);
        assert.equal(dump(f), before);
      }
    }
  } finally {
    f.close();
  }
});
test("W5-01 malicious ZIP paths, duplicate members, CRC, byte/hash/count/incomplete manifests, versions, JSON depth and duplicate fields reject whole package", async () => {
  const { f, deckId, cardId } = await base();
  try {
    const s = source(f.ctx, deckId),
      a = action(cardId),
      small = { format: ACTION_FORMAT, source: s, actions: [a] },
      path = join(f.root, "bad.zip");
    await zip(path, [
      ["ai-adjustments.json", small],
      ["ai-adjustments.json", small],
    ]);
    await assert.rejects(() => readAdjustmentZip(path), /重复/);
    await zip(path, [["xx-adjustments.json", small]], false);
    let b = readFileSync(path);
    b = Buffer.from(
      b
        .toString("latin1")
        .replaceAll("xx-adjustments.json", "../adjustments.json"),
      "latin1",
    );
    writeFileSync(path, b);
    await assert.rejects(() => readAdjustmentZip(path));
    const part = Buffer.from(JSON.stringify({ actions: [a] })),
      entry = {
        path: "adjustments/part-0001.json",
        bytes: part.length,
        sha256: sha256(part),
        count: 1,
      };
    for (const patch of [
      { sha256: "0".repeat(64) },
      { bytes: part.length + 1 },
      { count: 2 },
    ]) {
      await zip(path, [
        [
          "manifest.json",
          {
            format: ACTION_FORMAT,
            source: s,
            actionCount: 1,
            files: [{ ...entry, ...patch }],
          },
        ],
        [entry.path, part],
      ]);
      await assert.rejects(() => readAdjustmentZip(path));
    }
    for (const entries of [[], [entry, entry]]) {
      await zip(path, [
        [
          "manifest.json",
          { format: ACTION_FORMAT, source: s, actionCount: 1, files: entries },
        ],
        [entry.path, part],
      ]);
      await assert.rejects(() => readAdjustmentZip(path));
    }
    await zip(path, [
      [
        "manifest.json",
        { format: ACTION_FORMAT, source: s, actionCount: 2, files: [entry] },
      ],
      [entry.path, part],
    ]);
    await assert.rejects(() => readAdjustmentZip(path), /数量/);
    await zip(path, [
      [
        "manifest.json",
        { format: ACTION_FORMAT, source: s, actionCount: 1, files: [entry] },
      ],
    ]);
    await assert.rejects(() => readAdjustmentZip(path), /缺失/);
    await zip(path, [
      ["ai-adjustments.json", { ...small, format: "unknown/2" }],
    ]);
    await assert.rejects(() => readAdjustmentZip(path));
    await zip(path, [["ai-adjustments.json", small]], false);
    b = readFileSync(path);
    const at = b.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    b.writeUInt32LE((b.readUInt32LE(at + 16) ^ 1) >>> 0, at + 16);
    writeFileSync(path, b);
    await assert.rejects(() => readAdjustmentZip(path), /CRC/);
    assert.throws(() => safeJson(Buffer.from('{"x":1,"x":2}')), /重复/);
    assert.throws(
      () => safeJson(Buffer.from("[".repeat(30) + "0" + "]".repeat(30))),
      /深度/,
    );
    assert.throws(() => safeJson(Buffer.from([0xff])), /encoded|encoding/i);
    await zip(path, [
      ["ai-adjustments.json", Buffer.from(" ".repeat(IMPORT_BUDGET.file + 1))],
    ]);
    await assert.rejects(() => readAdjustmentZip(path), /预算/);
    await zip(path, [
      ["ai-adjustments.json", Buffer.from(" ".repeat(1024 * 1024))],
    ]);
    await assert.rejects(() => readAdjustmentZip(path), /预算/);
  } finally {
    f.close();
  }
});
test("W5-02 whitelist bounds, foreign targets, arbitrary content/SQL/FSRS edits and due guards", async () => {
  const { f, deckId, cardId } = await base();
  try {
    const s = source(f.ctx, deckId),
      raw = [
        {
          actionId: "retention",
          type: "deck.policy.retention.set",
          deckId,
          value: 0.97,
          reason: reason(),
        },
        action(cardId),
        ...([0.79, 0.98] as number[]).map((value, i) => ({
          actionId: "bad-retention-" + i,
          type: "deck.policy.retention.set",
          deckId,
          value,
          reason: reason(),
        })),
        ...([0, 3651, 1.5] as number[]).map((value, i) => ({
          ...action(cardId),
          actionId: "bad-max-" + i,
          value,
        })),
        { ...action("foreign"), actionId: "foreign" },
        { ...action(cardId), actionId: "answer", answer: "改写答案" },
        {
          actionId: "sql",
          type: "sql",
          sql: "DELETE FROM scheduling",
          reason: reason(),
        },
        { ...action(cardId), actionId: "fsrs", state: { due: "2100-01-01" } },
        {
          actionId: "due",
          type: "card.schedule.advance_due",
          cardId,
          dueAt: new Date().toISOString(),
          reason: reason(),
        },
      ];
    const p = buildAdjustmentPreview(f.ctx, s, raw);
    assert.deepEqual(
      p.rows.map((r) => r.status),
      ["valid", "valid", ...Array(raw.length - 2).fill("rejected")],
    );
    assert.throws(
      () => buildAdjustmentPreview(f.ctx, s, [action(cardId), action(cardId)]),
      /actionId重复/,
    );
    for (const value of [1, 3650])
      assert.equal(
        buildAdjustmentPreview(f.ctx, s, [{ ...action(cardId), value }]).rows[0]
          .status,
        "valid",
      );
    for (const value of [0.8, 0.97])
      assert.equal(
        buildAdjustmentPreview(f.ctx, s, [
          {
            actionId: "r",
            type: "deck.policy.retention.set",
            deckId,
            value,
            reason: reason(),
          },
        ]).rows[0].status,
        "valid",
      );
    let session = await f.client.call("learning.session.open", {
      deckId,
      cardIds: [cardId],
    });
    session = await f.client.call("learning.session.change", {
      deckId,
      sessionId: session.sessionId,
      expectedRevision: session.revision,
      action: "save",
      draft: { ...session.draft, scoreTenths: 90 },
    });
    await f.client.call("learning.review.submit", {
      deckId,
      sessionId: session.sessionId,
      expectedRevision: session.revision,
      eventId: session.entry.eventId,
      scoreTenths: 90,
      practice: false,
      faults: [],
      gaps: "",
      reflection: "",
    });
    const due = currentDue(
        f.ctx,
        publishedCard(f.ctx, { deckId, cardId }),
      ).dueAt!,
      earlier = new Date(Date.parse(due) - 1000).toISOString(),
      a = {
        actionId: "advance",
        type: "card.schedule.advance_due",
        cardId,
        dueAt: earlier,
        reason: reason(),
      };
    assert.equal(
      buildAdjustmentPreview(f.ctx, source(f.ctx, deckId), [a]).rows[0].status,
      "valid",
    );
    assert.equal(
      buildAdjustmentPreview(f.ctx, source(f.ctx, deckId), [
        { ...a, dueAt: new Date(Date.parse(due) + 1000).toISOString() },
      ]).rows[0].status,
      "rejected",
    );
    assert.equal(
      buildAdjustmentPreview(
        { ...f.ctx, now: () => new Date(Date.parse(due) + 1) },
        source(f.ctx, deckId),
        [a],
      ).rows[0].status,
      "rejected",
    );
  } finally {
    f.close();
  }
});
test("W5-02 knowledge direct/aggregate deduplicate cards; single-card and overlapping knowledge suggestions conflict on both sides", async () => {
  const { f, deckId, cardId } = await base();
  try {
    let t = await f.client.call("knowledge.tree.read", { deckId });
    const root = await f.client.call("knowledge.node.create", {
      deckId,
      expectedTreeHash: t.treeHash,
      parentId: null,
      name: "根",
    });
    t = await f.client.call("knowledge.tree.read", { deckId });
    const child = await f.client.call("knowledge.node.create", {
      deckId,
      expectedTreeHash: t.treeHash,
      parentId: root.nodeId,
      name: "子",
    });
    const second = await publishFresh(f.client, "direct", deckId);
    await f.client.call("knowledge.cardLinks.set", {
      deckId,
      cardId,
      nodeIds: [root.nodeId, child.nodeId],
      expectedRevision: 0,
    });
    await f.client.call("knowledge.cardLinks.set", {
      deckId,
      cardId: second.cardId,
      nodeIds: [child.nodeId],
      expectedRevision: 0,
    });
    const s = source(f.ctx, deckId),
      a = {
        actionId: "k",
        type: "knowledge.cards.max_interval.set",
        knowledgeId: root.nodeId,
        scope: "aggregate",
        value: 12,
        reason: reason(),
      };
    assert.equal(
      buildAdjustmentPreview(f.ctx, s, [a]).rows[0].affectedCardCount,
      2,
    );
    assert.equal(
      buildAdjustmentPreview(f.ctx, s, [{ ...a, scope: "direct" }]).rows[0]
        .affectedCardCount,
      1,
    );
    assert.ok(
      buildAdjustmentPreview(f.ctx, s, [a, action(cardId)]).rows.every(
        (r) => r.status === "conflict",
      ),
    );
    assert.ok(
      buildAdjustmentPreview(f.ctx, s, [
        a,
        { ...a, actionId: "k2", knowledgeId: child.nodeId },
      ]).rows.every((r) => r.status === "conflict"),
    );
  } finally {
    f.close();
  }
});
test("W5-03/04 real gateway import/page/cancel and failures produce zero DB writes; source mismatch, revision/epoch/context/time expiry reject", async () => {
  const { f, deckId, cardId } = await base();
  try {
    const original = await exported(f, deckId),
      path = join(f.root, "actions.zip");
    await zip(path, [
      [
        "ai-adjustments.json",
        {
          format: ACTION_FORMAT,
          source: original.source,
          actions: [
            action(cardId),
            { ...action(cardId), actionId: "conflict" },
          ],
        },
      ],
    ]);
    let picked: string | null = path,
      ctx = f.ctx;
    const platform = adjustmentPreviewPlatform(
        () => ctx,
        async (kind) => (kind === "source" ? original.path : picked),
      ),
      host = createApplicationProtocol(
        new Application(f.ctx),
        undefined,
        platform,
      ),
      client = createClient((r) => host.execute(r));
    await client.call("app.capabilities", {});
    const before = dump(f),
      p = await client.call("learning.aiAdjustment.preview.open", { deckId });
    assert.ok(p);
    PreviewPage.parse(p);
    assert.equal(p.total, 2);
    assert.equal(p.conflict, 2);
    assert.equal(p.stale, false);
    assert.equal(dump(f), before);
    assert.equal(
      (
        await client.call("learning.aiAdjustment.preview.page", {
          deckId,
          token: p.token,
          offset: 1,
          limit: 1,
        })
      ).rows[0].index,
      1,
    );
    assert.equal(dump(f), before);
    await client.call("learning.aiAdjustment.preview.close", {
      deckId,
      token: p.token,
    });
    await assert.rejects(() =>
      client.call("learning.aiAdjustment.preview.page", {
        deckId,
        token: p.token,
        offset: 0,
        limit: 50,
      }),
    );
    assert.equal(dump(f), before);
    picked = null;
    assert.equal(
      await client.call("learning.aiAdjustment.preview.open", { deckId }),
      null,
    );
    assert.equal(dump(f), before);
    for (const patch of [
      { exportId: randomUUID() },
      { snapshotId: "wrong" },
      { deckId: "wrong" },
      { dataEpoch: "wrong" },
      { dataRevision: 99999 },
    ]) {
      await zip(path, [
        [
          "ai-adjustments.json",
          {
            format: ACTION_FORMAT,
            source: { ...original.source, ...patch },
            actions: [action(cardId)],
          },
        ],
      ]);
      picked = path;
      await assert.rejects(
        () => client.call("learning.aiAdjustment.preview.open", { deckId }),
        /来源/,
      );
      assert.equal(dump(f), before);
    }
    await zip(path, [
      [
        "ai-adjustments.json",
        {
          format: ACTION_FORMAT,
          source: original.source,
          actions: [action(cardId)],
        },
      ],
    ]);
    const p2 = await client.call("learning.aiAdjustment.preview.open", {
      deckId,
    });
    assert.ok(p2);
    ctx = { ...f.ctx, now: () => new Date(Date.now() + 11 * 60 * 1000) };
    assert.equal(
      (
        await platform["learning.aiAdjustment.preview.page"]({
          deckId,
          token: p2.token,
          offset: 0,
          limit: 50,
        })
      ).stale,
      true,
    );
    ctx = f.ctx;
    await f.client.call("workspace.catalog.save", {
      kind: "deck",
      name: "真实修订变化",
      parentId: null,
    });
    const changed = dump(f);
    assert.equal(
      (
        await client.call("learning.aiAdjustment.preview.page", {
          deckId,
          token: p2.token,
          offset: 0,
          limit: 50,
        })
      ).stale,
      true,
    );
    assert.equal(dump(f), changed);
    await assert.rejects(
      () => client.call("learning.aiAdjustment.preview.open", { deckId }),
      /过期/,
    );
    assert.equal(dump(f), changed);
    assert.throws(
      () =>
        buildAdjustmentPreview(
          f.ctx,
          { ...original.source, dataEpoch: "wrong" },
          [],
        ),
      /过期/,
    );
  } finally {
    f.close();
  }
});
