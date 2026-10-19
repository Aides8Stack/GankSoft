import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  openDatabase,
  DEFAULT_QUESTION_DECK as Q,
} from "../electron/infrastructure/database.ts";
import { Application } from "../electron/application.ts";
import { createApplicationProtocol } from "../electron/protocol/gateway.ts";
import { createClient } from "../shared/protocol/client.ts";
import { contentIdentity } from "../shared/protocol/identity.ts";

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "gank066-")),
    db = openDatabase(join(dir, "db.sqlite"));
  let now = new Date("2026-10-17T08:00:00Z");
  const app = new Application({ db, dataDir: dir, now: () => new Date(now) }),
    gateway = createApplicationProtocol(app),
    client = createClient((r) => gateway.execute(r));
  return {
    db,
    app,
    client,
    time: (s: string) => {
      now = new Date(s);
    },
    close: () => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
test("deck analytics API isolates questions, faults and knowledge, rejects invalid scope and never mutates state", async () => {
  const f = fixture();
  try {
    await f.client.call("app.capabilities", {});
    const other = await f.client.call("catalog.deck.save", {
      name: "另一集",
      kind: "question",
    });
    const nodes = [] as string[],
      cards = [] as string[];
    for (const deckId of [Q, other]) {
      const k = await f.client.call("knowledge.save", {
        deckId,
        name: deckId === Q ? "甲集专属" : "乙集专属",
      });
      nodes.push(k);
      const id = await f.client.call("content.question.save", {
        deckId,
        title: deckId === Q ? "甲题" : "乙题",
        stem: "2+2?",
        answer: "B",
        knowledgeIds: [k],
      });
      cards.push(id);
      for (let n = 0; n < 2; n++) {
        f.time(`2026-10-${10 + n}T08:00:00Z`);
        const requestId = randomUUID();
        await f.client.send(
          f.client.prepare(
            "review.question.submit",
            {
              requestId,
              kind: "question",
              deckId,
              cardId: id,
              contentVersion: contentIdentity(id, 1),
              answer: "A",
              thought: "独立计算",
              basis: "independent",
              understanding: 3,
              selfScore: 3,
              elapsedSeconds: 10,
              faults: ["计算错误", "知识缺失"],
              knowledgeIds: [k],
            },
            requestId,
          ),
        );
      }
    }
    f.time("2026-10-17T08:00:00Z");
    const before = f.app.snapshot();
    const a = await f.client.call("analytics.deck", { deckId: Q, range: "30" }),
      b = await f.client.call("analytics.deck", {
        deckId: other,
        range: "all",
      });
    assert.deepEqual(
      a.knowledge.map((k) => k.id),
      [nodes[0]],
    );
    assert.deepEqual(
      b.knowledge.map((k) => k.id),
      [nodes[1]],
    );
    assert.deepEqual(
      a.repeated.map((q) => q.id),
      [cards[0]],
    );
    assert.deepEqual(
      b.repeated.map((q) => q.id),
      [cards[1]],
    );
    assert.equal(a.summary.effective, 2);
    assert.equal(a.knowledge[0].failures, 2);
    assert.equal(a.faults[0].count, 2);
    const recent = await f.client.call("analytics.deck", {
      deckId: Q,
      range: "7",
    });
    // v071 uses seven inclusive study-calendar days, so Oct 10 is outside Oct 11—17.
    assert.equal(recent.summary.effective, 1);
    f.time("2026-11-17T08:00:00Z");
    assert.equal(
      (await f.client.call("analytics.deck", { deckId: Q, range: "7" })).summary
        .effective,
      0,
    );
    await assert.rejects(
      f.client.call("analytics.deck", { deckId: randomUUID(), range: "30" }),
    );
    assert.deepEqual(f.app.snapshot(), before);
  } finally {
    f.close();
  }
});
test("one card timeline joins all edits without changing base card, records, receipts or schedule", async () => {
  const f = fixture();
  try {
    await f.client.call("app.capabilities", {});
    const id = await f.client.call("content.question.save", {
      deckId: Q,
      title: "唯一卡片",
      stem: "原题",
      answer: "B",
    });
    for (let n = 1; n <= 2; n++) {
      if (n === 2) {
        const card = f.app.snapshot().questions.find((q) => q.id === id)!;
        await f.client.call("content.question.save", {
          id,
          deckId: Q,
          expectedRevision: card.version,
          title: "唯一卡片",
          stem: "修正题干",
          answer: "B",
        });
      }
      f.time(`2026-10-${14 + n}T08:00:00Z`);
      const requestId = randomUUID();
      await f.client.send(
        f.client.prepare(
          "review.question.submit",
          {
            requestId,
            kind: "question",
            deckId: Q,
            cardId: id,
            contentVersion: contentIdentity(id, n),
            answer: "B",
            thought: "第" + n + "次思路",
            basis: "independent",
            understanding: 3,
            selfScore: n === 1 ? 7 : 9,
            elapsedSeconds: n * 10,
          },
          requestId,
        ),
      );
    }
    const before = f.app.snapshot(),
      data = await f.client.call("analytics.card.timeline", {
        kind: "question",
        cardId: id,
      });
    assert.equal(data.records.length, 2);
    assert.equal(data.summary.totalSeconds, 30);
    assert.equal(data.summary.averageSelfScore, 8);
    assert.equal(data.summary.selfScoreChange, 2);
    assert.equal(data.evidence?.days, 2);
    assert.deepEqual(
      data.records.map((r) => r.thought),
      ["第1次思路", "第2次思路"],
    );
    assert.deepEqual(
      before.attempts.map((r) => r.content_version).sort(),
      [1, 2],
    );
    assert.equal(before.questions.filter((q) => q.id === id).length, 1);
    assert.equal(before.questions.find((q) => q.id === id)!.stem, "修正题干");
    assert.deepEqual(f.app.snapshot(), before);
  } finally {
    f.close();
  }
});
