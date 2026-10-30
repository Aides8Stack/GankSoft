import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { rmSync, readFileSync, readdirSync } from "node:fs";
import type { ClipboardTextPort } from "../electron/modules/cards-unified/clipboard.ts";
import { schema604Fixture } from "./fixtures/v075-schema604.ts";
import {
  prepareAndActivateUnified,
  openUnifiedOwner,
} from "../electron/infrastructure/migrations/coordinator.ts";
import { validateUnifiedData } from "../electron/infrastructure/migrations/unified-integrity.ts";
import {
  createBackup,
  stageBackup,
} from "../electron/infrastructure/backup.ts";
import { Application } from "../electron/application.ts";
import { createApplicationProtocol } from "../electron/protocol/gateway.ts";
import { createClient } from "../shared/protocol/client.ts";
import { mapPublishedContent } from "../shared/cards/mapping.ts";
import {
  DraftPayload,
  publicationIssues,
} from "../shared/protocol/card-draft.ts";
import {
  ContentVersion,
  ContentPayload,
  type ContentVersionDTO,
} from "../shared/protocol/unified.ts";
import {
  readWorkspaceDraft,
  saveWorkspaceDraft,
  previewDraftSwitch,
  switchWorkspaceDraft,
} from "../electron/modules/cards-unified/draft-service.ts";
import { placementUrl } from "../shared/editor/document.ts";
import { inspectDatabaseBaseline } from "../electron/infrastructure/migrations/baseline.ts";

async function fixture(clipboard?: ClipboardTextPort) {
  const source = schema604Fixture();
  source.db.exec("UPDATE platform_operations SET state='completed'");
  const control = join(source.root, "control"),
    target = join(source.root, "active");
  const sourceCtx = {
    db: source.db,
    dataDir: source.dataDir,
    now: () => new Date(source.at),
  };
  await prepareAndActivateUnified(sourceCtx, control, target);
  let owner = openUnifiedOwner(control),
    ctx = { db: owner.db, dataDir: owner.dataDir, now: sourceCtx.now };
  const scope = { cardId: source.ids.question, deckId: source.ids.qDeck };
  const host = () => createApplicationProtocol(new Application(ctx), undefined, undefined, undefined, clipboard);
  let protocol = host();
  const client = createClient(async (r) => protocol.execute(r));
  await client.call("app.capabilities", {});
  return {
    source,
    scope,
    client,
    get ctx() {
      return ctx;
    },
    get protocol() {
      return protocol;
    },
    reopen() {
      owner.close();
      owner = openUnifiedOwner(control);
      ctx = { ...ctx, db: owner.db };
      protocol = host();
    },
    close() {
      owner.close();
      source.close();
    },
  };
}
const code = (name: string) => (e: unknown) =>
  e instanceof Error && "code" in e && e.code === name;
function published(mode: "question" | "qa" | "direct"): ContentVersionDTO {
  const payload =
    mode === "question"
      ? {
          encoding: "question-v1",
          mode,
          fields: {
            stem: "题干",
            material: "材料",
            analysis: "解析",
            source: "来源",
            initialThought: "误区",
            options: [
              { optionId: "stable:a", position: 0, markdown: "甲" },
              { optionId: "stable:b", position: 1, markdown: "乙" },
            ],
            correctOptionId: "stable:b",
          },
        }
      : mode === "qa"
        ? {
            encoding: "qa-v1",
            mode,
            fields: {
              front: "问题",
              back: "答案",
              supplement: "补充",
              source: "来源",
            },
          }
        : {
            encoding: "direct-v1",
            mode,
            fields: { body: "记忆正文", source: "来源" },
          };
  return ContentVersion.parse({
    versionId: "v:" + mode,
    cardId: "card:one",
    mode,
    title: "标题",
    availability: "known",
    payload,
    mediaRefs: [],
    publishedAt: "2026-10-23T00:00:00.000Z",
    source: {
      schema: 606,
      kind: "published",
      key: "card:one",
      ordinal: null,
      wireToken: null,
      rawJson: null,
    },
  });
}
for (const from of ["question", "qa", "direct"] as const)
  for (const to of ["question", "qa", "direct"] as const)
    if (from !== to)
      test(`T10 ${from} -> ${to} first mapping preserves source and requires missing information`, () => {
        const source = published(from),
          before = structuredClone(source),
          result = mapPublishedContent(source, to);
        assert.deepEqual(source, before);
        assert.equal(result.fields.payload.mode, to);
        assert.equal(result.origin.versionId, source.versionId);
        assert.equal(result.origin.mappingVersion, "six-way/1");
        const text = JSON.stringify(result.fields.payload);
        if (from === "question") {
          assert.ok(text.includes("乙"));
          assert.ok(text.includes("解析"));
          assert.ok(text.includes("误区"));
        }
        if (to === "question") {
          const p = result.fields.payload;
          assert.equal(p.mode, "question");
          if (p.encoding === "question-v1") {
            assert.deepEqual(p.fields.options, []);
            assert.equal(p.fields.correctOptionId, null);
            assert.ok(result.requiredFields.includes("options"));
            assert.ok(!ContentPayload.safeParse(p).success);
          }
        }
        if (from === "direct" && to === "qa") {
          assert.equal(result.fields.payload.mode, "qa");
          assert.ok(result.requiredFields.includes("front"));
        }
        if (from === "qa" && to === "direct")
          for (const t of ["问题", "答案", "补充"]) assert.ok(text.includes(t));
      });
test("T09 stable option IDs support 2-100 choices, reorder and reject duplicate/dangling answers", () => {
  const p = published("question").payload!;
  assert.equal(p.encoding, "question-v1");
  if (p.encoding !== "question-v1") return;
  for (const n of [2, 5, 26, 100]) {
    const options = Array.from({ length: n }, (_, i) => ({
      optionId: "option:" + i,
      position: n - i - 1,
      markdown: "内容" + i,
    }));
    const value = {
      ...p,
      fields: { ...p.fields, options, correctOptionId: "option:1" },
    };
    assert.ok(ContentPayload.safeParse(value).success);
    options.reverse();
    assert.equal(ContentPayload.parse(value).mode, "question");
    assert.equal(
      value.fields.options.find(
        (o) => o.optionId === value.fields.correctOptionId,
      )?.markdown,
      "内容1",
    );
    assert.ok(
      !DraftPayload.safeParse({
        ...value,
        fields: { ...value.fields, correctOptionId: "deleted" },
      }).success,
    );
    assert.ok(
      !DraftPayload.safeParse({
        ...value,
        fields: { ...value.fields, options: [options[0], options[0]] },
      }).success,
    );
  }
});
test("T11 preview/cancel makes no writes; confirm clears only draft, revisions monotonic; published/FSRS/history unchanged", async () => {
  const f = await fixture();
  try {
    const db = f.ctx.db;
    const protectedRows = () =>
      [
        "learning_cards",
        "learning_content_versions",
        "learning_study_cycles",
        "learning_review_events",
        "scheduling",
        "plans",
        "question_knowledge",
      ].map((t) => db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all());
    const before = protectedRows(),
      total = Number(db.prepare("SELECT total_changes() AS n").get()!.n);
    const p = await f.client.call("draft.previewSwitch", {
      ...f.scope,
      targetType: "qa",
    });
    assert.equal(
      Number(db.prepare("SELECT total_changes() AS n").get()!.n),
      total,
    );
    assert.equal(await f.client.call("draft.get", f.scope), null);
    const d = await f.client.call("draft.switchType", {
      ...f.scope,
      targetType: "qa",
      expectedPublishedRevision: 1,
      expectedDraftRevision: null,
      previewToken: p.token,
      confirmDiscard: true,
    });
    assert.equal(d.revision, 1);
    assert.equal(d.draftType, "qa");
    const fields = {
      title: "编辑标题",
      payload: {
        encoding: "qa-v1" as const,
        mode: "qa" as const,
        fields: {
          front: "未发布新问题",
          back: "草稿",
          supplement: "",
          source: "",
        },
      },
      mediaRefs: d.mediaRefs,
    };
    const saved = await f.client.call("draft.save", {
      ...f.scope,
      expectedPublishedRevision: 1,
      expectedDraftRevision: 1,
      fields,
    });
    assert.equal(saved.revision, 2);
    const second = await f.client.call("draft.previewSwitch", {
      ...f.scope,
      targetType: "direct",
    });
    assert.deepEqual(
      (await f.client.call("draft.get", f.scope))!.payload,
      fields.payload,
      "cancel means no mutation",
    );
    const switched = await f.client.call("draft.switchType", {
      ...f.scope,
      targetType: "direct",
      expectedPublishedRevision: 1,
      expectedDraftRevision: 2,
      previewToken: second.token,
      confirmDiscard: true,
    });
    assert.equal(switched.revision, 3);
    assert.equal(switched.draftType, "direct");
    assert.ok(!JSON.stringify(switched.payload).includes("未发布新问题"));
    assert.deepEqual(protectedRows(), before);
    validateUnifiedData(db);
    f.reopen();
    assert.deepEqual(await f.client.call("draft.get", f.scope), switched);
  } finally {
    f.close();
  }
});
test("T10 published target is restored exactly rather than overwritten by source mapping", async () => {
  const f = await fixture();
  try {
    const doc = {
      ...published("qa"),
      cardId: f.scope.cardId,
      versionId: "target:qa",
      title: "历史问答",
    };
    f.ctx.db
      .prepare("INSERT INTO learning_content_versions VALUES(?,?,?,?)")
      .run(doc.versionId, doc.cardId, doc.mode, JSON.stringify(doc));
    f.ctx.db
      .prepare("INSERT INTO learning_published_modes VALUES(?,?,?)")
      .run(doc.cardId, doc.mode, doc.versionId);
    const p = previewDraftSwitch(f.ctx, { ...f.scope, targetType: "qa" });
    assert.equal(p.origin.strategy, "published-target");
    assert.deepEqual(p.fields.payload, doc.payload);
    assert.equal(p.fields.title, doc.title);
  } finally {
    f.close();
  }
});
test("T11/T12 CAS, implicit mode, stale preview, epoch and same request retry are protected", async () => {
  const f = await fixture();
  try {
    const p = await f.client.call("draft.previewSwitch", {
      ...f.scope,
      targetType: "qa",
    });
    const req = f.client.prepare("draft.switchType", {
      ...f.scope,
      targetType: "qa",
      expectedPublishedRevision: 1,
      expectedDraftRevision: null,
      previewToken: p.token,
      confirmDiscard: true,
    });
    const first = await f.client.send(req),
      replay = await f.client.send(req);
    assert.deepEqual(replay, first);
    assert.equal(first.revision, 1);
    const input = {
      ...f.scope,
      expectedPublishedRevision: 1,
      expectedDraftRevision: 1,
      fields: {
        title: "新",
        payload: first.payload,
        mediaRefs: first.mediaRefs,
      },
    };
    const save = f.client.prepare("draft.save", input);
    await f.client.send(save);
    await assert.rejects(
      () => f.client.call("draft.save", input),
      code("DRAFT_REVISION_CONFLICT"),
    );
    await assert.rejects(
      () =>
        f.client.call("draft.save", {
          ...input,
          expectedDraftRevision: 2,
          fields: { ...input.fields, payload: published("direct").payload! },
        }),
      code("DRAFT_MODE_CONFLICT"),
    );
    await assert.rejects(
      () =>
        f.client.call("draft.switchType", {
          ...f.scope,
          targetType: "qa",
          expectedPublishedRevision: 1,
          expectedDraftRevision: 2,
          previewToken: p.token,
          confirmDiscard: true,
        }),
      code("PREVIEW_EXPIRED"),
    );
    const badEpoch = await f.protocol.execute({
      ...save,
      requestId: randomUUID(),
      dataEpoch: randomUUID(),
    });
    assert.equal(badEpoch.ok, false);
    if (!badEpoch.ok) assert.equal(badEpoch.error.code, "DATA_EPOCH_CHANGED");
    await assert.rejects(
      () =>
        f.client.call("draft.get", { ...f.scope, deckId: f.source.ids.mDeck }),
      code("DECK_CONFLICT"),
    );
    f.reopen();
    assert.equal(readWorkspaceDraft(f.ctx, f.scope)!.revision, 2);
  } finally {
    f.close();
  }
});
test("T12 injected disk/write failure rolls back draft and receipt; original retry succeeds after reopen", async () => {
  const f = await fixture();
  try {
    const p = await f.client.call("draft.previewSwitch", {
      ...f.scope,
      targetType: "direct",
    });
    const req = f.client.prepare("draft.switchType", {
      ...f.scope,
      targetType: "direct",
      expectedPublishedRevision: 1,
      expectedDraftRevision: null,
      previewToken: p.token,
      confirmDiscard: true,
    });
    f.ctx.db.exec(
      "CREATE TEMP TRIGGER fail_draft BEFORE INSERT ON learning_card_drafts BEGIN SELECT RAISE(ABORT,'injected disk full'); END",
    );
    await assert.rejects(() => f.client.send(req));
    assert.equal(readWorkspaceDraft(f.ctx, f.scope), null);
    assert.equal(
      f.ctx.db
        .prepare("SELECT 1 FROM protocol_receipts WHERE request_id=?")
        .get(req.requestId),
      undefined,
    );
    f.reopen();
    const d = await f.client.send(req);
    assert.equal(d.revision, 1);
    f.reopen();
    assert.deepEqual(readWorkspaceDraft(f.ctx, f.scope), d);
    const invalid = {
      ...d.payload,
      fields: { body: "不完整仍可保存", source: "" },
    };
    const saved = saveWorkspaceDraft(f.ctx, {
      ...f.scope,
      expectedPublishedRevision: 1,
      expectedDraftRevision: 1,
      fields: { title: d.title, payload: invalid, mediaRefs: d.mediaRefs },
    });
    assert.equal(saved.revision, 2);
  } finally {
    f.close();
  }
});
test("T06/T12 independent placements, cross-card/deck rejection, backup closure and missing file detection", async () => {
  const f = await fixture();
  try {
    const p = previewDraftSwitch(f.ctx, { ...f.scope, targetType: "direct" });
    let d = switchWorkspaceDraft(f.ctx, {
      ...f.scope,
      targetType: "direct",
      expectedPublishedRevision: 1,
      expectedDraftRevision: null,
      previewToken: p.token,
      confirmDiscard: true,
    });
    const assetId = f.source.ids.unboundImage;
    const refs = [30, 80].map((width) => ({
      placementId: randomUUID(),
      assetId,
      fileName: assetId + ".png",
      mime: "image/png" as const,
      role: "analysis" as const,
      width,
    }));
    const fields = {
      title: d.title,
      payload: {
        encoding: "direct-v1" as const,
        mode: "direct" as const,
        fields: {
          body: refs
            .map(
              (r) =>
                `![图](${placementUrl({ assetId, placementId: r.placementId, width: r.width })})`,
            )
            .join("\n\n"),
          source: "",
        },
      },
      mediaRefs: refs,
    };
    d = saveWorkspaceDraft(f.ctx, {
      ...f.scope,
      expectedPublishedRevision: 1,
      expectedDraftRevision: 1,
      fields,
    });
    assert.deepEqual(
      d.mediaRefs.map((r) => r.width),
      [30, 80],
    );
    f.reopen();
    assert.deepEqual(readWorkspaceDraft(f.ctx, f.scope)!.mediaRefs, refs);
    const qa = previewDraftSwitch(f.ctx, {
      cardId: f.source.ids.memory,
      deckId: f.source.ids.mDeck,
      targetType: "direct",
    });
    switchWorkspaceDraft(f.ctx, {
      cardId: f.source.ids.memory,
      deckId: f.source.ids.mDeck,
      targetType: "direct",
      expectedPublishedRevision: 1,
      expectedDraftRevision: null,
      previewToken: qa.token,
      confirmDiscard: true,
    });
    assert.throws(
      () =>
        saveWorkspaceDraft(f.ctx, {
          cardId: f.source.ids.memory,
          deckId: f.source.ids.mDeck,
          expectedPublishedRevision: 1,
          expectedDraftRevision: 1,
          fields,
        }),
      code("MEDIA_SCOPE_CONFLICT"),
    );
    assert.throws(
      () =>
        saveWorkspaceDraft(f.ctx, {
          ...f.scope,
          expectedPublishedRevision: 1,
          expectedDraftRevision: 2,
          fields: {
            ...fields,
            mediaRefs: [{ ...refs[0], width: 80 }, refs[1]],
          },
        }),
      code("MEDIA_REFERENCE_INVALID"),
    );
    const archive = join(f.source.root, "draft.zip"),
      restored = join(f.source.root, "restored");
    await createBackup(f.ctx.db, f.ctx.dataDir, archive);
    await stageBackup(archive, restored);
    const db = new DatabaseSync(join(restored, "ganksoft.sqlite"));
    try {
      assert.deepEqual(
        readWorkspaceDraft({ ...f.ctx, db, dataDir: restored }, f.scope),
        d,
      );
    } finally {
      db.close();
    }
    rmSync(join(f.ctx.dataDir, "attachments", assetId + ".png"));
    assert.throws(
      () =>
        inspectDatabaseBaseline(
          join(f.ctx.dataDir, "ganksoft.sqlite"),
          f.ctx.dataDir,
        ),
      code("MIGRATION_MEDIA_MISSING"),
    );
  } finally {
    f.close();
  }
});

test("T13 publish default preserves cycle/FSRS/history; new version owns card; retry idempotent; target restore and reopen", async () => {
  const f = await fixture();
  try {
    const old = await f.client.call("card.getPublishedContent", f.scope),
      db = f.ctx.db;
    const cycle = db
      .prepare("SELECT current_cycle_id FROM learning_cards WHERE id=?")
      .get(f.scope.cardId)!.current_cycle_id;
    const schedules = db
        .prepare("SELECT * FROM scheduling ORDER BY card_id")
        .all(),
      history = db
        .prepare("SELECT * FROM learning_review_events ORDER BY id")
        .all();
    const preview = await f.client.call("draft.previewSwitch", {
      ...f.scope,
      targetType: "qa",
    });
    const draft = await f.client.call("draft.switchType", {
      ...f.scope,
      targetType: "qa",
      expectedPublishedRevision: 1,
      expectedDraftRevision: null,
      previewToken: preview.token,
      confirmDiscard: true,
    });
    const req = f.client.prepare("card.publish", {
      ...f.scope,
      expectedPublishedRevision: 1,
      expectedDraftRevision: draft.revision,
      resetStudyCycle: false,
    });
    const result = await f.client.send(req);
    assert.equal(result.publishedType, "qa");
    assert.equal(result.revision, 2);
    assert.equal(result.cycleId, cycle);
    assert.deepEqual(await f.client.send(req), result);
    assert.equal(await f.client.call("draft.get", f.scope), null);
    assert.deepEqual(
      db.prepare("SELECT * FROM scheduling ORDER BY card_id").all(),
      schedules,
    );
    assert.deepEqual(
      db.prepare("SELECT * FROM learning_review_events ORDER BY id").all(),
      history,
    );
    assert.deepEqual(
      await f.client.call("content.getVersion", {
        ...f.scope,
        versionId: old.versionId,
      }),
      old,
    );
    const published = await f.client.call("card.getPublishedContent", f.scope);
    assert.equal(published.source.kind, "published");
    assert.equal(published.versionId, result.versionId);
    const back = await f.client.call("draft.previewSwitch", {
      ...f.scope,
      targetType: "question",
    });
    assert.deepEqual(back.fields.payload, old.payload);
    assert.throws(
      () =>
        new Application(f.ctx).handle("question.note", {
          id: f.scope.cardId,
          note: "旧窗口覆盖",
          version: 1,
        }),
      code("LEGACY_OWNER_CONFLICT"),
    );
    // An unrelated old-model card remains editable and projection cannot clobber the published owner.
    new Application(f.ctx).handle("memory.save", {
      id: f.source.ids.memory,
      module: f.source.ids.mDeck,
      version: 1,
      title: "另一卡",
      cue: "问题",
      content: "答案",
      knowledge_ids: [f.source.ids.memoryNode],
    });
    assert.equal(
      (await f.client.call("card.getPublishedContent", f.scope)).versionId,
      result.versionId,
    );
    validateUnifiedData(db);
    f.reopen();
    assert.equal(
      (await f.client.call("card.getPublishedContent", f.scope)).versionId,
      result.versionId,
    );
  } finally {
    f.close();
  }
});
test("T13 explicit relearn creates one new cycle, clears current FSRS only and retains all immutable events/versions", async () => {
  const f = await fixture();
  try {
    const p = await f.client.call("draft.previewSwitch", {
      ...f.scope,
      targetType: "direct",
    });
    await f.client.call("draft.switchType", {
      ...f.scope,
      targetType: "direct",
      expectedPublishedRevision: 1,
      expectedDraftRevision: null,
      previewToken: p.token,
      confirmDiscard: true,
    });
    const before = f.ctx.db
      .prepare("SELECT * FROM learning_review_events ORDER BY id")
      .all();
    const oldCycle = f.ctx.db
      .prepare("SELECT current_cycle_id FROM learning_cards WHERE id=?")
      .get(f.scope.cardId)!.current_cycle_id;
    const req = f.client.prepare("card.publish", {
      ...f.scope,
      expectedPublishedRevision: 1,
      expectedDraftRevision: 1,
      resetStudyCycle: true,
      knowledgeIds: [f.source.ids.child1],
    });
    const result = await f.client.send(req);
    assert.notEqual(result.cycleId, oldCycle);
    assert.deepEqual(await f.client.send(req), result);
    assert.equal(
      f.ctx.db
        .prepare(
          "SELECT count(*) AS n FROM learning_study_cycles WHERE card_id=?",
        )
        .get(f.scope.cardId)!.n,
      3,
    );
    assert.equal(
      f.ctx.db
        .prepare("SELECT 1 FROM scheduling WHERE kind='question' AND card_id=?")
        .get(f.scope.cardId),
      undefined,
    );
    assert.ok(
      f.ctx.db
        .prepare("SELECT 1 FROM scheduling WHERE kind='memory' AND card_id=?")
        .get(f.source.ids.memory),
    );
    assert.deepEqual(
      f.ctx.db
        .prepare("SELECT * FROM learning_review_events ORDER BY id")
        .all(),
      before,
    );
    assert.equal(
      f.ctx.db
        .prepare(
          "SELECT count(*) AS n FROM question_knowledge WHERE question_id=?",
        )
        .get(f.scope.cardId)!.n,
      1,
    );
    validateUnifiedData(f.ctx.db);
    f.reopen();
  } finally {
    f.close();
  }
});
test("T13 incomplete draft and injected publish failure retain old published content, draft, links, cycle and schedules", async () => {
  const f = await fixture();
  try {
    const p = await f.client.call("draft.previewSwitch", {
      ...f.scope,
      targetType: "qa",
    });
    await f.client.call("draft.switchType", {
      ...f.scope,
      targetType: "qa",
      expectedPublishedRevision: 1,
      expectedDraftRevision: null,
      previewToken: p.token,
      confirmDiscard: true,
    });
    const db = f.ctx.db,
      snapshot = () =>
        [
          "learning_cards",
          "learning_card_drafts",
          "learning_published_modes",
          "learning_content_versions",
          "learning_study_cycles",
          "learning_review_events",
          "question_knowledge",
          "scheduling",
          "plans",
        ].map((t) => db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all());
    const before = snapshot();
    db.exec(
      "CREATE TEMP TRIGGER reject_publish BEFORE INSERT ON learning_content_versions BEGIN SELECT RAISE(ABORT,'injected publish write failure'); END",
    );
    const req = f.client.prepare("card.publish", {
      ...f.scope,
      expectedPublishedRevision: 1,
      expectedDraftRevision: 1,
      resetStudyCycle: true,
      knowledgeIds: [f.source.ids.child1],
    });
    await assert.rejects(() => f.client.send(req));
    assert.deepEqual(snapshot(), before);
    db.exec("DROP TRIGGER reject_publish");
    await assert.rejects(
      () =>
        f.client.call("card.publish", {
          ...f.scope,
          expectedPublishedRevision: 1,
          expectedDraftRevision: 1,
          resetStudyCycle: false,
          knowledgeIds: [f.source.ids.memoryNode],
        }),
      code("INVALID_KNOWLEDGE_SCOPE"),
    );
    assert.deepEqual(snapshot(), before);
    const draft = (await f.client.call("draft.get", f.scope))!;
    await f.client.call("draft.save", {
      ...f.scope,
      expectedPublishedRevision: 1,
      expectedDraftRevision: 1,
      fields: {
        title: "不完整",
        payload: {
          encoding: "qa-v1",
          mode: "qa",
          fields: { front: "", back: "", supplement: "", source: "" },
        },
        mediaRefs: draft.mediaRefs,
      },
    });
    await assert.rejects(
      () =>
        f.client.call("card.publish", {
          ...f.scope,
          expectedPublishedRevision: 1,
          expectedDraftRevision: 2,
          resetStudyCycle: false,
        }),
      code("PUBLISH_INCOMPLETE"),
    );
    assert.equal((await f.client.call("draft.get", f.scope))!.revision, 2);
    assert.equal(
      (await f.client.call("card.getPublishedContent", f.scope)).mode,
      "question",
    );
  } finally {
    f.close();
  }
});

test("T15 prompt context is deck-scoped lightweight paths and retired AI never invokes platform/network handler", async () => {
  const f = await fixture();
  try {
    const context = await f.client.call("card.getPromptContext", f.scope);
    assert.ok(context.catalog.length > context.confirmed.length);
    assert.equal(context.confirmed.length, 2);
    assert.ok(context.catalog.every((n) => n.deckId === f.scope.deckId));
    assert.ok(context.confirmed.every((n) => n.path.length === 2));
    assert.ok(!JSON.stringify(context).includes("保留原理"));
    assert.ok(!JSON.stringify(context).includes(f.source.ids.memoryNode));
    let invoked = 0;
    const host = createApplicationProtocol(new Application(f.ctx), () => {}, {
      "ai.analyze": async () => {
        invoked++;
        throw Error("network must not be invoked");
      },
      "ai.config.save": async () => {
        invoked++;
        throw Error("settings must not be changed");
      },
    });
    const c = createClient(async (r) => host.execute(r));
    await c.call("app.capabilities", {});
    await assert.rejects(
      () => c.call("ai.analyze", { id: f.source.ids.child1 }),
      code("AI_EXTERNAL_ONLY"),
    );
    await assert.rejects(
      () =>
        c.call("ai.config.save", {
          endpoint: "https://example.invalid/api",
          model: "test",
        }),
      code("AI_EXTERNAL_ONLY"),
    );
    assert.equal(invoked, 0);
    assert.equal(
      f.ctx.db
        .prepare("SELECT 1 FROM platform_operations WHERE method LIKE 'ai.%'")
        .get(),
      undefined,
    );
  } finally {
    f.close();
  }
});

async function directDraft(f: Awaited<ReturnType<typeof fixture>>, scope = f.scope) {
  const preview = await f.client.call('draft.previewSwitch', { ...scope, targetType: 'direct' });
  return f.client.call('draft.switchType', { ...scope, targetType: 'direct', expectedPublishedRevision: preview.publishedRevision,
    expectedDraftRevision: preview.draftRevision, previewToken: preview.token, confirmDiscard: true });
}
async function imageClipboardFixture() {
  let text = '', unreadable = false;
  const port: ClipboardTextPort = { async readText() { if (unreadable) throw Error('clipboard unavailable'); return text; }, async writeText(value) { text = value; } };
  const source = await fixture(port), target = await fixture(port);
  const draft = await directDraft(source), assetId = source.source.ids.unboundImage;
  const refs = [30, 80].map(width => ({ placementId: randomUUID(), assetId, fileName: assetId + '.png', mime: 'image/png' as const, role: 'analysis' as const, width }));
  await source.client.call('draft.save', { ...source.scope, expectedPublishedRevision: 1, expectedDraftRevision: draft.revision,
    fields: { title: '跨数据库两张图', payload: { encoding: 'direct-v1', mode: 'direct', fields: { body: refs.map(r => `![图](${placementUrl({ assetId, placementId: r.placementId, width: r.width })})`).join('\n\n'), source: '' } }, mediaRefs: refs } });
  await source.client.call('card.clipboard.copy', { ...source.scope, expectedPublishedRevision: 1, expectedDraftRevision: 2 });
  const scope = { cardId: target.source.ids.memory, deckId: target.source.ids.mDeck };
  await directDraft(target, scope);
  const expectation = { ...scope, expectedPublishedRevision: 1, expectedDraftRevision: 1 };
  return { source, target, refs, expectation, get text() { return text; }, set text(value) { text = value; }, set unreadable(value: boolean) { unreadable = value; }, close() { source.close(); target.close(); } };
}
test('T14 binary clipboard crosses independent databases/decks, previews without writes and remaps Asset/Placement 30/80; retry and backup are exact', async () => {
  const f = await imageClipboardFixture();
  try {
    const marker = '<!-- ganksoft-card:2 -->\n', archive = JSON.parse(f.text.slice(marker.length));
    assert.equal(archive.images.length, 1);
    assert.equal(archive.fields.mediaRefs.length, 2);
    assert.equal(archive.cardId, undefined);
    const db = f.target.ctx.db, before = inspectDatabaseBaseline(join(f.target.ctx.dataDir, 'ganksoft.sqlite'), f.target.ctx.dataDir);
    const preview = await f.target.client.call('card.clipboard.preview', f.expectation);
    assert.equal(preview.imageCount, 1);
    assert.equal(preview.switchRequired, false);
    assert.ok(!JSON.stringify(preview).includes('base64'));
    assert.equal(inspectDatabaseBaseline(join(f.target.ctx.dataDir, 'ganksoft.sqlite'), f.target.ctx.dataDir).digest, before.digest);
    const history = db.prepare('SELECT * FROM learning_review_events ORDER BY id').all(), links = db.prepare('SELECT * FROM memory_knowledge ORDER BY card_id,knowledge_id').all();
    const req = f.target.client.prepare('card.clipboard.apply', { ...f.expectation, previewToken: preview.token, confirmOverwrite: true });
    const result = await f.target.client.send(req);
    assert.equal((await f.target.client.call("draft.get",{cardId:f.expectation.cardId,deckId:f.expectation.deckId}))!.revision,1);
    assert.equal(result.mediaRefs.length, 2);
    assert.equal(new Set(result.mediaRefs.map(r => r.assetId)).size, 1);
    for (const [i, ref] of result.mediaRefs.entries()) {
      assert.notEqual(ref.assetId, f.refs[i].assetId);
      assert.notEqual(ref.placementId, f.refs[i].placementId);
      assert.equal(ref.width, f.refs[i].width);
      assert.deepEqual(readFileSync(join(f.target.ctx.dataDir, 'attachments', ref.fileName)), readFileSync(join(f.source.ctx.dataDir, 'attachments', f.refs[i].fileName)));
      assert.equal(result.payload.encoding, 'direct-v1');
      if (result.payload.encoding === 'direct-v1') assert.ok(result.payload.fields.body.includes(placementUrl({ assetId: ref.assetId, placementId: ref.placementId, width: ref.width! })));
    }
    f.unreadable = true;
    assert.deepEqual(await f.target.client.send(req), result);
    f.unreadable = false;
    assert.deepEqual(db.prepare('SELECT * FROM learning_review_events ORDER BY id').all(), history);
    assert.deepEqual(db.prepare('SELECT * FROM memory_knowledge ORDER BY card_id,knowledge_id').all(), links);
    validateUnifiedData(db);
    const saved = await f.target.client.call("draft.save", {...f.expectation,fields:result});
    const file = join(f.target.source.root, 'clipboard-backup.zip'), restored = join(f.target.source.root, 'clipboard-restored');
    await createBackup(db, f.target.ctx.dataDir, file);
    await stageBackup(file, restored);
    const reopened = new DatabaseSync(join(restored, 'ganksoft.sqlite'));
    try { assert.deepEqual(readWorkspaceDraft({ ...f.target.ctx, db: reopened, dataDir: restored }, { cardId: f.expectation.cardId, deckId: f.expectation.deckId }), saved); }
    finally { reopened.close(); }
    f.target.reopen();
    assert.deepEqual(await f.target.client.call('draft.get', { cardId: f.expectation.cardId, deckId: f.expectation.deckId }), saved);
  } finally { f.close(); }
});
test('T14 clipboard changes, missing/corrupt binary and mode drift reject without changing draft, files or history', async () => {
  const f = await imageClipboardFixture();
  try {
    const original = f.text, marker = '<!-- ganksoft-card:2 -->\n';
    const preview = await f.target.client.call('card.clipboard.preview', f.expectation);
    const before = inspectDatabaseBaseline(join(f.target.ctx.dataDir, 'ganksoft.sqlite'), f.target.ctx.dataDir).digest;
    f.text = original + ' ';
    await assert.rejects(() => f.target.client.call('card.clipboard.apply', { ...f.expectation, previewToken: preview.token, confirmOverwrite: true }), code('PREVIEW_EXPIRED'));
    for (const change of [
      (a: any) => { a.images = []; },
      (a: any) => { a.images[0].base64 = 'invalid!'; },
      (a: any) => { a.fields.mediaRefs[0].width = 99; },
      (a: any) => { a.images[0].mime = 'image/jpeg'; },
      (a: any) => { a.images[0].base64 = Buffer.from('not an image').toString('base64'); },
    ]) {
      const archive = JSON.parse(original.slice(marker.length)); change(archive); f.text = marker + JSON.stringify(archive);
      await assert.rejects(() => f.target.client.call('card.clipboard.preview', f.expectation));
      assert.equal(inspectDatabaseBaseline(join(f.target.ctx.dataDir, 'ganksoft.sqlite'), f.target.ctx.dataDir).digest, before);
    }
    f.text = original;
    const current = (await f.target.client.call('draft.get', { cardId: f.expectation.cardId, deckId: f.expectation.deckId }))!;
    await f.target.client.call('draft.save', { ...f.expectation, fields: { title: '另一窗口', payload: current.payload, mediaRefs: current.mediaRefs } });
    await assert.rejects(() => f.target.client.call('card.clipboard.apply', { ...f.expectation, previewToken: preview.token, confirmOverwrite: true }), code('DRAFT_REVISION_CONFLICT'));
  } finally { f.close(); }
});
test('T14 clipboard receipt/draft failures clean only newly imported files after full host rollback, original request can retry', async () => {
  const f = await imageClipboardFixture();
  try {
    const db = f.target.ctx.db, directory = join(f.target.ctx.dataDir, 'attachments'), files = readdirSync(directory).sort();
    const preview = await f.target.client.call('card.clipboard.preview', f.expectation);
    const req = f.target.client.prepare('card.clipboard.apply', { ...f.expectation, previewToken: preview.token, confirmOverwrite: true });
    db.exec("CREATE TEMP TRIGGER fail_clipboard_receipt BEFORE INSERT ON protocol_receipts WHEN NEW.method='card.clipboard.apply' BEGIN SELECT RAISE(ABORT,'injected clipboard receipt failure'); END");
    await assert.rejects(() => f.target.client.send(req));
    assert.deepEqual(readdirSync(directory).sort(), files);
    assert.equal((await f.target.client.call('draft.get', { cardId: f.expectation.cardId, deckId: f.expectation.deckId }))!.revision, 1);
    db.exec('DROP TRIGGER fail_clipboard_receipt');
    const result = await f.target.client.send(req);
    assert.equal((await f.target.client.call("draft.get",{cardId:f.expectation.cardId,deckId:f.expectation.deckId}))!.revision,1);
    assert.equal(result.mediaRefs.length,2);
    assert.equal(readdirSync(directory).length, files.length + 1);
    const sync = f.target.protocol.executeSync(f.target.client.prepare('card.clipboard.apply', { ...f.expectation, expectedDraftRevision: 2, previewToken: preview.token, confirmOverwrite: true }));
    assert.equal(sync.ok, false);
    if (!sync.ok) assert.equal(sync.error.code, 'ASYNC_COORDINATOR_REQUIRED');
  } finally { f.close(); }
});

test('T14 concurrent asynchronous clipboard reads retain per-request text rather than sharing the last snapshot', async () => {
  let text = '', defer = false;
  const reads: ((text: string) => void)[] = [];
  let both: () => void = () => {};
  const readStarted = new Promise<void>(resolve => { both = resolve; });
  const f = await fixture({ async readText() {
    if (!defer) return text;
    return new Promise<string>(resolve => { reads.push(resolve); if (reads.length === 2) both(); });
  }, async writeText(value) { text = value; } });
  try {
    const draft = await directDraft(f);
    const { copyCardContent } = await import('../shared/cards/clipboard.ts');
    const fields = { title: draft.title, payload: draft.payload, mediaRefs: draft.mediaRefs };
    const a = copyCardContent({ ...fields, title: '独立请求A' }), b = copyCardContent({ ...fields, title: '独立请求B' });
    const expectation = { ...f.scope, expectedPublishedRevision: 1, expectedDraftRevision: 1 };
    text = a;
    const previewA = await f.client.call('card.clipboard.preview', expectation);
    text = b;
    const previewB = await f.client.call('card.clipboard.preview', expectation);
    defer = true;
    const pendingA = f.client.call('card.clipboard.apply', { ...expectation, previewToken: previewA.token, confirmOverwrite: true });
    const pendingB = f.client.call('card.clipboard.apply', { ...expectation, previewToken: previewB.token, confirmOverwrite: true });
    const settled = Promise.allSettled([pendingA, pendingB]);
    await readStarted;
    // Resolve in the same turn: a shared asynchronous cache deterministically
    // substitutes B's text into A and fails A's token validation.
    reads[0](a); reads[1](b);
    const [resultA, resultB] = await settled;
    assert.equal(resultA.status, 'fulfilled');
    if (resultA.status === 'fulfilled') assert.equal(resultA.value.title, '独立请求A');
    assert.equal(resultB.status, 'fulfilled');
    if(resultB.status==='fulfilled')assert.equal(resultB.value.title,'独立请求B');
    assert.equal((await f.client.call('draft.get',f.scope))!.title,draft.title);
    assert.equal((await f.client.call('draft.get',f.scope))!.revision,1);
  } finally { f.close(); }
});

test('S3b3 new drafts reserve identity only, support every mode and never create formal content, cycles, history or legacy carriers', async () => {
  const f = await fixture();
  try {
    const db=f.ctx.db, tables=['learning_cards','learning_content_versions','learning_study_cycles','learning_review_events','questions','memory_cards'];
    const before=tables.map(t=>db.prepare(`SELECT count(*) n FROM ${t}`).get()!.n);
    for(const initialType of ['question','qa','direct'] as const) {
      const req=f.client.prepare('draft.create',{deckId:f.scope.deckId,initialType});
      const draft=await f.client.send(req);
      assert.deepEqual(await f.client.send(req),draft);
      assert.equal(draft.basePublishedRevision,0);
      assert.equal(draft.origin.strategy,'unpublished');
      assert.equal(draft.origin.versionId,null);
      assert.equal(draft.draftType,initialType);
      const scope={cardId:draft.cardId,deckId:f.scope.deckId};
      assert.deepEqual(await f.client.call('draft.get',scope),draft);
      const inbox=await f.client.call('draft.listSummary',{deckId:f.scope.deckId,limit:100});
      const summary=inbox.items.find(x=>x.cardId===draft.cardId)!;
      assert.equal(summary.isNew,true);assert.equal(summary.publishedRevision,0);
      assert.equal('payload' in summary,false);assert.equal('mediaRefs' in summary,false);
      assert.ok(!(await f.client.call('draft.listSummary',{deckId:f.source.ids.mDeck})).items.some(x=>x.cardId===draft.cardId));
      assert.ok(!(await f.client.call('card.listSummary',{deckId:f.scope.deckId})).items.some(c=>c.cardId===draft.cardId));
      await assert.rejects(()=>f.client.call('card.getPublishedContent',scope),code('DECK_CONFLICT'));
      await assert.rejects(()=>f.client.call('draft.get',{...scope,deckId:f.source.ids.mDeck}),code('DECK_CONFLICT'));
      assert.throws(()=>new Application(f.ctx).handle('question.save',{id:draft.cardId}),code('LEGACY_OWNER_CONFLICT'));
      await assert.rejects(()=>f.client.call('card.publish',{...scope,expectedPublishedRevision:0,expectedDraftRevision:1,resetStudyCycle:false}),code('PUBLISH_INCOMPLETE'));
      assert.equal((await f.client.call('draft.get',scope))!.revision,1);
    }
    const collected:string[]=[];let after:string|null=null;
    do { const page=await f.client.call('draft.listSummary',{deckId:f.scope.deckId,after,limit:1});collected.push(...page.items.map(x=>x.cardId));after=page.nextCursor; } while(after);
    assert.equal(collected.length,3);assert.equal(new Set(collected).size,3);
    assert.deepEqual(tables.map(t=>db.prepare(`SELECT count(*) n FROM ${t}`).get()!.n),before);
    validateUnifiedData(db);
    f.reopen();
    assert.equal(f.ctx.db.prepare("SELECT count(*) n FROM settings WHERE key LIKE 'new-card-draft:%'").get()!.n,3);
  } finally { f.close(); }
});
test('S3b3 new-draft save/switch CAS, first publication and receipt failure remain atomic, retry/reopen create exactly one formal card', async () => {
  const f=await fixture();
  try {
    const draft=await f.client.call('draft.create',{deckId:f.scope.deckId,initialType:'question'}),scope={cardId:draft.cardId,deckId:f.scope.deckId};
    const preview=await f.client.call('draft.previewSwitch',{...scope,targetType:'direct'});
    assert.equal(preview.origin.strategy,'unpublished');
    assert.equal(preview.publishedRevision,0);
    assert.deepEqual(await f.client.call('draft.get',scope),draft);
    const switched=await f.client.call('draft.switchType',{...scope,targetType:'direct',expectedPublishedRevision:0,expectedDraftRevision:1,previewToken:preview.token,confirmDiscard:true});
    assert.equal(switched.revision,2);
    await f.client.call('draft.save',{...scope,expectedPublishedRevision:0,expectedDraftRevision:2,fields:{title:'首次发布',payload:{encoding:'direct-v1',mode:'direct',fields:{body:'真实新卡正文',source:''}},mediaRefs:[]}});
    await assert.rejects(()=>f.client.call('draft.save',{...scope,expectedPublishedRevision:0,expectedDraftRevision:2,fields:{title:'陈旧覆盖',payload:switched.payload,mediaRefs:[]}}),code('DRAFT_REVISION_CONFLICT'));
    const db=f.ctx.db,before=db.prepare('SELECT * FROM learning_review_events ORDER BY id').all();
    db.exec("CREATE TEMP TRIGGER reject_first_publish BEFORE INSERT ON protocol_receipts WHEN NEW.method='card.publish' BEGIN SELECT RAISE(ABORT,'injected first publication receipt failure'); END");
    const req=f.client.prepare('card.publish',{...scope,expectedPublishedRevision:0,expectedDraftRevision:3,resetStudyCycle:false});
    await assert.rejects(()=>f.client.send(req));
    assert.equal(db.prepare('SELECT 1 FROM learning_cards WHERE id=?').get(scope.cardId),undefined);
    assert.equal(db.prepare('SELECT 1 FROM learning_content_versions WHERE card_id=?').get(scope.cardId),undefined);
    assert.equal((await f.client.call('draft.get',scope))!.revision,3);
    db.exec('DROP TRIGGER reject_first_publish');
    const result=await f.client.send(req);
    assert.equal(result.revision,1);
    assert.equal(result.resetStudyCycle,false);
    assert.deepEqual(await f.client.send(req),result);
    assert.equal(await f.client.call('draft.get',scope),null);
    assert.equal(db.prepare('SELECT count(*) n FROM learning_study_cycles WHERE card_id=?').get(scope.cardId)!.n,1);
    assert.equal(db.prepare('SELECT count(*) n FROM learning_content_versions WHERE card_id=?').get(scope.cardId)!.n,1);
    assert.equal(db.prepare('SELECT 1 FROM questions WHERE id=?').get(scope.cardId),undefined);
    assert.equal(db.prepare('SELECT 1 FROM memory_cards WHERE id=?').get(scope.cardId),undefined);
    assert.deepEqual(db.prepare('SELECT * FROM learning_review_events ORDER BY id').all(),before);
    const audit=JSON.parse(String(db.prepare("SELECT detail FROM audits WHERE action='首次发布卡片' ORDER BY id DESC LIMIT 1").get()!.detail));
    assert.equal(audit.reason,'initial-publication');assert.equal(audit.resetStudyCycle,false);
    assert.ok((await f.client.call('card.listSummary',{deckId:scope.deckId})).items.some(c=>c.cardId===scope.cardId));
    validateUnifiedData(db);f.reopen();
    assert.equal((await f.client.call('card.getPublishedContent',scope)).versionId,result.versionId);
  } finally { f.close(); }
});
test('S3b3 copied images into an unpublished new draft survive full backup and reject damaged envelope/media scope', async () => {
  const f=await imageClipboardFixture();
  try {
    const d=await f.target.client.call('draft.create',{deckId:f.target.source.ids.mDeck,initialType:'direct'}),scope={cardId:d.cardId,deckId:f.target.source.ids.mDeck};
    const expected={...scope,expectedPublishedRevision:0,expectedDraftRevision:1};
    const p=await f.target.client.call('card.clipboard.preview',expected);
    const pasted=await f.target.client.call('card.clipboard.apply',{...expected,previewToken:p.token,confirmOverwrite:true});
    assert.deepEqual(await f.target.client.call('draft.get',scope),d);
    const saved=await f.target.client.call('draft.save',{...expected,fields:pasted});
    assert.equal(saved.origin.strategy,'unpublished');assert.equal(saved.basePublishedRevision,0);
    assert.deepEqual(saved.mediaRefs.map(r=>r.width),[30,80]);
    const file=join(f.target.source.root,'new-draft.zip'),restored=join(f.target.source.root,'new-draft-restored');
    await createBackup(f.target.ctx.db,f.target.ctx.dataDir,file);await stageBackup(file,restored);
    const db=new DatabaseSync(join(restored,'ganksoft.sqlite'));
    try { assert.deepEqual(readWorkspaceDraft({...f.target.ctx,db,dataDir:restored},scope),saved); }
    finally { db.close(); }
    const key='new-card-draft:'+d.cardId,old=String(f.target.ctx.db.prepare('SELECT value FROM settings WHERE key=?').get(key)!.value),bad=JSON.parse(old);
    bad.deckId=f.target.source.ids.qDeck;
    f.target.ctx.db.prepare('UPDATE settings SET value=? WHERE key=?').run(JSON.stringify(bad),key);
    const damaged=join(f.target.source.root,'invalid-new-draft.zip');
    await createBackup(f.target.ctx.db,f.target.ctx.dataDir,damaged);
    await assert.rejects(()=>stageBackup(damaged,join(f.target.source.root,'invalid-new-draft-stage')));
    f.target.ctx.db.prepare('UPDATE settings SET value=? WHERE key=?').run(old,key);
    f.target.reopen();assert.deepEqual(await f.target.client.call('draft.get',scope),saved);
  } finally { f.close(); }
});
test('S3b3 draft creation is not available on production604 and an injected creation receipt failure leaves no provisional data', async () => {
  const legacy=schema604Fixture();
  try {
    const host=createApplicationProtocol(new Application({db:legacy.db,dataDir:legacy.dataDir,now:()=>new Date(legacy.at)}));
    const client=createClient(r=>host.execute(r));await client.call('app.capabilities',{});
    await assert.rejects(()=>client.call('draft.create',{deckId:legacy.ids.qDeck,initialType:'qa'}),code('MIGRATION_NOT_ACTIVATED'));
    assert.equal(legacy.db.prepare("SELECT 1 FROM settings WHERE key LIKE 'new-card-draft:%'").get(),undefined);
  } finally {legacy.close();}
  const f=await fixture();
  try {
    f.ctx.db.exec("CREATE TEMP TRIGGER reject_draft_creation BEFORE INSERT ON protocol_receipts WHEN NEW.method='draft.create' BEGIN SELECT RAISE(ABORT,'injected create receipt failure'); END");
    const req=f.client.prepare('draft.create',{deckId:f.scope.deckId,initialType:'qa'});
    await assert.rejects(()=>f.client.send(req));
    assert.equal(f.ctx.db.prepare("SELECT 1 FROM settings WHERE key LIKE 'new-card-draft:%'").get(),undefined);
    f.ctx.db.exec('DROP TRIGGER reject_draft_creation');
    const d=await f.client.send(req);assert.deepEqual(await f.client.send(req),d);
    assert.equal(f.ctx.db.prepare("SELECT count(*) n FROM settings WHERE key LIKE 'new-card-draft:%'").get()!.n,1);
  } finally {f.close();}
});

test('S3b3 deck soft delete/restore retains unpublished drafts; old permanent purge cannot orphan their identities', async () => {
  const f=await fixture();
  try {
    const app=new Application(f.ctx);
    const deckId=String(app.handle('deck.save',{name:'只有未发布草稿',kind:'question'}));
    const d=await f.client.call('draft.create',{deckId,initialType:'qa'}),scope={cardId:d.cardId,deckId};
    app.handle('deck.action',{id:deckId,action:'delete'});
    await assert.rejects(()=>f.client.call('draft.get',scope),code('DECK_CONFLICT'));
    const selected={items:[{kind:'deck',id:deckId}]};
    const preview=app.handle('trash.preview',selected) as {revision:string};
    assert.throws(()=>app.handle('trash.manage',{...selected,action:'purge',expected:preview.revision}),code('PENDING_DRAFTS_PROTECTED'));
    assert.ok(f.ctx.db.prepare('SELECT 1 FROM decks WHERE id=?').get(deckId));
    app.handle('deck.action',{id:deckId,action:'restore'});
    assert.deepEqual(await f.client.call('draft.get',scope),d);
    validateUnifiedData(f.ctx.db);
  } finally {f.close();}
});

test('T09 explicit legacy option normalization preserves raw evidence, requires manual IDs/answer and leaves the published version immutable', async () => {
  const f=await fixture();
  try {
    const {normalizeLegacyQuestionDraft}=await import('../shared/cards/mapping.ts');
    const old=await f.client.call('card.getPublishedContent',f.scope);
    assert.equal(old.payload!.encoding,'legacy-question-604');
    const fields=normalizeLegacyQuestionDraft({title:old.title,payload:old.payload!,mediaRefs:old.mediaRefs});
    assert.equal(fields.payload.encoding,'question-v1');
    if(fields.payload.encoding!=='question-v1'||old.payload!.encoding!=='legacy-question-604')throw Error('fixture mode');
    assert.deepEqual(fields.payload.fields.options,[]);assert.equal(fields.payload.fields.correctOptionId,null);
    assert.ok(fields.payload.fields.analysis.includes(old.payload!.fields.options));
    assert.ok(fields.payload.fields.analysis.includes(old.payload!.fields.answer));
    await f.client.call('draft.save',{...f.scope,expectedPublishedRevision:1,expectedDraftRevision:null,fields});
    await assert.rejects(()=>f.client.call('card.publish',{...f.scope,expectedPublishedRevision:1,expectedDraftRevision:1,resetStudyCycle:false}),code('PUBLISH_INCOMPLETE'));
    fields.payload.fields.options=[{optionId:'manual:a',position:0,markdown:'甲'},{optionId:'manual:b',position:1,markdown:'乙'}];
    fields.payload.fields.correctOptionId='manual:b';
    await f.client.call('draft.save',{...f.scope,expectedPublishedRevision:1,expectedDraftRevision:1,fields});
    const published=await f.client.call('card.publish',{...f.scope,expectedPublishedRevision:1,expectedDraftRevision:2,resetStudyCycle:false});
    assert.equal(published.publishedType,'question');
    assert.deepEqual(await f.client.call('content.getVersion',{...f.scope,versionId:old.versionId}),old);
    const current=await f.client.call('card.getPublishedContent',f.scope);
    assert.equal(current.payload!.encoding,'question-v1');validateUnifiedData(f.ctx.db);
  } finally {f.close();}
});
