import test from "node:test";
import assert from "node:assert/strict";
import {
  CardDraftController,
  type DraftAdapter,
} from "../src/cards/draft-controller.ts";
import {
  DraftPreview,
  WorkspaceDraft,
  type WorkspaceDraftDTO,
} from "../shared/protocol/card-draft.ts";
const fields = {
  title: "初始",
  payload: {
    encoding: "qa-v1" as const,
    mode: "qa" as const,
    fields: { front: "问", back: "答", supplement: "", source: "" },
  },
  mediaRefs: [],
};
const initial = DraftPreview.parse({
  cardId: "card",
  deckId: "deck",
  targetType: "qa",
  publishedRevision: 1,
  draftRevision: null,
  token: "a".repeat(64),
  fields,
  origin: {
    versionId: "version",
    mode: "qa",
    strategy: "published-target",
    mappingVersion: "six-way/1",
  },
  requiredFields: [],
  warnings: [],
});
const saved = (revision: number, value = fields): WorkspaceDraftDTO =>
  WorkspaceDraft.parse({
    ...value,
    cardId: "card",
    draftType: "qa",
    revision,
    basePublishedRevision: 1,
    updatedAt: "2026-10-23T00:00:00.000Z",
    origin: initial.origin,
  });
const deferred = <T>() => {
  let resolve!: (x: T) => void, reject!: (e: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
function setup(save: DraftAdapter["save"]) {
  const adapter: DraftAdapter = {
    save,
    async previewSwitch() {
      return initial;
    },
    async switchType() {
      return saved(1);
    },
  };
  return new CardDraftController(
    { cardId: "card", deckId: "deck" },
    initial,
    null,
    adapter,
    () => {},
    60000,
  );
}
test("T12 auto-save queues newest edits behind pending write and only reports clean after durable receipts", async () => {
  const one = deferred<WorkspaceDraftDTO>(),
    two = deferred<WorkspaceDraftDTO>(),
    calls: Parameters<DraftAdapter["save"]>[] = [];
  const c = setup(async (...a) => {
    calls.push(a);
    return calls.length === 1 ? one.promise : two.promise;
  });
  c.change({ ...fields, title: "第一" });
  const flush = c.flush();
  assert.equal(c.state, "saving");
  c.change({ ...fields, title: "第二" });
  assert.equal(c.snapshot().title, "第二");
  one.resolve(saved(1, { ...fields, title: "第一" }));
  await new Promise((r) => setImmediate(r));
  assert.equal(calls.length, 2);
  assert.equal(calls[1][0].expectedDraftRevision, 1);
  assert.equal(calls[1][0].fields.title, "第二");
  assert.equal(c.state, "saving");
  two.resolve(saved(2, { ...fields, title: "第二" }));
  await flush;
  assert.equal(c.state, "clean");
  assert.equal(c.revision, 2);
  assert.equal(c.dispose(), null);
});
test("T12 lost response retries the exact request then saves newer edits, failure never discards local content", async () => {
  const calls: Parameters<DraftAdapter["save"]>[] = [];
  const c = setup(async (...a) => {
    calls.push(a);
    if (calls.length === 1)
      throw Object.assign(Error("response lost"), { outcome: "unknown" });
    return saved(calls.length - 1, a[0].fields as typeof fields);
  });
  c.change({ ...fields, title: "已提交但响应丢失" });
  await c.flush();
  assert.equal(c.state, "error");
  assert.equal(c.revision, null);
  c.change({ ...fields, title: "之后继续编辑" });
  await c.flush();
  assert.equal(c.state, "clean");
  assert.equal(c.revision, 2);
  assert.equal(calls[0][1], calls[1][1]);
  assert.deepEqual(calls[0][0], calls[1][0]);
  assert.notEqual(calls[1][1], calls[2][1]);
  assert.equal(c.snapshot().title, "之后继续编辑");
  c.dispose();
});
test("T12 conflict retains draft and typing does not silently retry stale revisions", async () => {
  let calls = 0;
  const c = setup(async () => {
    calls++;
    throw Object.assign(Error("其他窗口更新"), {
      code: "DRAFT_REVISION_CONFLICT",
      outcome: "rejected",
    });
  });
  c.change({ ...fields, title: "保留的原文" });
  await c.flush();
  assert.equal(c.state, "conflict");
  c.change({ ...fields, title: "继续保留的新原文" });
  await c.flush();
  assert.equal(calls, 1);
  assert.equal(c.dispose()!.title, "继续保留的新原文");
});
test("T11 preview is nonmutating and cancel preserves current fields; unknown switch cannot be cancelled", async () => {
  let switched = 0;
  const c = setup(async (p) => saved(1, p.fields as typeof fields));
  c.change({ ...fields, title: "本地内容" });
  await c.previewType("direct");
  const before = c.snapshot();
  c.cancelSwitch();
  assert.deepEqual(c.snapshot(), before);
  // Use a service which commits once but loses its response.
  const adapter: DraftAdapter = {
    async save(p) {
      return saved(1, p.fields as typeof fields);
    },
    async previewSwitch() {
      return initial;
    },
    async switchType() {
      switched++;
      if (switched === 1)
        throw Object.assign(Error("unknown"), { outcome: "unknown" });
      return saved(2);
    },
  };
  const d = new CardDraftController(
    { cardId: "card", deckId: "deck" },
    initial,
    saved(1),
    adapter,
    () => {},
    60000,
  );
  await d.previewType("direct");
  await d.confirmSwitch();
  assert.equal(d.switchOutcomeUnknown, true);
  d.cancelSwitch();
  assert.ok(d.preview);
  d.change({ ...fields, title: "不得混入未知切换" });
  assert.equal(d.snapshot().title, "初始");
  await d.confirmSwitch();
  assert.equal(d.state, "clean");
  assert.equal(d.preview, null);
  c.dispose();
  d.dispose();
});
test("T12 composition suspension prevents saving partial Chinese input; close exposes unsaved failure", async () => {
  let calls = 0;
  const c = setup(async () => {
    calls++;
    throw Object.assign(Error("磁盘不可写"), { outcome: "rejected" });
  });
  c.suspend();
  c.change({ ...fields, title: "输入法组合中" });
  await c.flush();
  assert.equal(calls, 0);
  c.resume();
  assert.equal(await c.close(), false);
  assert.equal(calls, 1);
  assert.equal(c.dispose()!.title, "输入法组合中");
});
