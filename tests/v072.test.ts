import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Transformer } from "@napi-rs/image";
import { openDatabase, transaction } from "./fixture.ts";
import { Application } from "../electron/application.ts";
import { createApplicationProtocol } from "../electron/protocol/gateway.ts";
import { createClient } from "../shared/protocol/client.ts";
import { registry } from "../shared/protocol/registry.ts";
import { DomainError } from "../shared/domain-error.ts";
import {
  StudyFilters,
  filterStudyCards,
  sampleKnowledge,
  randomKnowledgeCandidates,
  knowledgeGroups,
  toggleKnowledgeSelection,
  type QueryCard,
} from "../shared/study-query.ts";
import { nextKnowledgeName } from "../shared/knowledge-names.ts";
import {
  studyQuery,
  studyPreflight,
} from "../electron/modules/analytics/study-query.ts";
import {
  stageImage,
  saveQuestionImages,
} from "../electron/modules/media/drafts.ts";
import {
  createBackup,
  stageBackup,
} from "../electron/infrastructure/backup.ts";
import { cardReviewStats } from "../electron/modules/review/analytics.ts";
function fixture(platform: any = {}) {
  const dir = mkdtempSync(join(tmpdir(), "gank072-")),
    db = openDatabase(join(dir, "ganksoft.sqlite")),
    app = new Application({
      db,
      dataDir: dir,
      now: () => new Date("2026-10-18T08:00:00Z"),
    });
  return {
    dir,
    db,
    app,
    client: createClient(
      createApplicationProtocol(app, () => {}, platform).execute,
    ),
    close() {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
function q(f: ReturnType<typeof fixture>, p: any = {}) {
  return f.app.handle("question.save", {
    module: "question-default",
    stem: "测试题",
    answer: "B",
    ...p,
  }) as string;
}
const pixel = () =>
  Transformer.fromRgbaPixels(Buffer.from([50, 60, 70, 255]), 1, 1).pngSync();
const base: QueryCard = {
  id: "a",
  title: "a",
  text: "题目 增长率",
  knowledgeIds: ["child"],
  paused: false,
  ready: true,
  dueAt: "2026-10-17T00:00:00Z",
  createdAt: "2026-01-01T00:00:00Z",
  lastReviewAt: "2026-10-18T15:59:59Z",
  firstReviewAt: "2026-10-01T00:00:00Z",
  reviewCount: 3,
  totalReviews: 4,
  failures: 2,
  lastFailed: true,
  repeated: true,
  uncertain: false,
};
test("v072 smallest free naming suffix", () => {
  assert.equal(nextKnowledgeName(["新知识点1", "新知识点3"]), "新知识点2");
  assert.equal(nextKnowledgeName(["新知识点1000", "新知识点"]), "新知识点1");
});
test("v072 lost reply is reconciled by a read without executing the command twice", async () => {
  const f = fixture();
  try {
    await f.client.call("app.capabilities", {});
    const payload = { deckId: "question-default", stem: "回包丢失", answer: "B" as const };
    const request = f.client.prepare("content.question.save", payload);
    await f.client.send(request); // The caller loses this reply after the transaction commits.
    const before = f.db.prepare("SELECT count(*) AS n FROM questions").get() as any;
    const revision = f.db.prepare("SELECT * FROM protocol_meta").all();
    const result = await f.client.call("operation.status", { requestId: request.requestId, method: request.method, payload });
    assert.equal(result.state, "committed");
    assert.equal((result.response as any).requestId, request.requestId);
    assert.deepEqual(f.db.prepare("SELECT * FROM protocol_meta").all(), revision);
    assert.deepEqual(f.db.prepare("SELECT count(*) AS n FROM questions").get(), before);
    await assert.rejects(() => f.client.call("operation.status", { requestId: request.requestId, method: request.method, payload: { ...payload, stem: "不同内容" } }), /请求编号/);
    assert.equal((await f.client.call("operation.status", { requestId: randomUUID(), method: request.method, payload })).state, "unknown");
  } finally { f.close(); }
});
test("v072 pending and rejected image outcomes are distinguished without replay", async () => {
  let finish!: (value: never[]) => void;
  let calls = 0;
  const f = fixture({ "media.stage": async () => { calls++; return new Promise<never[]>((resolve) => { finish = resolve; }); } });
  try {
    await f.client.call("app.capabilities", {});
    const payload = { deckId: "question-default", purpose: "question" as const, source: "file" as const };
    const request = f.client.prepare("media.stage", payload);
    const running = f.client.send(request);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal((await f.client.call("operation.status", { requestId: request.requestId, method: request.method, payload })).state, "pending");
    finish([]);
    await running;
    assert.equal((await f.client.call("operation.status", { requestId: request.requestId, method: request.method, payload })).state, "committed");
    assert.equal(calls, 1);
    for (const method of ["media.import", "media.paste", "media.remove"] as const) {
      await assert.rejects(() => f.client.call(method, (method === "media.remove" ? { id: "legacy" } : { cardId: "legacy", role: "question" }) as never), /卡片编辑器/);
    }
  } finally { f.close(); }
});
test("v072 candidate scopes and unique bounded sampling", () => {
  const cards = [base, { ...base, knowledgeIds: ["other"] }];
  assert.deepEqual(randomKnowledgeCandidates("eligible", cards, [base], []), [
    "child",
    "other",
  ]);
  assert.deepEqual(randomKnowledgeCandidates("visible", cards, [base], []), [
    "child",
  ]);
  assert.deepEqual(
    randomKnowledgeCandidates("checked", cards, [], ["other", "empty"]),
    ["other"],
  );
  assert.equal(sampleKnowledge(["a", "a", "b"], 20).length, 2);
  for (const n of [0, 21, 1.5]) assert.throws(() => sampleKnowledge(["a"], n));
  assert.deepEqual(sampleKnowledge([], 3), []);
});
test("v072 weighted sampling handles zero history without replacement", () =>
  assert.deepEqual(
    sampleKnowledge(
      ["a", "b", "c"],
      2,
      new Map([
        ["a", 1],
        ["b", 0.1],
        ["c", 0.1],
      ]),
      () => 0,
    ),
    ["a", "b"],
  ));
test("v072 calendar endpoints and absent review dates", () => {
  const f = StudyFilters.parse({
      date: { range: "custom", start: "2026-10-18", end: "2026-10-18" },
    }),
    w = { start: "2026-10-18", end: "2026-10-18", timeZone: "Asia/Shanghai" };
  assert.equal(filterStudyCards([base], f, [], w, new Date()).length, 1);
  assert.equal(
    filterStudyCards(
      [{ ...base, lastReviewAt: "2026-10-18T16:00:00Z" }],
      f,
      [],
      w,
      new Date(),
    ).length,
    0,
  );
  assert.equal(
    filterStudyCards([{ ...base, lastReviewAt: null }], f, [], w, new Date())
      .length,
    0,
  );
  assert.equal(
    filterStudyCards(
      [{ ...base, lastReviewAt: null }],
      StudyFilters.parse({}),
      [],
      { ...w, start: null, end: null },
      new Date(),
    ).length,
    1,
  );
  assert.throws(() =>
    StudyFilters.parse({
      date: { range: "custom", start: "2026-02-30", end: "2026-03-01" },
    }),
  );
});
test("v072 DST both repeated hours are included", () => {
  const cards = ["2026-11-01T05:30:00Z", "2026-11-01T06:30:00Z"].map(
    (lastReviewAt, i) => ({ ...base, id: String(i), lastReviewAt }),
  );
  assert.equal(
    filterStudyCards(
      cards,
      StudyFilters.parse({}),
      [],
      { start: "2026-11-01", end: "2026-11-01", timeZone: "America/New_York" },
      new Date(),
    ).length,
    2,
  );
});
test("v072 descendants, counts, pause and filters remain pure", () => {
  const nodes = [
      { id: "parent", parent_id: null },
      { id: "child", parent_id: "parent" },
    ],
    f = StudyFilters.parse({ knowledge: ["parent"] }),
    w = { start: null, end: null, timeZone: "UTC" };
  assert.equal(filterStudyCards([base], f, nodes, w, new Date()).length, 1);
  assert.equal(
    filterStudyCards(
      [base],
      { ...f, includeChildren: false },
      nodes,
      w,
      new Date(),
    ).length,
    0,
  );
  assert.equal(
    filterStudyCards([{ ...base, paused: true }], f, nodes, w, new Date())
      .length,
    0,
  );
  assert.equal(
    filterStudyCards([base], { ...f, minReviews: 4 }, nodes, w, new Date())
      .length,
    0,
  );
  assert.equal(base.knowledgeIds[0], "child");
});
test("v072 child deselection releases ancestor coverage and preserves siblings", () => {
  const nodes = [
    { id: "p", parent_id: null },
    { id: "a", parent_id: "p" },
    { id: "b", parent_id: "p" },
  ];
  assert.deepEqual(toggleKnowledgeSelection([], "p", nodes, true), ["p"]);
  assert.deepEqual(toggleKnowledgeSelection(["p"], "a", nodes, true), ["b"]);
  assert.deepEqual(toggleKnowledgeSelection(["p"], "p", nodes, true), []);
});
test("v072 actual dates and read-only deck isolation", () => {
  const f = fixture();
  try {
    const id = q(f),
      other = q(f, { module: "数量" }),
      before = (f.db.prepare("SELECT count(*) n FROM audits").get() as any).n,
      r = studyQuery(f.app.ctx, {
        deckId: "question-default",
        filters: StudyFilters.parse({}),
      });
    assert.deepEqual(r.matched, [id]);
    assert(!r.matched.includes(other));
    assert.equal(r.eligible[0].createdAt, "2026-10-18T08:00:00.000Z");
    assert.equal(r.eligible[0].lastReviewAt, null);
    assert.equal(
      (f.db.prepare("SELECT count(*) n FROM audits").get() as any).n,
      before,
    );
    const recent = studyQuery(f.app.ctx, {
      deckId: "question-default",
      filters: StudyFilters.parse({ date: { range: "7" } }),
    });
    assert.equal(recent.matched.length, 0);
    assert.equal(recent.window.start, "2026-10-12");
  } finally {
    f.close();
  }
});
test("v072 preflight excludes foreign, paused and deleted cards", () => {
  const f = fixture();
  try {
    const a = q(f),
      b = q(f),
      c = q(f, { module: "数量" });
    f.app.handle("plan.set", { id: b, action: "pause" });
    assert.deepEqual(
      studyPreflight(f.app.ctx, {
        deckId: "question-default",
        ids: [a, b, c],
        includePaused: false,
      }).ids,
      [a],
    );
    assert.deepEqual(
      studyPreflight(f.app.ctx, {
        deckId: "question-default",
        ids: [b],
        includePaused: true,
      }).ids,
      [b],
    );
    assert.equal(
      (
        f.db
          .prepare("SELECT paused FROM plans WHERE question_id=?")
          .get(b) as any
      ).paused,
      1,
    );
  } finally {
    f.close();
  }
});
test("v072 memory creation date exists; import time is not fabricated", () => {
  const f = fixture();
  try {
    f.app.handle("memory.save", {
      module: "常识",
      title: "记忆",
      cue: "提示",
      content: "内容",
    });
    const r = studyQuery(f.app.ctx, {
      deckId: "常识",
      filters: StudyFilters.parse({
        dateField: "createdAt",
        date: { range: "7" },
      }),
    });
    assert.equal(r.matched.length, 1);
    assert(!Object.hasOwn(r.eligible[0], "importedAt"));
  } finally {
    f.close();
  }
});
test("v072 image staging and atomic add/delete rollback", async () => {
  const f = fixture();
  try {
    await f.client.call("app.capabilities", {});
    const id = q(f),
      meta = stageImage(
        f.app.ctx,
        "question-default",
        "question",
        pixel(),
        "image/png",
      );
    assert.equal(
      f.app.snapshot().questions.find((q) => q.id === id)!.assets.length,
      0,
    );
    await f.client.call("content.question.save", {
      id,
      deckId: "question-default",
      expectedRevision: 1,
      stem: "题",
      answer: "B",
      images: [{ id: meta.id, role: "question" }],
    });
    const row = f.app.snapshot().questions.find((q) => q.id === id)!;
    assert.equal(row.assets.length, 1);
    await assert.rejects(
      f.client.call("content.question.save", {
        id,
        deckId: "question-default",
        expectedRevision: row.version,
        stem: "不可写",
        answer: "B",
        images: [{ id: "invalid", role: "question" }],
      }),
    );
    assert.equal(
      f.app.snapshot().questions.find((q) => q.id === id)!.stem,
      "题",
    );
    await f.client.call("content.question.save", {
      id,
      deckId: "question-default",
      expectedRevision: row.version,
      stem: "题",
      answer: "B",
      images: [],
    });
    assert.equal(
      f.app.snapshot().questions.find((q) => q.id === id)!.assets.length,
      0,
    );
  } finally {
    f.close();
  }
});
test("v072 wrong-purpose and foreign-deck image drafts reject", () => {
  const f = fixture();
  try {
    const id = q(f),
      images = [
        stageImage(f.app.ctx, "数量", "question", pixel(), "image/png"),
        stageImage(
          f.app.ctx,
          "question-default",
          "response",
          pixel(),
          "image/png",
        ),
      ];
    for (const image of images)
      assert.throws(() =>
        transaction(f.db, () =>
          saveQuestionImages(f.app.ctx, id, "question-default", [
            { id: image.id, role: "question" },
          ]),
        ),
      );
    assert.equal(
      f.app.snapshot().questions.find((q) => q.id === id)!.assets.length,
      0,
    );
  } finally {
    f.close();
  }
});
test("v072 response image evidence survives full backup restore", async () => {
  const f = fixture();
  try {
    const id = q(f),
      img = stageImage(
        f.app.ctx,
        "question-default",
        "response",
        pixel(),
        "image/png",
      );
    f.app.handle("review.submit", {
      request_id: randomUUID(),
      protocol_version: 2,
      question_id: id,
      content_version: 1,
      answer: "B",
      thought: "独立计算",
      response_images: [img.id],
      self_score: 7,
      basis: "independent",
      understanding: 2,
      elapsed_seconds: 10,
    });
    assert.equal(
      cardReviewStats(f.app.ctx, {
        kind: "question",
        card_id: id,
      }).records[0].question!.assets.find((a) => a.role === "response")!.id,
      img.id,
    );
    assert.equal(
      f.app.snapshot().questions.find((q) => q.id === id)!.assets.length,
      0,
    );
    const path = join(f.dir, "backup.zip"),
      dest = join(f.dir, "restored");
    await createBackup(f.db, f.dir, path);
    await stageBackup(path, dest);
    const meta = JSON.parse(
      (
        f.db
          .prepare("SELECT value FROM settings WHERE key=?")
          .get("media-draft:" + img.id) as any
      ).value,
    );
    assert.deepEqual(
      readFileSync(join(dest, "attachments", meta.file_name)),
      pixel(),
    );
  } finally {
    f.close();
  }
});
test("v072 predictable clipboard rejection leaves no unknown lock", async () => {
  const f = fixture({
    "media.stage": async () => {
      throw new DomainError("MEDIA_REJECTED", "剪贴板无图片");
    },
  });
  try {
    await f.client.call("app.capabilities", {});
    await assert.rejects(
      f.client.call("media.stage", {
        deckId: "question-default",
        purpose: "question",
        source: "clipboard",
      }),
      (e: any) => e.code === "MEDIA_REJECTED",
    );
    assert.deepEqual(await f.client.call("maintenance.operations", {}), []);
  } finally {
    f.close();
  }
});
test("v072 relation editing APIs absent; legacy compatibility unaffected", () => {
  assert(!Object.hasOwn(registry, "knowledge.relation.save"));
  assert(!Object.hasOwn(registry, "knowledge.relation.delete"));
});
