import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  openDatabase,
  DEFAULT_QUESTION_DECK as Q,
  DEFAULT_MEMORY_DECK as M,
} from "../electron/infrastructure/database.ts";
import { Application } from "../electron/application.ts";
import { createApplicationProtocol } from "../electron/protocol/gateway.ts";
import { createClient } from "../shared/protocol/client.ts";
import {
  collectionSummary,
  resolveWindow,
} from "../electron/modules/analytics/window.ts";
import { deckInsights } from "../electron/modules/analytics/deck.ts";
import { describeCollection } from "../electron/modules/imports/collection.ts";
import { DomainError } from "../shared/domain-error.ts";
import { registry } from "../shared/protocol/registry.ts";
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "gank071-")),
    db = openDatabase(join(dir, "data.sqlite"));
  let now = new Date("2026-10-18T08:00:00Z");
  const app = new Application({ db, dataDir: dir, now: () => new Date(now) });
  return {
    dir,
    db,
    app,
    client: createClient(createApplicationProtocol(app).execute),
    time: (s: string) => (now = new Date(s)),
    close() {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
test("v071 preferences and notification APIs persist, redact keys and mark exact messages read", async () => {
  const f = fixture();
  try {
    await f.client.call("app.capabilities", {});
    assert.equal((await f.client.call("preferences.get", {})).theme, "light");
    await f.client.call("preferences.set", { theme: "system" });
    assert.equal((await f.client.call("preferences.get", {})).theme, "system");
    const first = await f.client.call("messages.append", {
      kind: "error",
      text: "连接错误 sk-abcdef0123456789",
    });
    const second = await f.client.call("messages.append", {
      kind: "success",
      text: "文件已保存",
    });
    assert(!first.text.includes("abcdef"));
    await f.client.call("messages.read", { ids: [first.id] });
    const rows = await f.client.call("messages.list", {});
    assert(rows.find((r) => r.id === first.id)!.read);
    assert(!rows.find((r) => r.id === second.id)!.read);
    const next = createClient(createApplicationProtocol(f.app).execute);
    await next.call("app.capabilities", {});
    assert.equal((await next.call("messages.list", {})).length, 2);
    await assert.rejects(
      f.client.call("preferences.set", { theme: "invalid" } as any),
    );
  } finally {
    f.close();
  }
});
test("v071 shared window uses inclusive calendar days for recent/custom ranges, including timezone boundaries", () => {
  const now = new Date("2026-10-18T00:30:00Z");
  assert.deepEqual(resolveWindow({ range: "7" }, now, "Asia/Shanghai"), {
    start: "2026-10-12",
    end: "2026-10-18",
    timeZone: "Asia/Shanghai",
  });
  assert.equal(
    resolveWindow({ range: "30" }, now, "America/New_York").end,
    "2026-10-17",
  );
  assert.throws(() =>
    resolveWindow(
      { range: "custom", start: "2026-02-30", end: "2026-03-01" },
      now,
      "Asia/Shanghai",
    ),
  );
  assert.throws(() =>
    resolveWindow(
      { range: "custom", start: "2026-10-19", end: "2026-10-18" },
      now,
      "Asia/Shanghai",
    ),
  );
});
test("v071 collection and insight APIs share the same dated, deck-isolated read model without mutating learning data", async () => {
  const f = fixture();
  try {
    f.db
      .prepare("UPDATE settings SET value=? WHERE key='studyTimezone'")
      .run("Asia/Shanghai");
    const other = f.app.handle("deck.save", {
      name: "隔离集",
      kind: "question",
    });
    const card = f.app.handle("question.save", {
        module: Q,
        stem: "甲",
        answer: "B",
      }),
      foreign = f.app.handle("question.save", {
        module: other,
        stem: "乙",
        answer: "B",
      });
    for (const iso of [
      "2026-10-17T15:59:59Z",
      "2026-10-17T16:00:00Z",
      "2026-10-18T15:59:59Z",
      "2026-10-18T16:00:00Z",
    ]) {
      f.time(iso);
      for (const id of [card, foreign])
        f.app.handle("review.submit", {
          request_id: randomUUID(),
          protocol_version: 2,
          question_id: id,
          content_version: 1,
          answer: "A",
          thought: "日期边界",
          self_score: 3,
          elapsed_seconds: 10,
          basis: "independent",
          understanding: 3,
        });
    }
    f.time("2026-10-18T08:00:00Z");
    const before = f.app.snapshot(),
      selection = {
        deckId: Q,
        range: "custom" as const,
        start: "2026-10-18",
        end: "2026-10-18",
      };
    const a = collectionSummary(f.app.ctx, selection),
      b = deckInsights(f.app.ctx, selection);
    assert.equal(a.summary.effective + a.summary.practice, 2);
    assert.equal(a.summary.effective, b.summary.effective);
    assert.equal(a.summary.cards, 1);
    assert.deepEqual(a.daily, [{ date: "2026-10-18", count: 2 }]);
    assert.deepEqual(f.app.snapshot(), before);
    await f.client.call("app.capabilities", {});
    const wire = await f.client.call("analytics.collection", selection);
    assert.equal((wire.summary as any).effective, b.summary.effective);
    await assert.rejects(
      f.client.call("analytics.deck", { ...selection, start: "2026-10-19" }),
    );
  } finally {
    f.close();
  }
});
test("v071 selected-card package preserves collection metadata, links and folder placement; malformed imports roll back", () => {
  const f = fixture();
  try {
    const folder = f.app.handle("folder.save", { name: "目标目录" }),
      k = f.app.handle("knowledge.save", { module: Q, name: "知识" });
    const card = f.app.handle("question.save", {
      module: Q,
      stem: "导出甲",
      answer: "B",
      knowledge_ids: [k],
    });
    f.app.handle("question.save", { module: Q, stem: "不导出乙", answer: "B" });
    const pkg = f.app.handle("deck.package", { id: Q, cardIds: [card] });
    assert.equal(pkg.items.length, 1);
    assert.equal(pkg.collection.kind, "question");
    assert.equal(describeCollection(pkg).items, 1);
    const id = f.app.handle("collection.import", {
        package: pkg,
        name: "导入集",
        folderId: folder,
      }),
      s = f.app.snapshot();
    assert.equal(s.decks.find((d) => d.id === id)!.folder_id, folder);
    const imported = s.questions.filter((q) => q.module === id);
    assert.equal(imported.length, 1);
    assert.equal(imported[0].knowledge_ids.length, 1);
    assert.notEqual(imported[0].id, card);
    assert.equal(s.attempts.length, 0);
    const before = f.app.snapshot();
    assert.throws(() =>
      f.app.handle("collection.import", {
        package: {
          ...pkg,
          items: [
            ...pkg.items,
            { ...pkg.items[0], key: "bad", kind: "memory" },
          ],
        },
        name: "无效",
        folderId: folder,
      }),
    );
    assert.deepEqual(f.app.snapshot(), before);
    assert.throws(
      () => f.app.handle("deck.package", { id: Q, cardIds: [imported[0].id] }),
      /属于/,
    );
  } finally {
    f.close();
  }
});
test("v071 empty collection roundtrip retains memory kind and removed archive methods stay absent", () => {
  const f = fixture();
  try {
    const pkg = f.app.handle("deck.package", { id: M });
    assert.equal(pkg.items.length, 0);
    assert.equal(describeCollection(pkg).kind, "memory");
    const id = f.app.handle("collection.import", {
      package: pkg,
      name: "空记忆集",
      folderId: null,
    });
    assert.equal(
      f.app.snapshot().decks.find((d) => d.id === id)!.kind,
      "memory",
    );
    for (const method of [
      "knowledge.archive.publish",
      "knowledge.archive.package",
      "exchange.archive.export",
    ])
      assert(!Object.hasOwn(registry, method));
    assert.throws(() => f.app.handle("archive.publish", {}), /不支持/);
  } finally {
    f.close();
  }
});
test("v071 invalid AI connection is rejected before maintenance begins", async () => {
  const f = fixture();
  try {
    let calls = 0;
    const host = createApplicationProtocol(f.app, undefined, {
        "ai.config.save": async () => {
          calls++;
          return {
            endpoint: "https://example.test/v1",
            model: "test",
            hasKey: false,
          };
        },
      }),
      client = createClient(host.execute);
    await client.call("app.capabilities", {});
    await assert.rejects(
      client.call("ai.config.save", {
        endpoint: "file:///invalid",
        model: "test",
      }),
    );
    assert.equal(calls, 0);
    assert.equal(
      f.db.prepare("SELECT count(*) AS n FROM platform_operations").get()!.n,
      0,
    );
  } finally {
    f.close();
  }
});

test("v071 known rolled-back collection rejection does not leave an unresolved maintenance lock", async () => {
  const f = fixture();
  try {
    const gateway = createApplicationProtocol(f.app, undefined, {
        "exchange.collection.import": async () => {
          throw new DomainError(
            "COLLECTION_IMPORT_REJECTED",
            "目标目录已有同名卡片集",
          );
        },
      }),
      client = createClient(gateway.execute);
    await client.call("app.capabilities", {});
    await assert.rejects(
      client.call("exchange.collection.import", {
        fileToken: randomUUID(),
        name: "同名",
        folderId: null,
      }),
      { code: "COLLECTION_IMPORT_REJECTED", outcome: "rejected" },
    );
    assert.equal((await client.call("maintenance.operations", {})).length, 0);
    assert.equal(
      f.db.prepare("SELECT state FROM platform_operations").get()!.state,
      "rejected",
    );
  } finally {
    f.close();
  }
});
