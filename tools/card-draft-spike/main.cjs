// Development-only Electron host. Requires a synthetic activated 606 directory
// made by the test runner. No production flags, migrations or application routes.
const { app, BrowserWindow, ipcMain, protocol, net, clipboard } = require("electron");
const { resolve, join, basename } = require("node:path");
const { pathToFileURL } = require("node:url");
if (
  !process.env.GANKSOFT_DRAFT_TEST_CONTROL ||
  !process.env.GANKSOFT_DRAFT_TEST_SCOPE
)
  throw Error("SYNTHETIC_TEST_CONTROL_REQUIRED");
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app-media",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);
app
  .whenReady()
  .then(async () => {
    const { openUnifiedOwner } =
      await import("../../dist-electron/electron/infrastructure/migrations/coordinator.js");
    const { Application } =
      await import("../../dist-electron/electron/application.js");
    const { createApplicationProtocol } =
      await import("../../dist-electron/electron/protocol/gateway.js");
    const { draftImage } =
      await import("../../dist-electron/electron/modules/media/drafts.js");
    const owner = openUnifiedOwner(process.env.GANKSOFT_DRAFT_TEST_CONTROL),
      ctx = { db: owner.db, dataDir: owner.dataDir, now: () => new Date() };
    const host = createApplicationProtocol(new Application(ctx), undefined, undefined, undefined, clipboard);
    ipcMain.handle("gank:protocol", (event, request) => {
      if (
        event.sender !== win.webContents ||
        event.senderFrame !== win.webContents.mainFrame
      )
        throw Error("TEST_SENDER_REJECTED");
      return host.execute(request);
    });
    protocol.handle("app-media", (request) => {
      const u = new URL(request.url),
        id = u.pathname.slice(1);
      let row;
      if (u.host === "asset")
        { row = ctx.db.prepare("SELECT file_name FROM assets WHERE id=?").get(id);
          if (!row) { try { row = draftImage(ctx, id); } catch {} }
        }
      else if (u.host === "draft") {
        try {
          row = draftImage(ctx, id);
        } catch {}
      }
      if (!row || basename(row.file_name) !== row.file_name)
        return new Response("Not found", { status: 404 });
      return net.fetch(
        pathToFileURL(
          join(ctx.dataDir, "attachments", row.file_name),
        ).toString(),
      );
    });
    // Fault injection remains private to the automation main process, never a renderer API.
    globalThis.cardDraftTest = { ctx, host };
    const win = new BrowserWindow({
      width: 1366,
      height: 900,
      show: true,
      webPreferences: {
        preload: resolve("dist-electron/electron/preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    await win.loadFile(
      resolve("dist/assets/editor-spike/tools/card-draft-spike/index.html"),
      { query: JSON.parse(process.env.GANKSOFT_DRAFT_TEST_SCOPE) },
    );
    app.on("window-all-closed", () => app.quit());
    app.on("will-quit", () => owner.close());
  })
  .catch((e) => {
    console.error(e);
    app.exit(1);
  });
