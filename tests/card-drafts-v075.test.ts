import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { rmSync } from "node:fs";
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

async function fixture() {
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
  const host = () => createApplicationProtocol(new Application(ctx));
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
