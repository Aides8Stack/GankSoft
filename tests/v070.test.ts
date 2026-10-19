import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  openDatabase,
  DEFAULT_QUESTION_DECK as Q,
  DEFAULT_MEMORY_DECK as M,
} from "../electron/infrastructure/database.ts";
import { Application } from "../electron/application.ts";
import {
  automaticQuestionTitle,
  isLegacyQuestionTitle,
} from "../shared/question-title.ts";
import { inDateRange, validDateRange } from "../shared/date-range.ts";
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "gank070-"));
  const path = join(dir, "db.sqlite"),
    db = openDatabase(path);
  const app = new Application({
    db,
    dataDir: dir,
    now: () => new Date("2026-10-18T08:00:00Z"),
  });
  return {
    db,
    app,
    path,
    close() {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
test("v070 auto titles contain readable text, normalized whitespace and Unicode characters", () => {
  assert.equal(automaticQuestionTitle("  第一行\n\n第二行  "), "第一行 第二行");
  assert.equal(automaticQuestionTitle(""), "图片题");
  assert.equal(automaticQuestionTitle("🧠".repeat(37)), "🧠".repeat(36) + "…");
  assert(isLegacyQuestionTitle(Q + " · 测试", Q, "测试"));
  assert(!isLegacyQuestionTitle("人工标题", Q, "测试"));
});
test("v070 question move removes old reverse links, accepts new links and keeps card/history identity", () => {
  const f = fixture();
  try {
    const other = f.app.handle("deck.save", { name: "乙集", kind: "question" });
    const third = f.app.handle("deck.save", { name: "丙集", kind: "question" });
    const old = f.app.handle("knowledge.save", { module: Q, name: "甲知识" });
    const target = f.app.handle("knowledge.save", {
      module: other,
      name: "乙知识",
    });
    const foreign = f.app.handle("knowledge.save", {
      module: third,
      name: "丙知识",
    });
    const id = f.app.handle("question.save", {
      module: Q,
      stem: "问题",
      answer: "B",
      knowledge_ids: [old],
    });
    f.app.handle("review.submit", {
      request_id: randomUUID(),
      protocol_version: 2,
      question_id: id,
      content_version: 1,
      answer: "A",
      thought: "保留思路",
      self_score: 4,
      elapsed_seconds: 30,
      basis: "independent",
      understanding: 3,
      faults: ["知识缺失"],
      error_knowledge_ids: [old],
    });
    const before = f.app.snapshot(),
      q = before.questions.find((q) => q.id === id)!;
    const result = f.app.handle("question.save", {
      ...q,
      module: other,
      knowledge_ids: [old, target],
    });
    const after = f.app.snapshot(),
      moved = after.questions.find((q) => q.id === id)!;
    assert.equal(result, id);
    assert.equal(moved.module, other);
    assert.deepEqual(moved.knowledge_ids, [target]);
    assert.equal(
      f.db
        .prepare(
          "SELECT count(*) AS n FROM question_knowledge WHERE knowledge_id=?",
        )
        .get(old)?.n,
      0,
    );
    assert.deepEqual(after.attempts, before.attempts);
    assert.equal(moved.content_version, q.content_version);
    assert.throws(
      () =>
        f.app.handle("question.save", {
          ...moved,
          module: Q,
          knowledge_ids: [foreign],
        }),
      /知识点不属于/,
    );
    assert.deepEqual(
      f.app.snapshot().questions.find((q) => q.id === id),
      moved,
    );
    assert.throws(
      () => f.app.handle("question.save", { ...q, module: Q }),
      /版本|修改|变化/,
    );
  } finally {
    f.close();
  }
});
test("v070 memory move also removes old reverse links without deleting review history", () => {
  const f = fixture();
  try {
    const other = f.app.handle("deck.save", { name: "记忆乙", kind: "memory" });
    const k = f.app.handle("knowledge.save", { module: M, name: "原知识" });
    const id = f.app.handle("memory.save", {
      module: M,
      title: "概念",
      cue: "提示",
      content: "内容",
      knowledge_ids: [k],
    });
    f.app.handle("memory.review", { id, version: 1, score: 3 });
    const history = f.app.snapshot().memoryReviews;
    const before = f.app.snapshot().memories.find((c) => c.id === id)!;
    f.app.handle("memory.save", { ...before, module: other });
    assert.deepEqual(f.app.snapshot().memoryReviews, history);
    assert.deepEqual(
      f.app.snapshot().memories.find((c) => c.id === id)!.knowledge_ids,
      [],
    );
    assert.equal(
      f.db
        .prepare(
          "SELECT count(*) AS n FROM memory_knowledge WHERE knowledge_id=?",
        )
        .get(k)?.n,
      0,
    );
    assert.equal(
      f.app.snapshot().memories.find((c) => c.id === id)!.learning_version,
      before.learning_version,
    );
  } finally {
    f.close();
  }
});
test("v070 existing ID-prefixed auto title repair is idempotent and preserves custom titles/content", () => {
  const f = fixture();
  try {
    const id = f.app.handle("question.save", {
      module: Q,
      stem: "旧规则题干",
      answer: "B",
    });
    const custom = f.app.handle("question.save", {
      module: Q,
      title: "人工命名",
      stem: "题干",
      answer: "B",
    });
    f.db
      .prepare("UPDATE questions SET title=? WHERE id=?")
      .run(Q + " · 旧规则题干", id);
    const before = f.app.snapshot().questions.find((q) => q.id === id)!;
    const reopened = openDatabase(f.path);
    reopened.close();
    const after = f.app.snapshot().questions.find((q) => q.id === id)!;
    assert.equal(after.title, "旧规则题干");
    assert.equal(after.version, before.version + 1);
    assert.equal(after.content_version, before.content_version);
    assert.equal(after.stem, before.stem);
    assert.equal(
      f.app.snapshot().questions.find((q) => q.id === custom)!.title,
      "人工命名",
    );
    const reopenedAgain = openDatabase(f.path);
    reopenedAgain.close();
    assert.equal(
      f.app.snapshot().questions.find((q) => q.id === id)!.version,
      after.version,
    );
  } finally {
    f.close();
  }
});
test("v070 custom calendar range includes both dates in the study timezone and excludes invalid ranges", () => {
  assert(
    inDateRange(
      "2026-10-17T16:00:00Z",
      "2026-10-18",
      "2026-10-18",
      "Asia/Shanghai",
    ),
  );
  assert(
    inDateRange(
      "2026-10-18T15:59:59.999Z",
      "2026-10-18",
      "2026-10-18",
      "Asia/Shanghai",
    ),
  );
  assert(
    !inDateRange(
      "2026-10-18T16:00:00Z",
      "2026-10-18",
      "2026-10-18",
      "Asia/Shanghai",
    ),
  );
  assert(
    !inDateRange(
      "2026-10-17T15:59:59Z",
      "2026-10-18",
      "2026-10-18",
      "Asia/Shanghai",
    ),
  );
  assert(
    inDateRange(
      "2026-11-01T05:30:00Z",
      "2026-11-01",
      "2026-11-01",
      "America/New_York",
    ),
  );
  assert(
    inDateRange(
      "2026-11-01T06:30:00Z",
      "2026-11-01",
      "2026-11-01",
      "America/New_York",
    ),
  );
  for (const [start, end] of [
    ["", "2026-10-18"],
    ["2026-10-19", "2026-10-18"],
    ["2026-02-30", "2026-03-01"],
  ])
    assert(!validDateRange(start, end));
});
