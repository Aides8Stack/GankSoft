import { stageImage, draftImage } from "./modules/media/drafts.ts";
import { recoverMediaWrites } from "./modules/media/service.ts";
import { setImageBindingReporter } from "./infrastructure/image-binding.ts";
import { inspect } from "node:util";
import { getPreferences } from "./modules/workspace.ts";
import { describeCollection } from "./modules/imports/collection.ts";
import {
  writeRestoreJournal,
  finishRestoreJournal,
  recoverInterruptedRestore,
} from "./infrastructure/restore-journal.ts";
import {
  readContentPackage,
  writeContentPackage,
} from "./modules/imports/container.ts";
import type { ExchangePackage } from "../shared/import-protocol.ts";
import { validateImage } from "./infrastructure/images.ts";
import { DomainError, errorResponse } from "../shared/domain-error.ts";
import {
  app,
  Menu,
  nativeTheme,
  BrowserWindow,
  ipcMain,
  dialog,
  protocol,
  net,
  clipboard,
  safeStorage,
} from "electron";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, basename, resolve, relative } from "node:path";
import {
  mkdirSync,
  appendFileSync,
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  rmSync,
  statSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { openDatabase, transaction } from "./infrastructure/database.ts";
import { createBackup, stageBackup } from "./infrastructure/backup.ts";
import { Application } from "./application.ts";
import { createApplicationProtocol } from "./protocol/gateway.ts";
import { sqliteProtocolStore } from "./protocol/sqlite-store.ts";
import { ExchangePackageCodec } from "../shared/protocol/models.ts";
import { renewProtocolEpoch } from "./protocol/sqlite-store.ts";
import {
  generate,
  validateAiConfig,
  type AiConfig,
} from "./modules/ai/adapter.ts";
const root = dirname(fileURLToPath(import.meta.url));
let win: BrowserWindow;
let service: Application;
let protocolService: ReturnType<typeof createApplicationProtocol>;
let busy = false;
const importFiles = new Map<string, ExchangePackage>();
const locked =
  process.env.GANKSOFT_E2E === "1" || app.requestSingleInstanceLock();
if (!locked) app.quit();
protocol.registerSchemesAsPrivileged([
  {
    scheme: "gank-app",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
  {
    scheme: "app-media",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);
const dataDir =
  process.env.GANKSOFT_DATA_DIR ||
  join(app.getPath("userData"), "v060", "data");
setImageBindingReporter((cause) => {
  console.error("GankSoft image decoder failed to load:", cause);
  try {
    mkdirSync(dataDir, { recursive: true });
    appendFileSync(
      join(dataDir, "image-decoder-diagnostics.log"),
      `${new Date().toISOString()} ${process.platform}/${process.arch} Electron ${process.versions.electron}\n${inspect(cause, { depth: 8 })}\n`,
    );
  } catch {
    /* Logging must not cause another application failure. */
  }
});
const aiFile =
  process.env.GANKSOFT_E2E === "1"
    ? join(dataDir, "test-ai-connection.json")
    : join(app.getPath("userData"), "v060", "ai-connection.json");
function readAiConfig(): AiConfig {
  if (!existsSync(aiFile)) return { endpoint: "", model: "", apiKey: "" };
  const saved = JSON.parse(readFileSync(aiFile, "utf8"));
  return {
    endpoint: saved.endpoint,
    model: saved.model,
    apiKey: saved.key
      ? safeStorage.decryptString(Buffer.from(saved.key, "base64"))
      : "",
  };
}
function publicAiConfig() {
  try {
    const config = readAiConfig();
    return {
      endpoint: config.endpoint,
      model: config.model,
      hasKey: !!config.apiKey,
    };
  } catch {
    return { endpoint: "", model: "", hasKey: false, unavailable: true };
  }
}
function syncNativeTheme() {
  nativeTheme.themeSource = getPreferences(service.ctx).theme;
  if (win && !win.isDestroyed())
    win.setBackgroundColor(
      nativeTheme.shouldUseDarkColors ? "#18231f" : "#f5f5f2",
    );
}
nativeTheme.on("updated", () => {
  if (win && !win.isDestroyed())
    win.setBackgroundColor(
      nativeTheme.shouldUseDarkColors ? "#18231f" : "#f5f5f2",
    );
});
function openService() {
  mkdirSync(join(dataDir, "attachments"), { recursive: true });
  service = new Application({
    db: openDatabase(join(dataDir, "ganksoft.sqlite")),
    dataDir,
    now: () => new Date(),
  });
  recoverMediaWrites(service.ctx);
  syncNativeTheme();
  protocolService = createApplicationProtocol(
    service,
    () => {
      if (busy)
        throw new DomainError("MAINTENANCE_BUSY", "数据维护进行中", {}, true);
    },
    {
      "exchange.open": async () => {
        const r = await invokeSystem("exchange.open", {});
        if (!r) return null;
        const fileToken = randomUUID();
        importFiles.clear();
        importFiles.set(fileToken, r.package);
        return {
          name: r.name,
          fileToken,
          package: ExchangePackageCodec.encode({ ...r.package, items: [] }),
        };
      },
      "exchange.preview": async (p) => {
        const q = p as any;
        return service.handle("import.preview", {
          package: resolvePackage(q),
          options: q.options,
        });
      },
      "exchange.commit": async (p) => {
        const q = p as any;
        return service.handle("import.commit", {
          package: resolvePackage(q),
          options: q.options,
          expected: q.expected,
        });
      },
      "exchange.collection.describe": async (p) =>
        describeCollection(resolvePackage(p as any)),
      "exchange.collection.import": async (p) => {
        const q = p as any;
        try {
          return service.handle("collection.import", {
            package: resolvePackage(q),
            name: q.name,
            folderId: q.folderId,
          });
        } catch (e) {
          if (
            (e as { transactionOutcome?: string }).transactionOutcome ===
            "unknown"
          )
            throw e;
          throw new DomainError(
            "COLLECTION_IMPORT_REJECTED",
            e instanceof Error ? e.message : String(e),
          );
        }
      },
      "exchange.deck.export": (p) => invokeSystem("deck.export", p),
      "media.stage": async (p) => stageOperation(p as any),
      "maintenance.backup": () => backupOperation(),
      "maintenance.restore": () => restoreOperation(),
      "trash.manage": (p) => invokeSystem("trash.manage", p),
      "ai.config.get": () => invokeSystem("ai.config", {}),
      "ai.config.save": (p) => invokeSystem("ai.save", p),
      "ai.analyze": async (p) => {
        const c = await dialog.showMessageBox(win, {
          type: "question",
          buttons: ["取消", "发送并分析"],
          defaultId: 0,
          cancelId: 0,
          message: "允许向已配置的模型服务发送此知识点的学习材料？",
          detail:
            "仅发送文字：最多15题、25条作答、10张记忆卡和20条复盘。可能包含你填写的个人笔记。",
        });
        if (c.response !== 1) throw new DomainError("CANCELLED", "已取消分析");
        return invokeSystem("ai.knowledge", p);
      },
    },
    () => sqliteProtocolStore(service.ctx.db),
  );
}
function resolvePackage(p: { fileToken?: string; package?: unknown }) {
  if (p.fileToken) {
    const pkg = importFiles.get(p.fileToken);
    if (!pkg) throw new DomainError("FILE_TOKEN_EXPIRED", "请重新选择导入文件");
    return pkg;
  }
  if (p.package) return ExchangePackageCodec.decode(p.package);
  throw new DomainError("PACKAGE_REQUIRED", "请选择导入文件");
}
async function invokeSystem(command: string, payload: unknown) {
  const r = await systemAction(command, payload);
  if (!r.ok) throw new DomainError(r.code, r.error, r.fieldErrors, r.retryable);
  return r.value;
}
function assertSender(event: Electron.IpcMainInvokeEvent) {
  if (
    !win ||
    event.sender !== win.webContents ||
    event.senderFrame !== win.webContents.mainFrame
  )
    throw new Error("无效的调用来源");
}
async function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  if (busy)
    throw new DomainError(
      "MAINTENANCE_BUSY",
      "数据维护进行中，请稍后重试",
      {},
      true,
    );
  busy = true;
  try {
    return await fn();
  } finally {
    busy = false;
  }
}
async function systemAction(command: string, payload: any): Promise<any> {
  try {
    if (busy)
      throw new DomainError("MAINTENANCE_BUSY", "数据维护进行中", {}, true);
    if (typeof command !== "string" || command === "asset.add")
      throw new Error("不支持的操作");
    if (command === "exchange.open")
      return {
        ok: true,
        value: await exclusive(async () => {
          const result = await dialog.showOpenDialog(win, {
            title: "选择标准导入包",
            properties: ["openFile"],
            filters: [
              {
                name: "GankSoft 数据包（JSON / ZIP）",
                extensions: ["json", "zip"],
              },
              { name: "GankSoft JSON 数据包", extensions: ["json"] },
              { name: "GankSoft ZIP 数据包", extensions: ["zip"] },
            ],
          });
          if (result.canceled) return null;
          const file = result.filePaths[0];
          if (statSync(file).size > 128 * 1024 * 1024)
            throw new Error("导入包不能超过128 MB");
          return {
            name: basename(file),
            package: await readContentPackage(file),
          };
        }),
      };
    if (command === "deck.export")
      return {
        ok: true,
        value: await exclusive(async () => {
          const pkg = service.handle("deck.package", {
            id: payload.id,
            cardIds: payload.cardIds,
          });
          const result = await dialog.showSaveDialog(win, {
            title: "导出当前卡片集",
            defaultPath: "card-collection.gank.zip",
            filters: [{ name: "GankSoft交换包", extensions: ["zip"] }],
          });
          if (result.canceled || !result.filePath) return null;
          await writeContentPackage(result.filePath, pkg);
          return result.filePath;
        }),
      };

    if (command === "ai.config") return { ok: true, value: publicAiConfig() };
    if (command === "ai.save") {
      const old = readAiConfig(),
        config = {
          endpoint: String(payload.endpoint ?? "").trim(),
          model: String(payload.model ?? "").trim(),
          apiKey: payload.clearKey ? "" : String(payload.apiKey || old.apiKey),
        };
      validateAiConfig(config);
      if (
        config.apiKey &&
        (!safeStorage.isEncryptionAvailable() ||
          (process.platform === "linux" &&
            safeStorage.getSelectedStorageBackend() === "basic_text"))
      )
        throw new Error(
          "当前系统无法安全保存密钥；请启用系统凭据存储，或使用无需密钥的本机模型服务。",
        );
      mkdirSync(dirname(aiFile), { recursive: true });
      const temporary = aiFile + "." + randomUUID() + ".tmp";
      try {
        writeFileSync(
          temporary,
          JSON.stringify({
            endpoint: config.endpoint,
            model: config.model,
            key: config.apiKey
              ? safeStorage.encryptString(config.apiKey).toString("base64")
              : "",
          }),
          { mode: 0o600 },
        );
        renameSync(temporary, aiFile);
      } finally {
        rmSync(temporary, { force: true });
      }
      return { ok: true, value: publicAiConfig() };
    }
    if (command === "ai.knowledge") {
      const config = readAiConfig();
      validateAiConfig(config);
      const evidence = service.insight(payload.id);
      const snapshot = service.snapshot();
      const questions = snapshot.questions
        .filter((q) => evidence.linked.some((l) => l.id === q.id))
        .slice(0, 15);
      const attempts = snapshot.attempts
        .filter((a) => questions.some((q) => q.id === a.question_id))
        .slice(0, 25);
      const marker = snapshot.audits[0]?.id ?? 0;
      const source = JSON.stringify({
        knowledge: evidence.node,
        questions: questions.map((q) => ({
          ref: "Q:" + q.id,
          title: q.title,
          stem: q.stem.slice(0, 4000),
          options: q.options,
          answer: q.answer,
          analysis: q.analysis.slice(0, 5000),
          initial_thought: q.initial_thought,
        })),
        attempts: attempts.map((a) => ({
          ref: "A:" + a.id,
          question: "Q:" + a.question_id,
          score: a.score,
          effective: a.effective,
          thought: a.thought,
          faults: a.faults,
          knowledge_names: a.knowledge_names,
          improvement: a.improvement,
        })),
        memories: evidence.memories.slice(0, 10).map((m) => ({
          ref: "M:" + m.id,
          title: m.title,
          cue: m.cue,
          content: m.content.slice(0, 4000),
        })),
        memoryReviews: evidence.memoryEvidence.slice(0, 20).map((r) => ({
          ref: "MR:" + r.id,
          card: "M:" + r.card_id,
          score: r.score,
          note: r.note,
        })),
        scope:
          "仅发送上述文字，不包含图片。最多15题、25条作答、10张记忆卡、20条记忆复盘。",
      });
      const content = await generate(config, source);
      const stale = (service.snapshot().audits[0]?.id ?? 0) !== marker;
      service.ctx.db.prepare("INSERT INTO analyses VALUES (?,?,?,?,?)").run(
        randomUUID(),
        payload.id,
        JSON.stringify({
          text: content,
          evidence_ids: questions.map((q) => q.id),
          model: config.model,
        }),
        stale ? 1 : 0,
        new Date().toISOString(),
      );
      return { ok: true, value: { content, stale } };
    }
    return { ok: true, value: service.handle(command, payload) };
  } catch (error) {
    return errorResponse(error);
  }
}
async function clipboardImage() {
  try {
    for (const item of await clipboard.read()) {
      const mime = item.types.find((t) =>
        ["image/png", "image/jpeg", "image/webp"].includes(t),
      );
      if (mime) {
        const blob = await item.getType(mime);
        return { bytes: Buffer.from(await (blob as Blob).arrayBuffer()), mime };
      }
    }
    throw Error("剪贴板没有可用图片，请先截图或复制图片内容");
  } catch (e) {
    throw new DomainError(
      "MEDIA_REJECTED",
      e instanceof Error ? e.message : String(e),
    );
  }
}
async function stageOperation(p: {
  deckId: string;
  purpose: string;
  source: string;
}) {
  return exclusive(async () => {
    let images: { bytes: Buffer; mime: string }[];
    try {
      if (p.source === "clipboard") images = [await clipboardImage()];
      else {
        const result = await dialog.showOpenDialog(win, {
          title: "添加图片到编辑草稿",
          properties: ["openFile", "multiSelections"],
          filters: [
            { name: "图片", extensions: ["png", "jpg", "jpeg", "webp"] },
          ],
        });
        if (result.canceled) return [];
        if (result.filePaths.length > 20) throw Error("一次最多添加20张图片");
        images = result.filePaths.map((path) => {
          if (statSync(path).size > 20 * 1024 * 1024)
            throw Error("单张图片不能超过20 MB");
          const ext = path.split(".").pop()!.toLowerCase();
          return {
            bytes: readFileSync(path),
            mime:
              ext === "png"
                ? "image/png"
                : ext === "webp"
                  ? "image/webp"
                  : "image/jpeg",
          };
        });
      }
      for (const image of images) validateImage(image.bytes, image.mime);
    } catch (e) {
      if (e instanceof DomainError && e.code === "IMAGE_DECODER_UNAVAILABLE")
        throw e;
      throw new DomainError(
        "MEDIA_REJECTED",
        e instanceof Error ? e.message : String(e),
      );
    }
    return transaction(service.ctx.db, () =>
      images.map((i) =>
        stageImage(service.ctx, p.deckId, p.purpose, i.bytes, i.mime),
      ),
    );
  });
}
async function backupOperation() {
  return exclusive(async () => {
    const result = await dialog.showSaveDialog(win, {
      title: "保存完整备份",
      defaultPath: `GankSoft-${new Date().toISOString().slice(0, 10)}.zip`,
      filters: [{ name: "GankSoft 备份", extensions: ["zip", "gankbackup"] }],
    });
    if (result.canceled || !result.filePath) return null;
    await createBackup(service.ctx.db, dataDir, result.filePath);
    return result.filePath;
  });
}
async function restoreOperation() {
  return exclusive(async () => {
    const selected = await dialog.showOpenDialog(win, {
      title: "选择备份",
      filters: [{ name: "GankSoft 备份", extensions: ["zip", "gankbackup"] }],
      properties: ["openFile"],
    });
    if (selected.canceled) return false;
    const confirmation = await dialog.showMessageBox(win, {
      type: "warning",
      buttons: ["取消", "恢复备份"],
      defaultId: 0,
      cancelId: 0,
      message: "恢复将替换当前学习数据。",
      detail: "软件会保留恢复前的数据目录；备份通过完整性检查后才执行替换。",
    });
    if (confirmation.response !== 1) return false;
    const staging = `${dataDir}-staging-${randomUUID()}`,
      old = `${dataDir}-before-restore-${Date.now()}`;
    await stageBackup(selected.filePaths[0], staging);
    writeRestoreJournal(dataDir, staging, old);
    service.ctx.db.close();
    let moved = false;
    try {
      renameSync(dataDir, old);
      moved = true;
      renameSync(staging, dataDir);
      importFiles.clear();
      openService();
      renewProtocolEpoch(service.ctx.db);
      finishRestoreJournal(dataDir);
    } catch (error) {
      if (moved) {
        if (existsSync(dataDir))
          renameSync(dataDir, `${dataDir}-failed-${Date.now()}`);
        renameSync(old, dataDir);
      }
      openService();
      finishRestoreJournal(dataDir);
      throw error;
    }
    return true;
  });
}
async function boot() {
  const recovered = recoverInterruptedRestore(dataDir);
  openService();
  if (recovered)
    await dialog.showMessageBox({
      type: "info",
      message: "上次恢复操作被中断，已保留未确认目录并恢复到操作前的数据。",
    });
  protocol.handle("gank-app", (request) => {
    try {
      const url = new URL(request.url);
      if (request.method !== "GET" || url.hostname !== "ui")
        return new Response("Not found", { status: 404 });
      const base = resolve(root, "../../dist"),
        target = resolve(base, "." + decodeURIComponent(url.pathname));
      const path = relative(base, target);
      if (
        path.startsWith("..") ||
        !path ||
        (!path.startsWith("assets/") &&
          !path.startsWith("assets\\") &&
          path !== "index.html")
      )
        return new Response("Not found", { status: 404 });
      return net.fetch(pathToFileURL(target).toString());
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });
  ipcMain.handle("gank:protocol", async (event, request: unknown) => {
    assertSender(event);
    const result = await protocolService.execute(request);
    if (
      result.ok &&
      (request as { method?: string } | null)?.method === "preferences.set"
    )
      syncNativeTheme();
    return result;
  });
  protocol.handle("app-media", (request) => {
    const parsed = new URL(request.url),
      parts = parsed.pathname.slice(1).split("/");
    let row: any;
    if (parsed.host === "asset" && /^[a-f0-9-]+$/i.test(parts[0]))
      row = service.ctx.db
        .prepare("SELECT file_name FROM assets WHERE id=? UNION ALL SELECT file_name FROM memory_assets WHERE id=?")
        .get(parts[0], parts[0]);
    else if (parsed.host === "draft" && /^[a-f0-9-]+$/i.test(parts[0])) {
      try {
        row = draftImage(service.ctx, parts[0]);
      } catch {}
    } else if (
      parsed.host === "history" &&
      parts.length === 2 &&
      parts.every((id) => /^[a-z0-9-]+$/i.test(id))
    ) {
      const attempt = service.ctx.db
        .prepare("SELECT question_snapshot FROM attempts WHERE id=? UNION ALL SELECT card_snapshot AS question_snapshot FROM memory_reviews WHERE id=?")
        .get(parts[0], parts[0]) as any;
      try {
        row = JSON.parse(attempt?.question_snapshot || "{}").assets?.find(
          (a: any) => a.id === parts[1],
        );
      } catch {}
    }
    if (!row || basename(row.file_name) !== row.file_name)
      return new Response("Not found", { status: 404 });
    return net.fetch(
      pathToFileURL(join(dataDir, "attachments", row.file_name)).toString(),
    );
  });
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1460,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    title: "GankSoft · 卡片学习工作台",
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#18231f" : "#f5f5f2",
    autoHideMenuBar: true,
    icon: join(root, "../../dist/assets/ganksoft.png"),
    webPreferences: {
      preload: join(root, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
  await win.loadURL("gank-app://ui/index.html");
}
app.on("second-instance", () => {
  if (win) {
    win.show();
    win.focus();
  }
});
if (locked)
  app
    .whenReady()
    .then(boot)
    .catch((error) => {
      dialog.showErrorBox("GankSoft 启动失败", String(error));
      app.quit();
    });
app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  try {
    service?.ctx.db.close();
  } catch {}
});
