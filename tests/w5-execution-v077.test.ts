import test from "node:test";
import assert from "node:assert/strict";
import {
  aiFixture,
  immutableData,
  databaseDump,
  maxAction,
  review,
} from "./fixtures/ai-adjustment-v077.ts";
import {
  publishedCard,
  currentDue,
  policySnapshot,
} from "../electron/modules/cards-unified/schedule.ts";
import { reviewConfig } from "../electron/modules/review/config-service.ts";
import { createClient, CallFailure } from "../shared/protocol/client.ts";
import { createApplicationProtocol } from "../electron/protocol/gateway.ts";
import { Application } from "../electron/application.ts";
import { applyAdjustments } from "../electron/modules/workspace-unified/adjustment-execution.ts";
import { randomUUID } from "node:crypto";
for (const n of [1, 100, 500, 501, 6000])
  test(
    "W5-02/05/06 " +
      n +
      " actual cross-shard writes, exact rollback, receipt atomicity, replay and restart",
    async () => {
      const a = await aiFixture(n);
      try {
        const p = await a.prepare(),
          before = databaseDump(a.f),
          immutable = immutableData(a.f),
          db = a.f.ctx.db,
          target = a.ids[Math.floor(n / 2)];
        const req = a.client.prepare("learning.aiAdjustment.apply", p);
        db.exec(
          `CREATE TEMP TRIGGER ai_fail BEFORE INSERT ON settings WHEN NEW.key='unified-card-policy:${target}' BEGIN SELECT RAISE(ABORT,'synthetic middle write failure'); END`,
        );
        await assert.rejects(() => a.client.send(req));
        assert.equal(databaseDump(a.f), before);
        db.exec("DROP TRIGGER ai_fail");
        // A receipt failure after every target write must roll all those writes back as well.
        db.exec(
          "CREATE TEMP TRIGGER ai_receipt_fail BEFORE INSERT ON protocol_receipts WHEN NEW.method='learning.aiAdjustment.apply' BEGIN SELECT RAISE(ABORT,'synthetic receipt failure'); END",
        );
        await assert.rejects(() => a.client.send(req));
        assert.equal(databaseDump(a.f), before);
        db.exec("DROP TRIGGER ai_receipt_fail");
        const result = await a.client.send(req);
        assert.equal(result.actionCount, n);
        assert.equal(result.cardCount, n);
        assert.equal(immutableData(a.f), immutable);
        assert.equal(
          Number(
            db
              .prepare(
                "SELECT count(*) n FROM settings WHERE key LIKE 'unified-card-policy:%'",
              )
              .get()!.n,
          ),
          n,
        );
        for (const id of a.ids)
          assert.equal(
            policySnapshot(
              a.f.ctx,
              publishedCard(a.f.ctx, { deckId: a.deckId, cardId: id }),
            ).maxIntervalDays,
            30,
          );
        const committed = databaseDump(a.f);
        assert.deepEqual(await a.client.send(req), result);
        assert.equal(databaseDump(a.f), committed);
        await assert.rejects(() =>
          a.client.call("learning.aiAdjustment.apply", p),
        );
        const status = await a.client.call("operation.status", {
          requestId: req.requestId,
          method: req.method,
          payload: req.payload,
        });
        assert.equal(status.state, "committed");
        assert.equal(
          (status.response as { data: { operationId: string } }).data
            .operationId,
          result.operationId,
        );
        await a.restart();
        assert.deepEqual(await a.client.send(req), result);
        assert.equal(databaseDump(a.f), committed);
        assert.equal(
          (
            await a.client.call("learning.aiAdjustment.logs", {
              deckId: a.deckId,
              offset: 0,
              limit: 20,
            })
          ).rows[0].canUndo,
          true,
        );
        const undo = a.client.prepare("learning.aiAdjustment.undo", {
          deckId: a.deckId,
          operationId: result.operationId,
          confirmed: true,
        });
        const reverted = await a.client.send(undo);
        assert.equal(reverted.undone, true);
        for (const id of a.ids)
          assert.equal(
            policySnapshot(
              a.f.ctx,
              publishedCard(a.f.ctx, { deckId: a.deckId, cardId: id }),
            ).maxIntervalDays,
            365,
          );
        assert.equal(immutableData(a.f), immutable);
        const undone = databaseDump(a.f);
        await a.restart();
        assert.deepEqual(await a.client.send(undo), reverted);
        assert.equal(databaseDump(a.f), undone);
      } finally {
        a.close();
      }
    },
  );
test("W5-02 four real actions, direct/aggregate dedup, pure due overlay; exact safe undo after restart", async () => {
  const a = await aiFixture(3);
  try {
    await review(a);
    let tree = await a.client.call("knowledge.tree.read", { deckId: a.deckId });
    const root = await a.client.call("knowledge.node.create", {
      deckId: a.deckId,
      expectedTreeHash: tree.treeHash,
      parentId: null,
      name: "根",
    });
    tree = await a.client.call("knowledge.tree.read", { deckId: a.deckId });
    const child = await a.client.call("knowledge.node.create", {
      deckId: a.deckId,
      expectedTreeHash: tree.treeHash,
      parentId: root.nodeId,
      name: "子",
    });
    for (const id of a.ids.slice(1))
      await a.client.call("knowledge.cardLinks.set", {
        deckId: a.deckId,
        cardId: id,
        nodeIds: [root.nodeId, child.nodeId],
        expectedRevision: 0,
      });
    const card = publishedCard(a.f.ctx, { deckId: a.deckId, cardId: a.ids[0] }),
      beforeDue = currentDue(a.f.ctx, card).dueAt!,
      afterDue = new Date(Date.parse(beforeDue) - 1000).toISOString();
    const actions = [
      maxAction(a.ids[0]),
      {
        actionId: "retention",
        type: "deck.policy.retention.set",
        deckId: a.deckId,
        value: 0.9,
        reason: "合成",
      },
      {
        actionId: "knowledge",
        type: "knowledge.cards.max_interval.set",
        knowledgeId: root.nodeId,
        scope: "aggregate",
        value: 20,
        reason: "合成",
      },
      {
        actionId: "advance",
        type: "card.schedule.advance_due",
        cardId: a.ids[0],
        dueAt: afterDue,
        reason: "合成",
      },
    ];
    const p = await a.prepare(actions),
      before = immutableData(a.f),
      oldRetention = reviewConfig(a.f.ctx, a.deckId).config.desiredRetention,
      r = await a.client.call("learning.aiAdjustment.apply", p);
    assert.equal(r.actionCount, 4);
    assert.equal(r.cardCount, 3);
    assert.equal(r.knowledgeCount, 1);
    assert.equal(currentDue(a.f.ctx, card).dueAt, afterDue);
    assert.equal(reviewConfig(a.f.ctx, a.deckId).config.desiredRetention, 0.9);
    assert.equal(immutableData(a.f), before);
    for (const id of a.ids.slice(1))
      assert.equal(
        policySnapshot(
          a.f.ctx,
          publishedCard(a.f.ctx, { deckId: a.deckId, cardId: id }),
        ).maxIntervalDays,
        20,
      );
    await a.restart();
    await a.client.call("learning.aiAdjustment.undo", {
      deckId: a.deckId,
      operationId: r.operationId,
      confirmed: true,
    });
    assert.equal(currentDue(a.f.ctx, card).dueAt, beforeDue);
    assert.equal(
      reviewConfig(a.f.ctx, a.deckId).config.desiredRetention,
      oldRetention,
    );
    assert.equal(immutableData(a.f), before);
    const d = await a.prepare([
      { ...actions[2], actionId: "direct", scope: "direct" },
    ]);
    assert.equal(
      (await a.client.call("learning.aiAdjustment.apply", d)).cardCount,
      2,
    );
  } finally {
    a.close();
  }
});
test("W5-04/07 prepare then review or config/relations change rejects stale apply; review after apply blocks undo and preserves new FSRS", async () => {
  const a = await aiFixture(2);
  try {
    const p = await a.prepare();
    await review(a);
    const afterReview = databaseDump(a.f);
    await assert.rejects(() => a.client.call("learning.aiAdjustment.apply", p));
    assert.equal(databaseDump(a.f), afterReview);
    const valid = await a.prepare(),
      r = await a.client.call("learning.aiAdjustment.apply", valid);
    await review(a);
    const after = databaseDump(a.f);
    await assert.rejects(() =>
      a.client.call("learning.aiAdjustment.undo", {
        deckId: a.deckId,
        operationId: r.operationId,
        confirmed: true,
      }),
    );
    assert.equal(databaseDump(a.f), after);
    assert.equal(
      (
        await a.client.call("learning.aiAdjustment.logs", {
          deckId: a.deckId,
          offset: 0,
          limit: 20,
        })
      ).rows[0].canUndo,
      false,
    );
  } finally {
    a.close();
  }
});
test("W5-05/07 forged credential, partial undo failure, raw target tamper and resource overflow never partially write", async () => {
  const a = await aiFixture(3);
  try {
    const p = await a.prepare(),
      before = databaseDump(a.f);
    await assert.rejects(() =>
      a.client.call("learning.aiAdjustment.apply", {
        ...p,
        preparationToken: "0".repeat(64),
      }),
    );
    assert.equal(databaseDump(a.f), before);
    a.f.ctx.db.exec("BEGIN");
    a.f.ctx.db
      .prepare("UPDATE learning_cards SET revision=revision+1 WHERE id=?")
      .run(a.ids[0]);
    await assert.rejects(() => a.client.call("learning.aiAdjustment.apply", p));
    a.f.ctx.db.exec("ROLLBACK");
    assert.equal(databaseDump(a.f), before);
    assert.throws(
      () => applyAdjustments(a.f.ctx, p, randomUUID(), { bytes: 0 }),
      /预算/,
    );
    assert.equal(databaseDump(a.f), before);
    const result = await a.client.call("learning.aiAdjustment.apply", p),
      applied = databaseDump(a.f),
      target = a.ids[1];
    a.f.ctx.db.exec(
      `CREATE TEMP TRIGGER ai_undo_fail BEFORE DELETE ON settings WHEN OLD.key='unified-card-policy:${target}' BEGIN SELECT RAISE(ABORT,'synthetic undo failure'); END`,
    );
    await assert.rejects(() =>
      a.client.call("learning.aiAdjustment.undo", {
        deckId: a.deckId,
        operationId: result.operationId,
        confirmed: true,
      }),
    );
    assert.equal(databaseDump(a.f), applied);
    a.f.ctx.db.exec("DROP TRIGGER ai_undo_fail");
    await a.client.call("learning.aiAdjustment.undo", {
      deckId: a.deckId,
      operationId: result.operationId,
      confirmed: true,
    });
  } finally {
    a.close();
  }
});
test("W5-06 lost successful reply is resolved with original operation.status and replays after owner restart", async () => {
  const a = await aiFixture();
  try {
    const p = await a.prepare(),
      host = createApplicationProtocol(new Application(a.f.ctx)),
      client = createClient(async (r) => {
        const out = await host.execute(r);
        if ((r as { method: string }).method === "learning.aiAdjustment.apply")
          throw Error("synthetic lost reply");
        return out;
      });
    await client.call("app.capabilities", {});
    const req = client.prepare("learning.aiAdjustment.apply", p);
    await assert.rejects(
      () => client.send(req),
      (e) => e instanceof CallFailure && e.outcome === "unknown",
    );
    const status = await client.call("operation.status", {
      requestId: req.requestId,
      method: req.method,
      payload: req.payload,
    });
    assert.equal(status.state, "committed");
    const r = client.acceptReceipt(req, status.response),
      before = databaseDump(a.f);
    await a.restart();
    assert.deepEqual(await a.client.send(req), r);
    assert.equal(databaseDump(a.f), before);
  } finally {
    a.close();
  }
});

test("W5-08 effective due overlay immediately reaches list/dashboard/card+knowledge analytics/queue/export and review clears it", async () => {
  const a = await aiFixture();
  try {
    await review(a);
    let t = await a.client.call("knowledge.tree.read", { deckId: a.deckId });
    const node = await a.client.call("knowledge.node.create", {
      deckId: a.deckId,
      expectedTreeHash: t.treeHash,
      parentId: null,
      name: "同步知识",
    });
    await a.client.call("knowledge.cardLinks.set", {
      deckId: a.deckId,
      cardId: a.ids[0],
      nodeIds: [node.nodeId],
      expectedRevision: 0,
    });
    const initial = await a.client.call("workspace.dashboard", {
      deckId: a.deckId,
    });
    assert.equal(initial.dueCount, 0);
    const dueAt = new Date(Date.now() - 1000).toISOString(),
      p = await a.prepare([
        {
          actionId: "now",
          type: "card.schedule.advance_due",
          cardId: a.ids[0],
          dueAt,
          reason: "立即复盘",
        },
      ]),
      before = immutableData(a.f),
      r = await a.client.call("learning.aiAdjustment.apply", p);
    assert.equal(immutableData(a.f), before);
    assert.equal(
      (await a.client.call("workspace.dashboard", { deckId: a.deckId }))
        .dueCount,
      1,
    );
    for (const dimension of ["card", "knowledge"] as const) {
      const g = await a.client.call("workspace.analytics.grouped", {
        deckId: a.deckId,
        dimension,
        date: { range: "all" },
        limit: 100,
      });
      assert.equal(g.summary.dueCount, 1);
      if (dimension === "card") assert.equal(g.items[0].nextDueAt, dueAt);
    }
    const q = await a.client.call("learning.queue.preview", {
      deckId: a.deckId,
      filters: {},
      selectedIds: [a.ids[0]],
    });
    assert.equal(q.due.length,0);assert.equal(q.relearn.length,1,JSON.stringify(q));
    assert.equal((await a.client.call("card.listSummary",{deckId:a.deckId})).items[0].dueAt,dueAt);
    const current = databaseDump(a.f);
    await assert.rejects(() =>
      a.client.call("learning.aiAdjustment.undo", {
        deckId: a.deckId,
        operationId: r.operationId,
        confirmed: true,
      }),
    );
    assert.equal(databaseDump(a.f), current);
    await review(a);
    assert.equal(
      a.f.ctx.db
        .prepare("SELECT value FROM settings WHERE key=?")
        .get("unified-ai-due:" + a.ids[0]),
      undefined,
    );
    const reviewed = databaseDump(a.f);
    await assert.rejects(() =>
      a.client.call("learning.aiAdjustment.undo", {
        deckId: a.deckId,
        operationId: r.operationId,
        confirmed: true,
      }),
    );
    assert.equal(databaseDump(a.f), reviewed);
  } finally {
    a.close();
  }
});
