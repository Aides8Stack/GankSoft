import { contentIdentity } from "../shared/protocol/identity.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Application } from "../electron/application.ts";
import {
  openDatabase,
  transaction,
  DEFAULT_QUESTION_DECK as Q,
  DEFAULT_MEMORY_DECK as M,
} from "../electron/infrastructure/database.ts";
import { createApplicationProtocol } from "../electron/protocol/gateway.ts";
import { createClient } from "../shared/protocol/client.ts";
import {
  PROTOCOL,
  assertWireValue,
  ProtocolError,
} from "../shared/protocol/data.ts";
import { registry, type Method } from "../shared/protocol/registry.ts";
import { canonical, createHost } from "../shared/protocol/host.ts";
import {
  callLifecycle,
  studyTransition,
} from "../shared/protocol/lifecycle.ts";
import {
  renewProtocolEpoch,
  sqliteProtocolStore,
} from "../electron/protocol/sqlite-store.ts";
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "gank-v060-"));
  let db = openDatabase(join(dir, "ganksoft.sqlite"));
  let app = new Application({
    db,
    dataDir: dir,
    now: () => new Date("2026-10-17T08:00:00Z"),
  });
  let gateway = createApplicationProtocol(app);
  const client = createClient((r) => gateway.execute(r));
  return {
    client,
    get app() {
      return app;
    },
    get db() {
      return db;
    },
    get gateway() {
      return gateway;
    },
    reopen() {
      db.close();
      db = openDatabase(join(dir, "ganksoft.sqlite"));
      app = new Application({
        db,
        dataDir: dir,
        now: () => new Date("2026-10-17T08:00:00Z"),
      });
      gateway = createApplicationProtocol(app);
    },
    close() {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
async function question(f: ReturnType<typeof fixture>) {
  await f.client.call("app.capabilities", {});
  const id = await f.client.call("content.question.save", {
    deckId: Q,
    stem: "现期120，增长20%，基期？",
    options: "A.80\nB.100\nC.120\nD.144",
    answer: "B",
  });
  return {
    id,
    version: contentIdentity(
      id,
      f.app.snapshot().questions.find((q) => q.id === id)!.content_version,
    ),
  };
}
function answer(q: { id: string; version: string }, requestId = randomUUID()) {
  return {
    requestId,
    kind: "question" as const,
    cardId: q.id,
    contentVersion: q.version,
    deckId: Q,
    answer: "B" as const,
    thought: "独立计算120/1.2",
    basis: "independent" as const,
    understanding: 3,
    selfScore: 10,
    elapsedSeconds: 0,
  };
}
test("v2 capabilities match core bindings and expose no old commands", async () => {
  const f = fixture();
  try {
    const c = await f.client.call("app.capabilities", {});
    assert.deepEqual(c.protocol, { major: 2, minor: 0 });
    assert(c.supportedMethods.includes("review.question.submit"));
    assert(!c.supportedMethods.includes("snapshot"));
    await assert.rejects(f.client.call("maintenance.backup", {}), {
      code: "METHOD_UNAVAILABLE",
    });
  } finally {
    f.close();
  }
});
test("strict input and resource limits reject before writes", async () => {
  const f = fixture();
  try {
    const c = await f.client.call("app.capabilities", {});
    const r = await f.gateway.execute({
      protocol: PROTOCOL,
      requestId: randomUUID(),
      dataEpoch: c.dataEpoch,
      method: "catalog.deck.save",
      payload: { name: "invalid", kind: "question", unexpected: true },
    });
    assert(!r.ok);
    assert.equal(
      f.db.prepare("SELECT count(*) n FROM protocol_receipts").get()!.n,
      0,
    );
    for (const v of [
      NaN,
      Infinity,
      new Date(),
      new Map(),
      { x: undefined },
      "x".repeat(2_000_001),
    ])
      assert.throws(() => assertWireValue(v));
  } finally {
    f.close();
  }
});
test("old versions and arbitrary commands cannot reach application dispatch", async () => {
  const f = fixture();
  try {
    const c = await f.client.call("app.capabilities", {});
    for (const [protocol, method] of [
      [{ major: 1, minor: 0 }, "catalog.deck.save"],
      [PROTOCOL, "question.save"],
      [PROTOCOL, "asset.add"],
    ] as const) {
      const r = await f.gateway.execute({
        protocol,
        method,
        requestId: randomUUID(),
        dataEpoch: c.dataEpoch,
        payload: {},
      });
      assert(!r.ok);
    }
  } finally {
    f.close();
  }
});
test("commands persist exact receipts across reopen and reject ID conflicts", async () => {
  const f = fixture();
  try {
    await f.client.call("app.capabilities", {});
    const request = f.client.prepare("catalog.deck.save", {
      name: "幂等测试",
      kind: "question",
    });
    const first = await f.client.send(request);
    f.reopen();
    assert.equal(await f.client.send(request), first);
    await assert.rejects(
      f.client.send({
        ...request,
        payload: { name: "changed", kind: "question" },
      }),
      { code: "IDEMPOTENCY_CONFLICT" },
    );
    assert.equal(
      f.db.prepare("SELECT count(*) n FROM decks WHERE name=?").get("幂等测试")!
        .n,
      1,
    );
  } finally {
    f.close();
  }
});
test("question review preserves zero time and replays before deleted content checks", async () => {
  const f = fixture();
  try {
    const q = await question(f),
      p = answer(q),
      r = f.client.prepare("review.question.submit", p, p.requestId);
    const result = await f.client.send(r);
    assert(result.effective);
    assert.equal(f.app.snapshot().attempts[0].elapsed_value, 0);
    assert.equal(f.app.snapshot().questions[0].mastery, null);
    await f.client.call("content.question.delete", { id: q.id });
    assert.deepEqual(await f.client.send(r), result);
    assert.deepEqual(
      await f.client.call("review.receipt", { requestId: p.requestId }),
      result,
    );
    assert.equal(
      f.db.prepare("SELECT count(*) n FROM schedule_events").get()!.n,
      1,
    );
  } finally {
    f.close();
  }
});
test("guessed observations retain records without changing the scheduler", async () => {
  const f = fixture();
  try {
    const q = await question(f),
      p = answer(q);
    await f.client.send(
      f.client.prepare("review.question.submit", p, p.requestId),
    );
    const before = f.db.prepare("SELECT data FROM scheduling").get()!.data;
    const p2 = { ...answer(q), basis: "guess" as const, elapsedSeconds: null };
    const r = await f.client.send(
      f.client.prepare("review.question.submit", p2, p2.requestId),
    );
    assert(!r.effective);
    assert.equal(
      f.db.prepare("SELECT data FROM scheduling").get()!.data,
      before,
    );
    assert.equal(f.app.snapshot().attempts.length, 2);
  } finally {
    f.close();
  }
});
test("cross-deck submit rolls back records and receipt", async () => {
  const f = fixture();
  try {
    const q = await question(f),
      p = { ...answer(q), deckId: M };
    await assert.rejects(
      f.client.send(f.client.prepare("review.question.submit", p, p.requestId)),
    );
    assert.equal(f.app.snapshot().attempts.length, 0);
  } finally {
    f.close();
  }
});
test("memory/catalog/knowledge/policy adapters satisfy output schemas", async () => {
  const f = fixture();
  try {
    await f.client.call("app.capabilities", {});
    const folder = await f.client.call("catalog.folder.save", { name: "资料" }),
      deck = await f.client.call("catalog.deck.save", {
        name: "记忆测试",
        kind: "memory",
        folderId: folder,
      });
    const node = await f.client.call("knowledge.save", {
      deckId: deck,
      name: "概念",
    });
    const card = await f.client.call("content.memory.save", {
      deckId: deck,
      title: "概念",
      cue: "提示",
      content: "内容",
      knowledgeIds: [node],
    });
    const requestId = randomUUID(),
      r = await f.client.send(
        f.client.prepare(
          "review.memory.submit",
          {
            requestId,
            kind: "memory",
            deckId: deck,
            cardId: card,
            contentVersion: contentIdentity(card, 1),
            rating: "good",
            note: "主动回忆",
          },
          requestId,
        ),
      );
    assert(r.effective);
    await f.client.call("policy.deck.set", {
      deckId: deck,
      dailyLimit: 20,
      maxIntervalDays: 1000,
    });
    assert.equal(
      (
        await f.client.call("policy.card.set", {
          kind: "memory",
          cardId: card,
          maxIntervalDays: 800,
        })
      ).maxIntervalDays,
      800,
    );
    const w = await f.client.call("workspace.read", {
      sections: ["catalog", "content", "knowledge"],
      deckId: deck,
    });
    assert.equal(w.memories.length, 1);
    assert.equal(w.knowledge[0].id, node);
    assert.equal(w.attempts.length, 0);
  } finally {
    f.close();
  }
});
test("session reveal, atomic review and stale revision checks", async () => {
  const f = fixture();
  try {
    const q = await question(f),
      sessionId = randomUUID(),
      entryId = randomUUID();
    const draft = {
      sessionId,
      entryId,
      ids: [q.id],
      index: 0,
      contentVersion: q.version,
      stage: "answer" as const,
      answer: "B" as const,
      thought: "独立计算120/1.2",
      basis: "independent" as const,
      understanding: 3,
      selfScore: 10,
      elapsedSeconds: 0,
      practice: false,
    };
    const saved = await f.client.call("session.draft", {
      deckId: Q,
      expectedRevision: 0,
      draft,
    });
    const revealed = await f.client.call("session.reveal", {
      deckId: Q,
      expectedRevision: saved.revision,
      draft: { ...draft, stage: "reveal" },
    });
    const p = {
      ...answer(q, entryId),
      sessionId,
      expectedSessionRevision: saved.revision,
    };
    await assert.rejects(
      f.client.send(f.client.prepare("review.question.submit", p, entryId)),
      { code: "REVISION_CONFLICT" },
    );
    p.expectedSessionRevision = revealed.revision;
    const r = await f.client.send(
      f.client.prepare("review.question.submit", p, entryId),
    );
    assert(r.effective);
    const s = JSON.parse(
      String(f.db.prepare("SELECT payload FROM study_sessions").get()!.payload),
    );
    assert.equal(s.stage, "result");
    assert(s.savedResult.attemptId);
    await assert.rejects(
      f.client.call("session.finish", {
        deckId: Q,
        sessionId,
        expectedRevision: 0,
      }),
      { code: "REVISION_CONFLICT" },
    );
  } finally {
    f.close();
  }
});
test("receipt write failure rolls back business transaction and FSRS", async () => {
  const f = fixture();
  try {
    const q = await question(f),
      p = answer(q);
    f.db.exec(
      "CREATE TRIGGER deny_receipt BEFORE INSERT ON protocol_receipts BEGIN SELECT RAISE(ABORT,'fail'); END",
    );
    await assert.rejects(
      f.client.send(f.client.prepare("review.question.submit", p, p.requestId)),
    );
    assert.equal(f.app.snapshot().attempts.length, 0);
    assert.equal(f.app.snapshot().scheduling.length, 0);
    assert.equal(
      f.db.prepare("SELECT count(*) n FROM review_receipts").get()!.n,
      0,
    );
  } finally {
    f.close();
  }
});
test("output validation rolls back nested writes", () => {
  const f = fixture();
  try {
    const store = sqliteProtocolStore(f.db),
      host = createHost(
        store,
        {
          "catalog.deck.save": () => {
            f.app.handle("deck.save", { name: "rollback", kind: "question" });
            return "";
          },
        },
        (s) => createHash("sha256").update(s).digest("hex"),
      );
    const r = host.execute({
      protocol: PROTOCOL,
      requestId: randomUUID(),
      dataEpoch: store.epoch(),
      method: "catalog.deck.save",
      payload: { name: "rollback", kind: "question" },
    });
    assert(!r.ok);
    assert.equal(
      f.db.prepare("SELECT count(*) n FROM decks WHERE name=?").get("rollback")!
        .n,
      0,
    );
  } finally {
    f.close();
  }
});
test("nested savepoints preserve outer atomic owner", () => {
  const f = fixture();
  try {
    transaction(f.db, () => {
      f.db.prepare("INSERT INTO settings VALUES(?,?)").run("outer", "1");
      assert.throws(() =>
        transaction(f.db, () => {
          f.db.prepare("INSERT INTO settings VALUES(?,?)").run("inner", "1");
          throw Error("rollback");
        }),
      );
    });
    assert(f.db.prepare("SELECT * FROM settings WHERE key=?").get("outer"));
    assert(!f.db.prepare("SELECT * FROM settings WHERE key=?").get("inner"));
  } finally {
    f.close();
  }
});
test("restored epochs reject stale requests and require fresh handshake", async () => {
  const f = fixture();
  try {
    await f.client.call("app.capabilities", {});
    const req = f.client.prepare("catalog.deck.save", {
      name: "old epoch",
      kind: "question",
    });
    renewProtocolEpoch(f.db);
    await assert.rejects(f.client.send(req), { code: "DATA_EPOCH_CHANGED" });
    assert.throws(
      () => f.client.prepare("workspace.read", { sections: ["catalog"] }),
      { code: "HANDSHAKE_REQUIRED" },
    );
    await f.client.call("app.capabilities", {});
    assert.equal(
      (await f.client.call("workspace.read", { sections: ["catalog"] })).decks
        .length,
      2,
    );
  } finally {
    f.close();
  }
});
test("query paths never create receipts or increment revisions", async () => {
  const f = fixture();
  try {
    const q = await question(f),
      before = sqliteProtocolStore(f.db).revision(),
      count = f.db.prepare("SELECT count(*) n FROM protocol_receipts").get()!.n;
    await f.client.call("workspace.read", {
      sections: ["catalog", "content"],
      deckId: Q,
    });
    await f.client.call("analytics.card", { kind: "question", cardId: q.id });
    assert.equal(sqliteProtocolStore(f.db).revision(), before);
    assert.equal(
      f.db.prepare("SELECT count(*) n FROM protocol_receipts").get()!.n,
      count,
    );
  } finally {
    f.close();
  }
});
test("transport failure preserves original request for retry", async () => {
  const f = fixture();
  try {
    let lost = false;
    const client = createClient(async (request) => {
      const r = await f.gateway.execute(request);
      if (lost) throw Error("transport lost");
      return r;
    });
    await client.call("app.capabilities", {});
    const req = client.prepare("catalog.deck.save", {
      name: "lost response",
      kind: "question",
    });
    lost = true;
    await assert.rejects(client.send(req), (e: unknown) => {
      assert.equal((e as { request: unknown }).request, req);
      assert.equal((e as { outcome: string }).outcome, "unknown");
      return true;
    });
    lost = false;
    assert(await client.send(req));
    assert.equal(
      f.db
        .prepare("SELECT count(*) n FROM decks WHERE name=?")
        .get("lost response")!.n,
      1,
    );
  } finally {
    f.close();
  }
});
test("call and study machines reject invalid transitions", () => {
  const call = callLifecycle();
  assert.throws(() => call.move("succeeded"));
  assert.equal(studyTransition("answer", "reveal"), "reveal");
  assert.equal(studyTransition("reveal", "commit"), "result");
  assert.throws(() => studyTransition("answer", "commit"));
  assert.equal(canonical({ b: 2, a: 1 }), canonical({ a: 1, b: 2 }));
});
test("all method inputs are strict and no command-string escape hatch exists", () => {
  for (const method of Object.keys(registry) as Method[]) {
    assert.equal(
      registry[method].input.safeParse({ __unexpected: true }).success,
      false,
      method,
    );
  }
  assert(!Object.hasOwn(registry, "call"));
  assert.throws(() => assertWireValue({ c: new Date() }), ProtocolError);
});
test("knowledge graph/filter interfaces execute through the public contract", async () => {
  const f = fixture();
  try {
    const q = await question(f),
      node = await f.client.call("knowledge.save", {
        deckId: Q,
        name: "基期量",
      }),
      second = await f.client.call("knowledge.save", {
        deckId: Q,
        name: "比率",
      });
    assert(!Object.hasOwn(registry,'knowledge.relation.save'));assert(!Object.hasOwn(registry,'knowledge.relation.delete'));
    assert(await f.client.call("knowledge.insight", { id: node }));
    assert(
      await f.client.call("knowledge.map.save", {
        deckId: Q,
        nodes: [
          { id: node, name: "基期量", parentId: null },
          { id: second, name: "比率", parentId: node },
        ],
        expected: { [node]: 1, [second]: 1 },
      }),
    );
    const filter = await f.client.call("filters.save", {
      deckId: Q,
      name: "到期题",
      payload: { state: "due", knowledge: [node] },
    });
    assert(
      await f.client.call("filters.delete", {
        deckId: Q,
        id: filter,
        expectedRevision: 1,
      }),
    );

    assert(q.id);
  } finally {
    f.close();
  }
});
test("workspace pagination is bounded, deck-scoped and has deterministic next pages", async () => {
  const f = fixture();
  try {
    await f.client.call("app.capabilities", {});
    for (let i = 0; i < 45; i++)
      await f.client.call("content.memory.save", {
        deckId: M,
        title: "卡" + i,
        cue: "提示",
        content: "内容",
      });
    await question(f);
    const ids: string[] = [];
    for (let offset = 0; offset < 60; offset += 20) {
      const w = await f.client.call("workspace.read", {
        sections: ["content"],
        deckId: M,
        offset,
        limit: 20,
      });
      assert.equal(w.questions.length, 0);
      assert(w.memories.length <= 20);
      ids.push(...w.memories.map((m) => m.id));
      if (!w.meta.pageHasMore) break;
    }
    assert.equal(ids.length, 45);
    assert.equal(new Set(ids).size, 45);
  } finally {
    f.close();
  }
});
test("interrupted platform operation blocks replay until explicit audited reconciliation", async () => {
  const f = fixture();
  try {
    let effects = 0;
    const bind = () =>
      createApplicationProtocol(f.app, () => {}, {
        "maintenance.backup": async () => {
          effects++;
          throw Error("response lost after system effect");
        },
      });
    let gateway = bind();
    const client = createClient((r) => gateway.execute(r));
    await client.call("app.capabilities", {});
    const req = client.prepare("maintenance.backup", {});
    await assert.rejects(client.send(req), {
      code: "OPERATION_UNKNOWN",
      outcome: "unknown",
    });
    gateway = bind();
    await assert.rejects(client.send(req), { code: "OPERATION_UNKNOWN" });
    assert.equal(effects, 1);
    const pending = await client.call("maintenance.operations", {});
    assert.equal(pending[0].requestId, req.requestId);
    await client.call("maintenance.operation.resolve", {
      requestId: req.requestId,
      note: "人工核对导出文件和数据状态，确认结果并解除锁定",
    });
    assert.deepEqual(await client.call("maintenance.operations", {}), []);
    assert.equal(
      f.db
        .prepare(
          "SELECT count(*) n FROM audits WHERE action='人工核对系统操作'",
        )
        .get()!.n,
      1,
    );
  } finally {
    f.close();
  }
});
test("async platform query never writes journal or receipts", async () => {
  const f = fixture();
  try {
    const gateway = createApplicationProtocol(f.app, () => {}, {
        "ai.config.get": async () => ({
          endpoint: "",
          model: "",
          hasKey: false,
        }),
      }),
      client = createClient((r) => gateway.execute(r));
    await client.call("app.capabilities", {});
    await client.call("ai.config.get", {});
    assert.equal(gateway.store.revision(), 0);
    assert.equal(
      f.db.prepare("SELECT count(*) n FROM protocol_receipts").get()!.n,
      0,
    );
    assert.equal(
      f.db.prepare("SELECT count(*) n FROM platform_operations").get()!.n,
      0,
    );
  } finally {
    f.close();
  }
});
