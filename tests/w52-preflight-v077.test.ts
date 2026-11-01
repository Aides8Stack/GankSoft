import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import yazl from "yazl";
import { freshFixture, publishFresh } from "./fixtures/fresh-production.ts";
import {
  buildAdjustmentPreview,
  meta,
  adjustmentPreviewPlatform,
  readSourceZip,
} from "../electron/modules/workspace-unified/adjustment-preview.ts";
import { prepareAdjustmentSelection } from "../electron/modules/workspace-unified/adjustment-preflight.ts";
import { writeAnalysisZip } from "../electron/modules/workspace-unified/analysis-zip.ts";
import {
  digest,
  currentDue,
  publishedCard,
} from "../electron/modules/cards-unified/schedule.ts";
import {
  PrepareSelection,
  ACTION_FORMAT,
} from "../shared/protocol/ai-adjustments.ts";
import { registry } from "../shared/protocol/registry.ts";
import { createApplicationProtocol } from "../electron/protocol/gateway.ts";
import { Application } from "../electron/application.ts";
import { createClient } from "../shared/protocol/client.ts";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const action = (cardId: string, id = "a") => ({
  actionId: id,
  type: "card.policy.max_interval.set" as const,
  cardId,
  value: 30,
  reason: "合成依据",
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
async function base() {
  const f = await freshFixture(),
    deckId = (
      await f.client.call("workspace.catalog.save", {
        kind: "deck",
        name: "W5.2A",
        parentId: null,
      })
    ).id,
    c = await publishFresh(f.client, "direct", deckId);
  return { f, deckId, cardId: c.cardId };
}
const dump = (f: Awaited<ReturnType<typeof freshFixture>>) =>
  hash(
    JSON.stringify(
      f.ctx.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all()
        .map(({ name }) => [
          name,
          f.ctx.db.prepare('SELECT * FROM "' + name + '" ORDER BY rowid').all(),
        ]),
    ),
  );
async function zip(path: string, files: Array<[string, unknown]>) {
  const z = new yazl.ZipFile();
  for (const [name, v] of files)
    z.addBuffer(Buffer.from(JSON.stringify(v)), name);
  z.end();
  await pipeline(z.outputStream, createWriteStream(path));
}
test("W5.2-A canonical four-action preflight, explicit/all-valid selection, repeat identity and unconfirmed group rejection; zero writes", async () => {
  const { f, deckId, cardId } = await base();
  try {
    const second = await publishFresh(f.client, "direct", deckId);
    let tree = await f.client.call("knowledge.tree.read", { deckId });
    const node = await f.client.call("knowledge.node.create", {
      deckId,
      expectedTreeHash: tree.treeHash,
      parentId: null,
      name: "目标知识",
    });
    await f.client.call("knowledge.cardLinks.set", {
      deckId,
      cardId: second.cardId,
      nodeIds: [node.nodeId],
      expectedRevision: 0,
    });
    let s = await f.client.call("learning.session.open", {
      deckId,
      cardIds: [cardId],
    });
    s = await f.client.call("learning.session.change", {
      deckId,
      sessionId: s.sessionId,
      expectedRevision: s.revision,
      action: "save",
      draft: { ...s.draft, scoreTenths: 90 },
    });
    await f.client.call("learning.review.submit", {
      deckId,
      sessionId: s.sessionId,
      expectedRevision: s.revision,
      eventId: s.entry.eventId,
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
      src = source(f.ctx, deckId),
      actions = [
        action(cardId),
        {
          actionId: "k",
          type: "knowledge.cards.max_interval.set",
          knowledgeId: node.nodeId,
          scope: "aggregate",
          value: 20,
          reason: "合成",
        },
        {
          actionId: "r",
          type: "deck.policy.retention.set",
          deckId,
          value: 0.9,
          reason: "合成",
        },
        {
          actionId: "d",
          type: "card.schedule.advance_due",
          cardId,
          dueAt: new Date(Date.parse(due) - 1000).toISOString(),
          reason: "合成",
        },
      ];
    const preview = buildAdjustmentPreview(f.ctx, src, actions),
      input = PrepareSelection.parse({
        deckId,
        token: preview.token,
        source: src,
        selection: { mode: "all-valid", excludedActionIds: [] },
        confirmed: true,
      }),
      before = dump(f);
    assert.equal(preview.validated.size, 4);
    for (const row of preview.rows) {
      row.before = "SQL";
      row.after = "任意伪展示";
    }
    const p = prepareAdjustmentSelection(f.ctx, preview, input);
    assert.equal(p.selectedCount, 4);
    assert.equal(p.targetCardCount, 2);
    assert.equal(p.executable, false);
    assert.equal(dump(f), before);
    assert.equal(
      prepareAdjustmentSelection(f.ctx, preview, {
        ...input,
        selection: { mode: "explicit", actionIds: ["k"] },
      }).targetCardCount,
      1,
    );
    assert.equal(
      prepareAdjustmentSelection(f.ctx, preview, {
        ...input,
        selection: { mode: "all-valid", excludedActionIds: ["k"] },
      }).selectedCount,
      3,
    );
    for (const selection of [
      { mode: "explicit", actionIds: ["a", "a"] },
      { mode: "explicit", actionIds: ["missing"] },
      { mode: "all-valid", excludedActionIds: ["missing"] },
      { mode: "explicit", actionIds: [] },
    ])
      assert.throws(() =>
        prepareAdjustmentSelection(f.ctx, preview, {
          ...input,
          selection,
        } as never),
      );
    for (const field of [
      "exportId",
      "snapshotId",
      "deckId",
      "dataEpoch",
      "dataRevision",
    ])
      assert.throws(() =>
        prepareAdjustmentSelection(f.ctx, preview, {
          ...input,
          source: {
            ...src,
            [field]:
              field === "dataRevision"
                ? 999999
                : field === "exportId"
                  ? randomUUID()
                  : "wrong",
          },
        }),
      );
    assert.throws(() =>
      prepareAdjustmentSelection(f.ctx, preview, {
        ...input,
        token: "0".repeat(64),
      }),
    );
    assert.throws(() =>
      prepareAdjustmentSelection(f.ctx, preview, {
        ...input,
        confirmed: false,
      } as never),
    );
    const conflict = buildAdjustmentPreview(f.ctx, src, [
      action(cardId),
      action(cardId, "b"),
    ]);
    assert.throws(
      () =>
        prepareAdjustmentSelection(f.ctx, conflict, {
          ...input,
          token: conflict.token,
          selection: { mode: "explicit", actionIds: ["a"] },
        }),
      /冲突/,
    );
    const entry = preview.validated.get("a")!;
    entry.action = { ...entry.action, value: 50 } as typeof entry.action;
    assert.throws(
      () => prepareAdjustmentSelection(f.ctx, preview, input),
      /变化/,
    );
    assert.equal(dump(f), before);
  } finally {
    f.close();
  }
});
test("W5.2-A frozen version/cycle/schedule/relations/tree/config reject even without revision bump; actual revision and time expiry reject", async () => {
  const { f, deckId, cardId } = await base();
  try {
    let tree = await f.client.call("knowledge.tree.read", { deckId });
    const node = await f.client.call("knowledge.node.create", {
      deckId,
      expectedTreeHash: tree.treeHash,
      parentId: null,
      name: "初始知识",
    });
    const src = source(f.ctx, deckId),
      preview = buildAdjustmentPreview(f.ctx, src, [action(cardId)]),
      input = PrepareSelection.parse({
        deckId,
        token: preview.token,
        source: src,
        selection: { mode: "explicit", actionIds: ["a"] },
        confirmed: true,
      }),
      db = f.ctx.db,
      before = dump(f);
    const changes = [
      () =>
        db
          .prepare("UPDATE learning_cards SET revision=revision+1 WHERE id=?")
          .run(cardId),
      () => {
        const cy = db
          .prepare("SELECT * FROM learning_study_cycles WHERE card_id=?")
          .get(cardId)!;
        db.prepare("INSERT INTO learning_study_cycles VALUES(?,?,?,?,?)").run(
          "other-cycle",
          cardId,
          cy.started_at,
          cy.provenance,
          cy.source_ordinal,
        );
        db.prepare(
          "UPDATE learning_cards SET current_cycle_id=? WHERE id=?",
        ).run("other-cycle", cardId);
      },
      () =>
        db
          .prepare("INSERT INTO scheduling VALUES(?,?,?,?)")
          .run(
            "card",
            cardId,
            JSON.stringify({
              due: "2100-01-01T00:00:00.000Z",
              _gank: {
                encoding: "ganksoft.schedule/1",
                cycleId: publishedCard(f.ctx, { deckId, cardId }).cycleId,
                revision: 1,
                eventId: "synthetic",
              },
            }),
            new Date().toISOString(),
          ),
      () =>
        db
          .prepare("INSERT INTO settings VALUES(?,?)")
          .run(
            "unified-card-knowledge:" + cardId,
            JSON.stringify({
              cardId,
              deckId,
              nodeIds: [node.nodeId],
              encoding: "ganksoft.card-knowledge/1",
              revision: 1,
            }),
          ),
      () =>
        db
          .prepare("UPDATE knowledge SET name=? WHERE id=?")
          .run("外部知识变化", node.nodeId),
      () =>
        db
          .prepare("INSERT INTO settings VALUES(?,?)")
          .run(
            "unified-card-policy:" + cardId,
            JSON.stringify({
              encoding: "ganksoft.card-policy/1",
              cardId,
              maxIntervalDays: 99,
              revision: 1,
            }),
          ),
    ];
    for (const mutate of changes) {
      db.exec("BEGIN");
      try {
        mutate();
        assert.throws(() => prepareAdjustmentSelection(f.ctx, preview, input));
      } finally {
        db.exec("ROLLBACK");
      }
      assert.equal(dump(f), before);
    }
    assert.throws(
      () =>
        prepareAdjustmentSelection(
          { ...f.ctx, now: () => new Date(preview.expiresAt + 1) },
          preview,
          input,
        ),
      /有效时间/,
    );
    await f.client.call("workspace.catalog.save", {
      kind: "deck",
      name: "真实修订",
      parentId: null,
    });
    assert.throws(
      () => prepareAdjustmentSelection(f.ctx, preview, input),
      /修订/,
    );
  } finally {
    f.close();
  }
});
test("W5.2-A real query gateway/source ZIP, forged owner/token, cancel and zero receipts; no writes or receipts during preparation", async () => {
  const { f, deckId, cardId } = await base();
  try {
    const original = join(f.root, "original.zip");
    await writeAnalysisZip(
      f.ctx,
      {
        deckId,
        jobId: randomUUID(),
        date: { range: "all" },
        includeImages: false,
      },
      original,
      {
        cancelled: false,
        progress: { phase: "idle", cardCount: 0, eventCount: 0, bytes: 0 },
      },
    );
    const src = await readSourceZip(original),
      path = join(f.root, "actions.zip");
    await zip(path, [
      [
        "ai-adjustments.json",
        { format: ACTION_FORMAT, source: src, actions: [action(cardId)] },
      ],
    ]);
    let ctx = f.ctx;
    const platform = adjustmentPreviewPlatform(
        () => ctx,
        async (k) => (k === "source" ? original : path),
      ),
      host = createApplicationProtocol(
        new Application(f.ctx),
        undefined,
        platform,
      ),
      client = createClient((r) => host.execute(r));
    await client.call("app.capabilities", {});
    const before = dump(f),
      v = await client.call("learning.aiAdjustment.preview.open", { deckId });
    assert.ok(v);
    const input = PrepareSelection.parse({
      deckId,
      token: v.token,
      source: src,
      selection: { mode: "all-valid", excludedActionIds: [] },
      confirmed: true,
    });
    const p = await client.call("learning.aiAdjustment.preview.prepare", input);
    assert.equal(p.selectedCount, 1);
    assert.equal(p.executable, true);
    assert.equal(dump(f), before);
    assert.equal(
      registry["learning.aiAdjustment.preview.prepare"].effect,
      "query",
    );
    assert.equal(registry["learning.aiAdjustment.apply"].effect,"command");assert.equal(registry["learning.aiAdjustment.undo"].effect,"command");
    ctx = { ...f.ctx };
    await assert.rejects(
      () => client.call("learning.aiAdjustment.preview.prepare", input),
      /失效/,
    );
    ctx = f.ctx;
    await client.call("learning.aiAdjustment.preview.close", {
      deckId,
      token: v.token,
    });
    await assert.rejects(() =>
      client.call("learning.aiAdjustment.preview.prepare", input),
    );
    assert.equal(dump(f), before);
  } finally {
    f.close();
  }
});
test("W5.2-A 6000 cross-shard canonical suggestions fully selected and preflighted, byte/time budgets only; zero execution", async () => {
  const { f, deckId, cardId } = await base();
  try {
    const db = f.ctx.db,
      c = db.prepare("SELECT * FROM learning_cards WHERE id=?").get(cardId)!,
      v = JSON.parse(
        String(
          db
            .prepare(
              "SELECT document FROM learning_content_versions WHERE id=?",
            )
            .get(c.current_version_id)!.document,
        ),
      ),
      cy = db
        .prepare("SELECT * FROM learning_study_cycles WHERE id=?")
        .get(c.current_cycle_id)!;
    db.exec("BEGIN");
    for (let i = 1; i < 6000; i++) {
      const id = "w52-" + i,
        vid = "w52-v-" + i,
        cid = "w52-c-" + i;
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
    db.exec("COMMIT");
    const src = source(f.ctx, deckId),
      actions = Array.from({ length: 6000 }, (_, i) =>
        action(i ? "w52-" + i : cardId, "a-" + i),
      ),
      files: Array<[string, unknown]> = [],
      descriptors = [];
    for (let i = 0; i < actions.length; i += 300) {
      const body = { actions: actions.slice(i, i + 300) },
        text = JSON.stringify(body),
        path =
          "adjustments/part-" +
          String(descriptors.length + 1).padStart(4, "0") +
          ".json";
      files.push([path, body]);
      descriptors.push({
        path,
        bytes: Buffer.byteLength(text),
        sha256: hash(text),
        count: body.actions.length,
      });
    }
    files.unshift([
      "manifest.json",
      {
        format: ACTION_FORMAT,
        source: src,
        actionCount: 6000,
        files: descriptors,
      },
    ]);
    const path = join(f.root, "many.zip");
    await zip(path, files);
    const { readAdjustmentZip } =
        await import("../electron/modules/workspace-unified/adjustment-zip.ts"),
      pack = await readAdjustmentZip(path),
      before = dump(f),
      preview = buildAdjustmentPreview(f.ctx, pack.source, pack.actions),
      p = prepareAdjustmentSelection(
        f.ctx,
        preview,
        PrepareSelection.parse({
          deckId,
          token: preview.token,
          source: src,
          selection: { mode: "all-valid", excludedActionIds: [] },
          confirmed: true,
        }),
      );
    assert.equal(p.selectedCount, 6000);
    assert.equal(p.targetCardCount, 6000);
    assert.equal(p.executable, false);
    assert.equal(dump(f), before);
  } finally {
    f.close();
  }
});
