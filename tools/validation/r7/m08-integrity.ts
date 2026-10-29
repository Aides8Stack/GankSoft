import { _electron as electron } from "playwright-core";
import { installedElectron } from "../../ci/prepare-electron.mjs";
import { resolve } from "node:path";
import { createClient } from "../../../shared/protocol/client.ts";
import assert from "node:assert/strict";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  mkdtempSync,
  rmSync,
  appendFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { schema604Fixture } from "../../../tests/fixtures/v075-schema604.ts";
import {
  prepareAndActivateUnified,
  openUnifiedOwner,
} from "../../../electron/infrastructure/migrations/coordinator.ts";
import { digest } from "../../../electron/modules/imports/protocol.ts";
import { args as linuxArgs } from "../r5/support.ts";
import { tmpdir } from "node:os";
import { prepareFreshUnified } from "../../../electron/infrastructure/migrations/coordinator.ts";
import { createFullRestoreSession } from "../../../electron/modules/storage-unified/restore-session.ts";
import { publishFresh } from "../../../tests/fixtures/fresh-production.ts";
import { installKnowledgeHistory } from "../../../electron/infrastructure/migrations/knowledge-history.ts";
import { stageImage } from "../../../electron/modules/media/drafts.ts";
import { Transformer } from "@napi-rs/image";
import { placementUrl } from "../../../shared/editor/document.ts";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const args = process.platform === "linux" ? linuxArgs : [];
let activeApp: any;
async function stop(app: any, data: string) {
  const child = app.process();
  let timer: any;
  try {
    await Promise.race([
      app.close(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error("Electron close timeout")), 8000);
      }),
    ]);
  } catch (e) {
    if (process.platform === "win32")
      execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        timeout: 5000,
      });
    else child.kill("SIGKILL");
    throw e;
  } finally {
    clearTimeout(timer);
    if (activeApp === app) activeApp = null;
  }
  assert.equal(existsSync(data + "-control606/writer.lock"), false);
}
async function start(data: string) {
  const host = join(source.root, "m08-host.cjs"),
    log = resolve(out, "main.log");
  // Test-only observer: fail startup errors immediately instead of waiting on a native modal.
  // The real production main and its fresh606 admission are loaded unchanged.
  writeFileSync(
    host,
    `const {app,dialog}=require('electron');const fs=require('node:fs');const log=s=>fs.appendFileSync(${JSON.stringify(log)},new Date().toISOString()+' '+s+'\\n');
 app.setPath('userData',${JSON.stringify(join(source.root, "m08-profile"))});
 dialog.showErrorBox=(title,content)=>{log('startup-error '+title+' '+content);app.exit(1);};
 app.on('ready',()=>log('app-ready'));app.on('browser-window-created',(_,w)=>{log('window-created '+w.id);w.webContents.on('did-finish-load',()=>log('window-loaded '+w.webContents.getURL()));w.webContents.on('did-fail-load',(_,code,message)=>log('window-load-failed '+code+' '+message));w.webContents.on('render-process-gone',(_,detail)=>log('renderer-gone '+JSON.stringify(detail)));});
 log('loading-production-main');require(${JSON.stringify(resolve("dist-electron/electron/main.js"))});`,
  );
  checkpoint("electron-launch");
  const app = await electron.launch({
    timeout: 20000,
    executablePath: installedElectron(),
    args: [...args, host],
    env: {
      ...process.env,
      TZ: "Asia/Shanghai",
      GANKSOFT_E2E: "1",
      GANKSOFT_DATA_DIR: data,
    },
  });
  activeApp = app;
  app
    .process()
    .stdout?.on("data", (v: any) => appendFileSync(out + "/stdout.log", v));
  app
    .process()
    .stderr?.on("data", (v: any) => appendFileSync(out + "/stderr.log", v));
  report.processes ??= [];
  report.processes.push({
    pid: app.process().pid,
    startedAt: new Date().toISOString(),
  });
  checkpoint("first-window");
  try {
    const page = await app.firstWindow({ timeout: 15000 });
    page.setDefaultTimeout(10000);
    report.windows ??= [];
    report.windows.push({ url: page.url(), pid: app.process().pid });
    checkpoint("window-ready");
    page.on("pageerror", (e: any) => report.errors.push(e.message));
    await page.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();
    const api = createClient((r) =>
      page.evaluate((v: any) => (window as any).gank.protocol(v), r),
    );
    await api.call("app.capabilities", {});
    checkpoint("ipc-ready");
    return { app, page, api };
  } catch (e) {
    await stop(app, data);
    throw e;
  }
}
const out = "validation-results/m08-integrity";
mkdirSync(out, { recursive: true });
for (const file of [
  "main.log",
  "stdout.log",
  "stderr.log",
  "heartbeat.json",
  "failure.txt",
  "failure.png",
  "report.json",
])
  rmSync(join(out, file), { force: true });
const report: any = {
  status: "FAIL",
  cases: [],
  errors: [],
  platform: process.platform,
  manualWindows: "NOT_RUN; R8",
  workingTree:
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()
      .length > 0,
  sourceSha: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  runUrl: process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null,
};
if (process.env.GANKSOFT_SOURCE_SHA)
  assert.equal(report.sourceSha, process.env.GANKSOFT_SOURCE_SHA);
const checkpoint = (stage: string) => {
  report.stage = stage;
  report.checkpoints ??= [];
  report.checkpoints.push({
    stage,
    at: new Date().toISOString(),
    groups: report.cases.length,
  });
  writeFileSync(out + "/report.json", JSON.stringify(report, null, 2) + "\n");
  console.log("M08_STAGE " + stage);
};
const heartbeat = setInterval(() => {
  writeFileSync(
    out + "/heartbeat.json",
    JSON.stringify({
      stage: report.stage,
      at: new Date().toISOString(),
      groups: report.cases.length,
    }),
  );
  console.log("M08_WAIT " + report.stage);
}, 5000);
const sourceFingerprint = () =>
  createHash("sha256")
    .update(
      execFileSync(
        "git",
        [
          "ls-files",
          "-z",
          "electron",
          "shared",
          "src",
          "package-lock.json",
          "tools/validation/r7/m08-integrity.ts",
          "tools/ci/prepare-electron.mjs",
          "tests/fixtures/fresh-production.ts",
          "tests/fixtures/v075-schema604.ts",
          "tests/fixtures/schema604.sql",
        ],
        { encoding: "utf8" },
      )
        .split("\0")
        .filter(Boolean)
        .map(
          (f) =>
            f +
            ":" +
            createHash("sha256").update(readFileSync(f)).digest("hex"),
        )
        .join("\n"),
    )
    .digest("hex");
report.sourceFingerprint = sourceFingerprint();
report.buildSha256 = Object.fromEntries(
  ["dist-electron/electron/main.js", "dist/index.html"].map((f) => [
    f,
    createHash("sha256").update(readFileSync(f)).digest("hex"),
  ]),
);
let source: any, s: any, data: string;
const watchdog = setTimeout(() => {
  report.status = "FAIL";
  report.failure = "M08 total execution deadline exceeded at " + report.stage;
  report.notRunGroups = 6 - report.cases.length;
  writeFileSync(out + "/report.json", JSON.stringify(report, null, 2) + "\n");
  if (activeApp) {
    const pid = activeApp.process().pid;
    try {
      if (process.platform === "win32")
        execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
          timeout: 5000,
        });
      else activeApp.process().kill("SIGKILL");
    } catch (e) {
      appendFileSync(out + "/stderr.log", String(e));
    }
  }
  process.exit(1);
}, 150000);
const read = (fn: (db: DatabaseSync) => any) => {
  const db = new DatabaseSync(
    join(data + "-control606/target", "ganksoft.sqlite"),
    { readOnly: true },
  );
  try {
    return fn(db);
  } finally {
    db.close();
  }
};
const history = () =>
  read((db) =>
    Object.fromEntries(
      [
        "learning_cards",
        "learning_content_versions",
        "learning_study_cycles",
        "learning_review_events",
        "attempts",
        "attempt_faults",
        "attempt_evidence_snapshots",
        "scheduling",
        "schedule_events",
      ].map((t) => [t, db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()]),
    ),
  );
const facts = () =>
  read((db) => ({
    tables: Object.fromEntries(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all()
        .map((r) => [
          r.name,
          db.prepare(`SELECT * FROM ${r.name} ORDER BY rowid`).all(),
        ]),
    ),
    files: Object.fromEntries(
      readdirSync(join(data + "-control606/target", "attachments")).map((n) => [
        n,
        readFileSync(
          join(data + "-control606/target", "attachments", n),
        ).toString("base64"),
      ]),
    ),
  }));
const pass = (name: string) => {
  report.cases.push({ name, status: "PASS" });
  checkpoint("group-" + report.cases.length + "-complete");
  console.log("PASS " + name);
};
try {
  checkpoint("isolated-migration");
  // Migration is a separate non-UI integrity check. Never bless this owner as fresh606.
  const legacy = schema604Fixture();
  let migrated: any;
  try {
    legacy.db.exec("UPDATE platform_operations SET state='completed'");
    const control = join(legacy.root, "migration-control");
    await prepareAndActivateUnified(
      {
        db: legacy.db,
        dataDir: legacy.dataDir,
        now: () => new Date(legacy.at),
      },
      control,
    );
    migrated = openUnifiedOwner(control);
    const tables = [
      "learning_cards",
      "learning_content_versions",
      "learning_study_cycles",
      "learning_review_events",
      "attempts",
      "attempt_faults",
      "attempt_evidence_snapshots",
      "memory_reviews",
      "scheduling",
      "schedule_events",
      "plans",
      "memory_plans",
    ];
    const snapshot = () =>
      Object.fromEntries(
        tables.map((t) => [
          t,
          migrated.db
            .prepare("SELECT rowid AS _rowid,* FROM " + t + " ORDER BY rowid")
            .all(),
        ]),
      );
    const before = snapshot();
    installKnowledgeHistory(migrated.db);
    assert.deepEqual(snapshot(), before);
    assert.equal(
      migrated.db
        .prepare("PRAGMA foreign_key_list(attempt_faults)")
        .all()
        .some((r: any) => r.table === "knowledge_history_identities"),
      true,
    );
    assert.deepEqual(migrated.db.prepare("PRAGMA foreign_key_check").all(), []);
    migrated.close();
    migrated = null;
    await assert.rejects(
      () => prepareFreshUnified(legacy.dataDir, control),
      (e: any) => e.code === "FRESH606_INCOMPATIBLE",
    );
    assert.equal(existsSync(join(control, "fresh606.json")), false);
    report.migration = {
      status: "PASS",
      tables: tables.length,
      productionAdmission: "REJECTED_FRESH606_INCOMPATIBLE",
    };
  } finally {
    migrated?.close();
    legacy.close();
  }
  checkpoint("fresh606-fixture");
  const root = mkdtempSync(join(tmpdir(), "gank-m08-fresh-"));
  data = join(root, "synthetic606");
  source = {
    root,
    ids: {} as any,
    close: () => rmSync(root, { recursive: true, force: true }),
  };
  await prepareFreshUnified(data, data + "-control606");
  const seed = await createFullRestoreSession(data + "-control606", {
    workspaceParent: root,
    selectBackup: async () => null,
    allowLegacyRestore: false,
  });
  try {
    const api = createClient((r) => seed.execute(r));
    await api.call("app.capabilities", {});
    const deck = await api.call("workspace.catalog.save", {
      kind: "deck",
      name: "合成错题",
      parentId: null,
    });
    source.ids.qDeck = deck.id;
    for (const key of ["child1", "child2"]) {
      const tree = await api.call("knowledge.tree.read", { deckId: deck.id });
      source.ids[key] = (
        await api.call("knowledge.node.create", {
          deckId: deck.id,
          parentId: null,
          name: key,
          expectedTreeHash: tree.treeHash,
        })
      ).nodeId;
    }
    const asset = stageImage(
      seed.ctx,
      deck.id,
      "knowledge",
      Transformer.fromRgbaPixels(
        Buffer.from([30, 120, 70, 255]),
        1,
        1,
      ).pngSync(),
      "image/png",
    );
    for (const key of ["child1", "child2"])
      await api.call("knowledge.node.save", {
        deckId: deck.id,
        nodeId: source.ids[key],
        expectedRevision: 1,
        markdown:
          "共享图片 ![](" +
          placementUrl({
            assetId: asset.id,
            placementId: crypto.randomUUID(),
            width: 40,
          }) +
          ")",
      });
    const card = await publishFresh(api, "question", deck.id);
    await api.call("knowledge.cardLinks.set", {
      ...card,
      nodeIds: [source.ids.child1, source.ids.child2],
      expectedRevision: 0,
    });
    let review = await api.call("learning.session.open", {
      deckId: deck.id,
      cardIds: [card.cardId],
    });
    review = await api.call("learning.session.change", {
      deckId: deck.id,
      sessionId: review.sessionId,
      expectedRevision: review.revision,
      action: "reveal",
      draft: {
        ...review.draft,
        selectedOptionId: "a",
        thought: "fresh606原始思路",
        scoreTenths: 90,
        faults: ["保留错因"],
        gaps: "保留漏洞",
        reflection: "保留反思",
      },
    });
    await api.call("learning.review.submit", {
      deckId: deck.id,
      sessionId: review.sessionId,
      expectedRevision: review.revision,
      eventId: review.entry.eventId,
      scoreTenths: 90,
      faults: ["保留错因"],
      gaps: "保留漏洞",
      reflection: "保留反思",
      practice: false,
    });
    review = await api.call("learning.session.get", {
      deckId: deck.id,
      sessionId: review.sessionId,
    });
    await api.call("learning.session.change", {
      deckId: deck.id,
      sessionId: review.sessionId,
      expectedRevision: review.revision,
      action: "next",
    });
    for (const version of ["v1", "v2"]) {
      const archive = {
        archiveId: "m08-ui-source",
        subject: deck.id,
        version,
        nodes: [
          {
            key: "gone",
            name: "待删除知识点",
            principle: "只删除本节点版本正文" + version,
          },
          {
            key: "keep",
            name: "其他存档节点",
            method: "其他内容完整保留" + version,
          },
        ],
        relations: [{ sourceKey: "gone", targetKey: "keep", kind: "相关" }],
      };
      seed.ctx.db
        .prepare(
          "INSERT INTO knowledge_archives(id,archive_key,module,version_label,content,checksum,created_at) VALUES(?,?,?,?,?,?,?)",
        )
        .run(
          "m08-ui-archive-" + version,
          archive.archiveId,
          deck.id,
          version,
          JSON.stringify(archive),
          digest(archive),
          new Date().toISOString(),
        );
    }
    for (const [key, id] of [
      ["gone", source.ids.child1],
      ["keep", source.ids.child2],
    ])
      seed.ctx.db
        .prepare("INSERT INTO knowledge_keys VALUES(?,?,?)")
        .run("m08-ui-source", key, id);
    seed.ctx.db.prepare("INSERT INTO settings(key,value) VALUES(?,?)").run(
      "m08-unproven-recovery",
      JSON.stringify({
        nodeId: source.ids.child2,
        unselectedBody: "未证明归属的共享恢复正文",
      }),
    );
  } finally {
    seed.close();
  }
  const marker = readFileSync(data + "-control606/fresh606.json", "utf8");
  const original = history();
  assert.ok(original.learning_review_events.length);
  assert.ok(original.scheduling.length);
  assert.ok(Object.keys(facts().files).length);
  s = await start(data);
  const p = s.page,
    api = s.api,
    pid = s.app.process().pid;
  report.firstElectronPid = pid;
  assert.equal(
    readFileSync(data + "-control606/fresh606.json", "utf8"),
    marker,
  );
  assert.deepEqual(history(), original);
  assert.equal(
    read((db) =>
      db
        .prepare("PRAGMA foreign_key_list(attempt_faults)")
        .all()
        .some((r) => r.table === "knowledge_history_identities"),
    ),
    true,
  );
  pass(
    "production Electron admits genuine fresh606 with real review/history/FSRS and shared image fixture unchanged",
  );
  const deckId = source.ids.qDeck,
    tree = await api.call("knowledge.tree.read", { deckId }),
    batch = await api.call("knowledge.subtree.delete", {
      deckId,
      nodeId: source.ids.child1,
      expectedTreeHash: tree.treeHash,
    });
  await p
    .getByRole("complementary", { name: "学习导航" })
    .getByRole("button", { name: /^合成错题，/ })
    .click();
  await p.getByRole("button", { name: "本地用户设置", exact: true }).click();
  await p
    .getByRole("navigation", { name: "设置分类" })
    .getByRole("button", { name: "回收站", exact: true })
    .click();
  const trash = p.getByRole("region", { name: "统一回收站" }),
    tabs = trash.getByRole("navigation", { name: "回收站分类" }),
    purge = p.getByRole("dialog", {
      name: "原生永久删除范围预览",
      exact: true,
    });
  await tabs.getByRole("button", { name: "知识点", exact: true }).click();
  await trash
    .getByRole("button", { name: "知识子树回收站", exact: true })
    .click();
  const restore = p.getByRole("dialog", { name: "恢复知识子树", exact: true });
  await restore
    .getByLabel("回收批次", { exact: true })
    .selectOption(batch.batchId);
  checkpoint("native-preview-cancel");
  let before = facts();
  await restore
    .getByRole("button", { name: "永久删除范围与保护预览", exact: true })
    .click();
  await purge.getByLabel("确认销毁所选对象及其历史").waitFor();
  assert.equal(
    await purge.getByLabel("同时永久删除整棵知识子树").isChecked(),
    false,
  );
  await purge.getByRole("button", { name: "取消", exact: true }).click();
  assert.deepEqual(facts(), before);
  pass(
    "fresh606 history and source archive native preview is actionable; mouse cancellation exact all-table/file zero-write",
  );
  checkpoint("native-knowledge-purge");
  await restore
    .getByRole("button", { name: "永久删除范围与保护预览", exact: true })
    .click();
  await purge.getByLabel("确认销毁所选对象及其历史").check();
  await purge
    .getByRole("button", { name: "确认永久删除", exact: true })
    .click();
  await purge.waitFor({ state: "hidden" });
  await restore.getByText("暂无可恢复的知识子树", { exact: true }).waitFor();
  assert.deepEqual(history(), original);
  assert.deepEqual(facts().files, before.files);
  assert.equal(
    read((db) =>
      db.prepare("SELECT 1 FROM knowledge WHERE id=?").get(source.ids.child1),
    ),
    undefined,
  );
  assert.equal(
    read((db) =>
      db
        .prepare("SELECT 1 FROM knowledge_history_identities WHERE id=?")
        .get(source.ids.child1),
    ),
    undefined,
    "fresh node has no legacy fault FK; legacy anchor preservation is verified in m08-integrity-v076.test.ts",
  );
  for (const version of ["v1", "v2"]) {
    const a = read((db) =>
      JSON.parse(
        String(
          db
            .prepare("SELECT content FROM knowledge_archives WHERE id=?")
            .get("m08-ui-archive-" + version)!.content,
        ),
      ),
    );
    assert.deepEqual(a.nodes, [
      {
        key: "keep",
        name: "其他存档节点",
        method: "其他内容完整保留" + version,
      },
    ]);
    assert.deepEqual(a.relations, []);
  }
  await restore.getByRole("button", { name: "取消", exact: true }).click();
  pass(
    "native UI really purges fresh knowledge and both archive versions; exact card history and shared image bytes survive",
  );
  checkpoint("unknown-reference-block");
  const nextTree = await api.call("knowledge.tree.read", { deckId }),
    blocked = await api.call("knowledge.subtree.delete", {
      deckId,
      nodeId: source.ids.child2,
      expectedTreeHash: nextTree.treeHash,
    });
  await trash
    .getByRole("button", { name: "知识子树回收站", exact: true })
    .click();
  await restore.getByLabel("回收批次").selectOption(blocked.batchId);
  before = facts();
  await restore
    .getByRole("button", { name: "永久删除范围与保护预览", exact: true })
    .click();
  await purge.getByRole("region", { name: "永久删除阻断原因" }).waitFor();
  assert.match(await purge.innerText(), /m08-unproven-recovery/);
  assert.equal(
    await purge
      .getByRole("button", { name: "确认永久删除", exact: true })
      .isDisabled(),
    true,
  );
  await purge.getByRole("button", { name: "取消", exact: true }).click();
  assert.deepEqual(facts(), before);
  await restore.getByRole("button", { name: "取消", exact: true }).click();
  pass(
    "unproven shared recovery reference visibly blocks with concrete key; preview/cancel exact zero-write",
  );
  checkpoint("mixed-review-card-purge");
  const scopes = [];
  for (let i = 0; i < 2; i++) {
    const d = await api.call("draft.create", { deckId, initialType: "qa" }),
      scope = { deckId, cardId: d.cardId },
      v = await api.call("draft.save", {
        ...scope,
        expectedPublishedRevision: 0,
        expectedDraftRevision: d.revision,
        fields: {
          title: "M08 混合卡 " + i,
          payload: {
            mode: "qa",
            encoding: "qa-v1",
            fields: {
              front: "合成问题" + i,
              back: "合成答案" + i,
              supplement: "",
              source: "M08",
            },
          },
          mediaRefs: [],
        },
      });
    await api.call("card.publish", {
      ...scope,
      expectedPublishedRevision: 0,
      expectedDraftRevision: v.revision,
      resetStudyCycle: false,
    });
    scopes.push(scope);
  }
  let page = await api.call("learning.session.open", {
    deckId,
    cardIds: scopes.map((c) => c.cardId),
  });
  for (let i = 0; i < 2; i++) {
    page = await api.call("learning.session.change", {
      deckId,
      sessionId: page.sessionId,
      expectedRevision: page.revision,
      action: "reveal",
      draft: {
        ...page.draft,
        thought: "UI 保留独立思路" + i,
        scoreTenths: 90,
        reflection: "UI 保留反思" + i,
      },
    });
    await api.call("learning.review.submit", {
      deckId,
      sessionId: page.sessionId,
      expectedRevision: page.revision,
      eventId: page.entry.eventId,
      scoreTenths: 90,
      faults: [],
      gaps: "",
      reflection: "UI 保留反思" + i,
      practice: false,
    });
    page = await api.call("learning.session.get", {
      deckId,
      sessionId: page.sessionId,
    });
    page = await api.call("learning.session.change", {
      deckId,
      sessionId: page.sessionId,
      expectedRevision: page.revision,
      action: "next",
    });
  }
  const keep = () =>
      read((db) =>
        Object.fromEntries(
          [
            "learning_cards",
            "learning_content_versions",
            "learning_review_events",
            "learning_study_cycles",
            "scheduling",
          ].map((t) => [
            t,
            db
              .prepare(
                `SELECT * FROM ${t} WHERE ${t === "learning_cards" ? "id" : "card_id"}=? ORDER BY rowid`,
              )
              .all(scopes[0].cardId),
          ]),
        ),
      ),
    expected = keep();
  await api.call("card.batch.apply", {
    deckId,
    action: "delete",
    cards: [{ cardId: scopes[1].cardId, expectedRevision: 1 }],
  });
  await tabs.getByRole("button", { name: "卡片", exact: true }).click();
  await trash.getByLabel("恢复 M08 混合卡 1", { exact: true }).check();
  await trash
    .getByRole("button", { name: "永久删除范围与保护预览", exact: true })
    .click();
  await purge.getByLabel("确认销毁所选对象及其历史").check();
  await purge
    .getByRole("button", { name: "确认永久删除", exact: true })
    .click();
  await purge.waitFor({ state: "hidden" });
  await trash.getByText("回收站为空。", { exact: true }).waitFor();
  assert.deepEqual(keep(), expected);
  const remaining = await api.call("learning.session.get", {
    deckId,
    sessionId: page.sessionId,
  });
  assert.equal(remaining.entry.cardId, scopes[0].cardId);
  assert.equal(remaining.total, 1);
  assert.equal(remaining.draft.thought, "UI 保留独立思路0");
  pass(
    "native card purge partitions a completed mixed page and retains survivor original history, thought/result and FSRS",
  );
  checkpoint("close-and-independent-reopen");
  const final = facts();
  await stop(s.app, data);
  s = null;
  s = await start(data);
  report.reopenedElectronPid = s.app.process().pid;
  assert.notEqual(report.reopenedElectronPid, pid);
  assert.deepEqual(facts(), final);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(
    read((db) => db.prepare("PRAGMA foreign_key_check").all()),
    [],
  );
  pass(
    "normal close and distinct Electron PID read back exact all-table/files after all affected scopes",
  );
  assert.equal(report.cases.length, 6);
  assert.equal(sourceFingerprint(), report.sourceFingerprint);
  report.status = "PASS";
} catch (e) {
  report.failure = String((e as Error).stack ?? e);
  if (
    report.cases.length === 0 &&
    /SIGTRAP|EPERM|Operation not permitted/.test(report.failure)
  )
    report.status = "BLOCKED";
  process.exitCode = 1;
  if (s) {
    writeFileSync(
      out + "/failure.txt",
      await s.page
        .locator("body")
        .innerText()
        .catch(() => ""),
    );
    await s.page.screenshot({ path: out + "/failure.png" }).catch(() => {});
  }
} finally {
  clearTimeout(watchdog);
  clearInterval(heartbeat);
  try {
    if (s) await stop(s.app, data!);
  } catch (e) {
    report.status = "FAIL";
    report.cleanupFailure = String(e);
    process.exitCode = 1;
  } finally {
    try {
      source?.close();
    } catch (e) {
      report.status = "FAIL";
      report.fixtureCleanupFailure = String(e);
      process.exitCode = 1;
    }
    report.notRunGroups = 6 - report.cases.length;
    writeFileSync(out + "/report.json", JSON.stringify(report, null, 2) + "\n");
    console.log(
      JSON.stringify({
        status: report.status,
        cases: report.cases.length,
        notRunGroups: report.notRunGroups,
        failure: report.failure,
      }),
    );
  }
}
