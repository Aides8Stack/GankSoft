import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import {
  placementUrl,
  parsePlacement,
  resourceUrl,
  readDocument,
  colorValue,
  safeLink,
  type EditorDocument,
} from "../shared/editor/document.ts";
import { SaveController } from "../src/editor/save-controller.ts";
const asset = {
  id: randomUUID(),
  mime: "image/png" as const,
  access: "draft" as const,
};
function doc(markdown = "中文"): EditorDocument {
  return { encoding: "ganksoft.editor/1", markdown, assets: [asset] };
}
test("S2 placement identity and independent percent widths survive isolated SQLite JSON save/reopen", () => {
  const first = placementUrl({
      assetId: asset.id,
      placementId: randomUUID(),
      width: 30,
    }),
    second = placementUrl({
      assetId: asset.id,
      placementId: randomUUID(),
      width: 80,
    });
  const value = doc(`![图片](${first})\n\n![图片](${second})`),
    db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE validation_document(json TEXT NOT NULL)");
    db.prepare("INSERT INTO validation_document VALUES(?)").run(
      JSON.stringify(value),
    );
    const restored = readDocument(
      JSON.parse(
        (
          db.prepare("SELECT json FROM validation_document").get() as {
            json: string;
          }
        ).json,
      ),
    );
    assert.deepEqual(restored, value);
    assert.equal(parsePlacement(first).width, 30);
    assert.equal(parsePlacement(second).width, 80);
    assert.equal(
      resourceUrl(first, value.assets),
      `app-media://draft/${asset.id}`,
    );
  } finally {
    db.close();
  }
});
test("S2 rejects path/protocol/placement/width smuggling and missing resources", () => {
  const valid = placementUrl({
    assetId: asset.id,
    placementId: randomUUID(),
    width: 30,
  });
  for (const raw of [
    "https://example.org/a.png",
    "file:///tmp/a.png",
    "blob:abc",
    "data:image/svg+xml;base64,AA",
    valid + "&x=1",
    valid.replace("width=30", "width=0"),
    valid.replace("width=30", "width=30.5"),
    valid + "#x",
    valid.replace("gank-asset://", "gank-asset://user@"),
  ])
    assert.throws(() => parsePlacement(raw));
  assert.throws(() => resourceUrl(valid, []), /MEDIA_REFERENCE_MISSING/);
  assert.throws(
    () => readDocument({ ...doc(), assets: [asset, asset] }),
    /MEDIA_ASSET_DUPLICATE/,
  );
  assert.throws(() => colorValue("red;url(x)"));
  assert.equal(colorValue("#b91c1c"), "#b91c1c");
  for (const s of [
    "javascript:alert(1)",
    "file:///etc/passwd",
    "data:text/html,a",
    "https://example.org/\nx",
  ])
    assert.equal(safeLink(s), false);
});
test("S2 autosave serialization: stale completion cannot mark newer text clean; explicit flush joins then saves latest", async () => {
  let complete!: (value: { revision: number }) => void;
  const seen: string[] = [];
  const saves = new SaveController(
    doc(),
    0,
    {
      save: async (d, rev) => {
        seen.push(d.markdown);
        if (!rev)
          return new Promise((r) => {
            complete = r;
          });
        return { revision: rev + 1 };
      },
    },
    () => {},
    60_000,
  );
  saves.change(doc("一"));
  const first = saves.flush();
  saves.change(doc("二"));
  const next = saves.flush();
  complete({ revision: 1 });
  await Promise.all([first, next]);
  assert.deepEqual(seen, ["一", "二"]);
  assert.equal(saves.state, "clean");
  assert.equal(saves.revision, 2);
  saves.dispose();
});
test("S2 save failure/conflict preserve document; retry succeeds; dispose aborts and cannot announce saved", async () => {
  let mode = "fail";
  const saves = new SaveController(
    doc(),
    4,
    {
      save: async (_d, rev, signal) => {
        if (mode === "fail") throw Error("disk full");
        if (mode === "conflict") throw Error("REVISION_CONFLICT");
        assert.equal(signal.aborted, false);
        return { revision: rev + 1 };
      },
    },
    () => {},
    60_000,
  );
  saves.change(doc("未保存的中文"));
  await saves.flush();
  assert.equal(saves.state, "error");
  assert.equal(saves.snapshot().markdown, "未保存的中文");
  mode = "conflict";
  await saves.flush();
  assert.equal(saves.state, "conflict");
  mode = "ok";
  await saves.flush();
  assert.equal(saves.state, "clean");
  saves.dispose();
  assert.equal(saves.state, "disposed");
  let finish!: (v: { revision: number }) => void;
  const pending = new SaveController(
    doc(),
    0,
    {
      save: async () =>
        new Promise((r) => {
          finish = r;
        }),
    },
    () => {},
    60_000,
  );
  pending.change(doc("中断"));
  const p = pending.flush();
  pending.dispose();
  finish({ revision: 1 });
  await p;
  assert.equal(pending.state, "disposed");
  assert.equal(pending.revision, 0);
});
test("S2 invalid current document blocks queued save and stale completion cannot claim clean", async () => {
  let finish!: (v: { revision: number }) => void;
  let writes = 0;
  const saves = new SaveController(
    doc(),
    0,
    {
      save: async () => {
        writes++;
        return new Promise((r) => {
          finish = r;
        });
      },
    },
    () => {},
    60_000,
  );
  saves.change(doc("合法旧稿"));
  const pending = saves.flush();
  saves.invalidate("UNSUPPORTED_HTML");
  finish({ revision: 1 });
  await pending;
  assert.equal(saves.state, "error");
  assert.equal(saves.error, "UNSUPPORTED_HTML");
  await saves.flush();
  assert.equal(writes, 1);
  saves.dispose();
});
test("S2 composing defers autosave and explicit flush until composition ends", async () => {
  let writes = 0;
  const saves = new SaveController(
    doc(),
    0,
    {
      save: async (_d, rev) => {
        writes++;
        return { revision: rev + 1 };
      },
    },
    () => {},
    60_000,
  );
  saves.suspend();
  saves.change(doc("拼音候选"));
  await saves.flush();
  assert.equal(writes, 0);
  saves.change(doc("完成汉字"));
  saves.resume();
  await saves.flush();
  assert.equal(writes, 1);
  assert.equal(saves.snapshot().markdown, "完成汉字");
  saves.dispose();
});
test('S5 identical editor snapshots preserve a failed save until explicit retry and keep clean documents clean',async(t)=>{
  t.mock.timers.enable({apis:['setTimeout']});
  let fail=true,writes=0;
  const saves=new SaveController(doc(),1,{save:async(_d,revision)=>{writes++;if(fail)throw Error('synthetic disk failure');return {revision:revision+1};}},()=>{},500);
  saves.change(doc('保留失败的正文'));await saves.flush();assert.equal(saves.state,'error');assert.equal(writes,1);
  saves.change(doc('保留失败的正文'));assert.equal(saves.state,'error');t.mock.timers.tick(1000);await Promise.resolve();assert.equal(writes,1);
  fail=false;await saves.flush();assert.equal(saves.state,'clean');assert.equal(writes,2);
  saves.change(doc('保留失败的正文'));assert.equal(saves.state,'clean');t.mock.timers.tick(1000);await Promise.resolve();assert.equal(writes,2);saves.dispose();
});
