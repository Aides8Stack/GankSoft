import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { openDatabase } from "./fixture.ts";
import { SCHEMA_VERSION } from "../electron/infrastructure/database.ts";
import { Application } from "../electron/application.ts";
function fixture() {
  const db = openDatabase(":memory:");
  let now = new Date("2026-10-15T08:00:00Z");
  const app = new Application({
    db,
    dataDir: ":memory:",
    now: () => new Date(now),
  });
  return {
    app,
    db,
    next: () => {
      now = new Date(+now + 86400000);
    },
    close: () => db.close(),
  };
}
function pkg() {
  return {
    format: "ganksoft.content",
    schemaVersion: "2.0",
    packageId: "pkg-001",
    namespace: "my-notes",
    archives: [
      {
        archiveId: "data-base",
        subject: "资料分析",
        version: "v1",
        nodes: [
          { key: "growth", name: "增长相关" },
          {
            key: "base",
            name: "基期量",
            parentKey: "growth",
            principle: "现期除以1加增长率",
          },
        ],
        relations: [
          { sourceKey: "growth", targetKey: "base", kind: "公式联系" },
        ],
      },
    ],
    items: [
      {
        key: "q-001",
        kind: "question",
        subject: "资料分析",
        title: "基期量例题",
        stem: "现期120，增长20%，基期？",
        answer: "B",
        analysis: "120/1.2=100",
        analysisOrigin: "source",
        knowledgeRefs: [
          { archiveId: "data-base", version: "v1", nodeKey: "base" },
        ],
      },
    ],
  } as any;
}
function commit(app: Application, p: any, options: any = {}) {
  const preview = app.handle("import.preview", { package: p, options });
  assert.deepEqual(preview.errors, []);
  return app.handle("import.commit", {
    package: p,
    options,
    expected: { checksum: preview.checksum, revision: preview.revision },
  });
}
test("exchange imports hierarchy, relations and exact question bindings atomically", () => {
  const { app, close } = fixture();
  try {
    const p = pkg();
    commit(app, p);
    const s = app.snapshot(),
      base = s.knowledge.find((k) => k.name === "基期量")!;
    assert.equal(s.questions.length, 1);
    assert.deepEqual(s.questions[0].knowledge_ids, [base.id]);
    assert.equal(
      s.knowledge.find((k) => k.id === base.parent_id)!.name,
      "增长相关",
    );
    assert.equal(s.archives.length, 1);
    assert.equal(s.relations.length, 1);
    assert.equal(s.questions[0].status, "ready");
  } finally {
    close();
  }
});
test("same package and entries are idempotent; changed identity cannot overwrite", () => {
  const { app, close } = fixture();
  try {
    const p = pkg();
    commit(app, p);
    assert.equal(commit(app, p).duplicate, true);
    const next = structuredClone(p);
    next.packageId = "pkg-002";
    commit(app, next);
    assert.equal(app.snapshot().questions.length, 1);
    next.items[0].stem = "内容已变化";
    const report = app.handle("import.preview", { package: next });
    assert.ok(report.errors.length > 0);
  } finally {
    close();
  }
});
test("version update preserves stable knowledge and question IDs, archived content immutable", () => {
  const { app, close } = fixture();
  try {
    const p = pkg();
    commit(app, p);
    const before = app.snapshot(),
      base = before.knowledge.find((k) => k.name === "基期量")!;
    const v2 = structuredClone(p);
    v2.packageId = "pkg-v2";
    v2.archives[0].version = "v2";
    v2.archives[0].nodes[1].name = "基期量计算";
    v2.items = [];
    assert.equal(
      app
        .handle("import.preview", { package: v2 })
        .nodes.find((n: any) => n.nodeKey === "base").action,
      "keep",
    );
    commit(app, v2, { allowKnowledgeUpdates: true });
    assert.equal(
      app.snapshot().knowledge.find((k) => k.name === "基期量计算")!.id,
      base.id,
    );
    assert.equal(app.snapshot().questions[0].knowledge_ids[0], base.id);
    assert.equal(
      JSON.parse(
        app.snapshot().archives.find((a) => a.version_label === "v1")!.content,
      ).nodes[1].name,
      "基期量",
    );
    v2.packageId = "modified-v2";
    v2.archives[0].nodes[1].name = "偷偷覆盖";
    assert.ok(
      app
        .handle("import.preview", {
          package: v2,
          options: { allowKnowledgeUpdates: true },
        })
        .errors.some((e: string) => e.includes("不允许改写")),
    );
  } finally {
    close();
  }
});
test("knowledge-first package supports later item-only references to stored version", () => {
  const { app, close } = fixture();
  try {
    const first = pkg(),
      items = first.items;
    first.items = [];
    commit(app, first);
    const later = {
      ...pkg(),
      packageId: "questions-later",
      archives: [],
      items,
    };
    commit(app, later);
    assert.equal(app.snapshot().questions[0].knowledge_ids.length, 1);
  } finally {
    close();
  }
});
test("invalid refs and cycles prevent all writes; stale preview is rejected", () => {
  const { app, close } = fixture();
  try {
    const p = pkg();
    p.items[0].knowledgeRefs[0].nodeKey = "unknown";
    assert.throws(() => app.handle("import.preview", { package: p }), /引用/);
    assert.equal(app.snapshot().knowledge.length, 0);
    const good = pkg(),
      preview = app.handle("import.preview", { package: good });
    app.handle("knowledge.save", { name: "其他", module: "常识" });
    assert.throws(
      () => app.handle("import.commit", { package: good, expected: preview }),
      /重新预览/,
    );
    const cyc = pkg();
    cyc.archives[0].nodes[0].parentKey = "base";
    assert.throws(() => app.handle("import.preview", { package: cyc }), /循环/);
  } finally {
    close();
  }
});
test("assistant analyses import directly as ready; item exclusion is honored", () => {
  const { app, close } = fixture();
  try {
    const p = pkg();
    p.items[0].analysisOrigin = "assistant";
    commit(app, p);
    assert.equal(app.snapshot().questions[0].status, "ready");
    const second = structuredClone(p);
    second.packageId = "pkg-next";
    second.items[0].key = "q-002";
    commit(app, second, { excludedKeys: ["q-002"] });
    assert.equal(app.snapshot().questions.length, 1);
  } finally {
    close();
  }
});
test("politics and common knowledge use memory cards with self-recall scheduling", () => {
  const { app, next, close } = fixture();
  try {
    assert.throws(
      () => app.handle("question.save", { module: "政治理论", stem: "积累" }),
      /记忆卡/,
    );
    const key = app.handle("knowledge.save", {
      module: "政治理论",
      name: "核心概念",
    });
    const id = app.handle("memory.save", {
      module: "政治理论",
      title: "概念记忆",
      cue: "核心内容？",
      content: "内容",
      knowledge_ids: [key],
    });
    const card = app.snapshot().memories[0];
    let r = app.handle("memory.review", {
      id,
      version: card.version,
      score: 4,
    });
    assert.ok(r.result.days > 0);
    r = app.handle("memory.review", { id, version: card.version, score: 4 });
    assert.equal(r.effective, false);
    next();
    r = app.handle("memory.review", { id, version: card.version, score: 0 });
    assert.ok(r.result.days <= 1);
    assert.equal(app.snapshot().memoryReviews.length, 3);
  } finally {
    close();
  }
});
test("memory package imports and knowledge merge migrates memory and external keys", () => {
  const { app, db, close } = fixture();
  try {
    const p = pkg();
    p.archives[0].subject = "常识";
    p.items = [
      {
        key: "m1",
        kind: "memory",
        subject: "常识",
        title: "概念",
        cue: "回忆？",
        content: "积累内容",
        knowledgeRefs: [
          { archiveId: "data-base", version: "v1", nodeKey: "base" },
        ],
      },
    ];
    commit(app, p);
    const source = app
      .snapshot()
      .knowledge.find((k) => k.name === "基期量")!.id;
    const target = app.handle("knowledge.save", {
      module: "常识",
      name: "目标",
    });
    app.handle("knowledge.merge", { source_id: source, target_id: target });
    assert.deepEqual(app.snapshot().memories[0].knowledge_ids, [target]);
    assert.equal(
      (
        db
          .prepare(
            "SELECT knowledge_id FROM knowledge_keys WHERE node_key='base'",
          )
          .get() as any
      ).knowledge_id,
      target,
    );
  } finally {
    close();
  }
});
test("standalone version archive commands are removed while deck content export remains available", () => {
  const { app, close } = fixture();
  try {
    assert.throws(() => app.handle("archive.publish", {}), /不支持/);
    assert.throws(() => app.handle("archive.package", {}), /不支持/);
    const pkg = app.handle("deck.package", { id: "数量" });
    assert.equal(pkg.format, "ganksoft.content");
  } finally {
    close();
  }
});
test("metadata edits do not create another effective memory review on the same day", () => {
  const { app, close } = fixture();
  try {
    const id = app.handle("memory.save", {
      module: "常识",
      title: "原题",
      cue: "提示",
      content: "正文",
    });
    app.handle("memory.review", { id, version: 1, score: 4 });
    let card = app.snapshot().memories[0];
    app.handle("memory.save", { ...card, title: "改标题" });
    card = app.snapshot().memories[0];
    assert.equal(
      app.handle("memory.review", { id, version: card.version, score: 4 })
        .effective,
      false,
    );
    app.handle("memory.save", { ...card, content: "修改后的内容" });
    card = app.snapshot().memories[0];
    assert.equal(app.snapshot().memories[0].mastery, null);
    assert.equal(
      app.handle("memory.review", { id, version: card.version, score: 3 })
        .effective,
      true,
    );
  } finally {
    close();
  }
});
test("trees and card knowledge links stay isolated across decks", () => {
  const { app, close } = fixture();
  try {
    const a = app.handle("knowledge.save", {
        module: "资料分析",
        name: "基期",
      }),
      b = app.handle("knowledge.save", { module: "数量", name: "工程" });
    assert.throws(
      () =>
        app.handle("relation.save", {
          source_id: a,
          target_id: b,
          kind: "相关",
        }),
      /未知|不支持|Unknown|未注册|not|command/i,
    );
    assert.throws(
      () =>
        app.handle("question.save", {
          module: "资料分析",
          stem: "题目",
          answer: "A",
          knowledge_ids: [b],
        }),
      /不属于/,
    );
    assert.equal(app.snapshot().questions.length, 0);
  } finally {
    close();
  }
});
test("bundled example passes the actual semantic import validator", async () => {
  const { app, close } = fixture();
  try {
    const { readFileSync } = await import("node:fs");
    const sample = JSON.parse(
      readFileSync(
        new URL("../examples/sample.gank.json", import.meta.url),
        "utf8",
      ),
    );
    commit(app, sample);
    assert.equal(app.snapshot().questions.length, 1);
    assert.equal(app.snapshot().memories.length, 1);
  } finally {
    close();
  }
});
test("new imports keep local knowledge edits by default while archiving the source version", () => {
  const { app, close } = fixture();
  try {
    const p = pkg();
    commit(app, p);
    const node = app.snapshot().knowledge.find((k) => k.name === "基期量")!;
    app.handle("knowledge.save", { ...node, principle: "我的补充笔记" });
    const next = structuredClone(p);
    next.packageId = "keep-local";
    next.items[0].key = "q-new";
    commit(app, next);
    assert.equal(
      app.snapshot().knowledge.find((k) => k.id === node.id)!.principle,
      "我的补充笔记",
    );
    assert.equal(app.snapshot().questions.length, 2);
    assert.equal(app.snapshot().archives.length, 1);
  } finally {
    close();
  }
});
test("old source keys still map after intentional knowledge merge without recreating self edges", () => {
  const { app, close } = fixture();
  try {
    const p = pkg();
    commit(app, p);
    const s = app.snapshot(),
      source = s.knowledge.find((k) => k.name === "基期量")!,
      target = s.knowledge.find((k) => k.name === "增长相关")!;
    app.handle("knowledge.merge", {
      source_id: source.id,
      target_id: target.id,
    });
    const next = structuredClone(p);
    next.packageId = "after-merge";
    next.items[0].key = "q-after-merge";
    commit(app, next);
    assert.equal(
      app.snapshot().knowledge.filter((k) => !k.deleted_at).length,
      1,
    );
    assert.ok(
      app.snapshot().questions.every((q) => q.knowledge_ids[0] === target.id),
    );
    assert.equal(app.snapshot().relations.length, 0);
  } finally {
    close();
  }
});
