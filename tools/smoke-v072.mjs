import { _electron as electron } from "playwright-core";
import { createRequire } from "node:module";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import { Transformer } from "@napi-rs/image";
const require = createRequire(import.meta.url),
  dir = mkdtempSync(join(tmpdir(), "gank072-ui-")),
  out = resolve("validation-results/v0.7.2");
mkdirSync(out, { recursive: true });
const cases = [],
  errors = [];
let app, page;
const pass = (name) => {
  cases.push(name);
  console.log("PASS", name);
};
try {
  app = await electron.launch({
    executablePath: process.argv[3] ?? require("electron"),
    args: [
      ...(process.platform === "linux"
        ? ["--no-sandbox", "--ozone-platform=headless", "--disable-gpu"]
        : []),
      resolve(process.argv[2] ?? "."),
    ],
    env: { ...process.env, GANKSOFT_E2E: "1", GANKSOFT_DATA_DIR: dir },
  });
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => (window.confirm = () => true));
  await page.evaluate(() => (window.confirm = () => true));
  if (process.env.GANKSOFT_QA_FONT) {
    const css = 'body{font-family:"Noto Sans SC Thin",sans-serif!important}';
    await page.addInitScript(
      (css) =>
        addEventListener("DOMContentLoaded", () => {
          const s = document.createElement("style");
          s.textContent = css;
          document.head.appendChild(s);
        }),
      css,
    );
    await page.addStyleTag({ content: css });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const home = () =>
    page.getByRole("heading", { name: "今天，从一次主动回忆开始。" });
  await home().waitFor();
  async function call(method, payload = {}) {
    return page.evaluate(
      async ({ method, payload }) => {
        const c = await window.gank.protocol({
          protocol: { major: 2, minor: 0 },
          requestId: crypto.randomUUID(),
          dataEpoch: null,
          method: "app.capabilities",
          payload: {},
        });
        const r = await window.gank.protocol({
          protocol: { major: 2, minor: 0 },
          requestId: crypto.randomUUID(),
          dataEpoch: c.dataEpoch,
          method,
          payload,
        });
        if (!r.ok) throw Error(JSON.stringify(r));
        return r.data;
      },
      { method, payload },
    );
  }
  async function reloadDeck(name = "错题复盘") {
    await page.reload();
    await home().waitFor();
    await page.locator(".tree-row").filter({ hasText: name }).click();
    await page.locator(".knowledge-tree-panel").waitFor();
  }
  const cap = await call("app.capabilities");
  assert(!cap.definedMethods.includes("knowledge.relation.save"));
  assert(!cap.definedMethods.includes("knowledge.relation.delete"));
  const deck = (
    await call("workspace.read", { sections: ["catalog"] })
  ).decks.find((d) => d.kind === "question").id;
  const parent = await call("knowledge.save", { deckId: deck, name: "增长率" }),
    child = await call("knowledge.save", {
      deckId: deck,
      name: "基期量",
      parentId: parent,
    }),
    other = await call("knowledge.save", { deckId: deck, name: "比重" });
  for (const [title, knowledgeIds] of [
    ["增长题", [child]],
    ["比重题", [other]],
    ["综合题", [child, other]],
  ])
    await call("content.question.save", {
      deckId: deck,
      title,
      stem: title,
      answer: "B",
      knowledgeIds,
    });
  await reloadDeck();
  const count = async (n) =>
    page.waitForFunction(
      (n) => document.querySelectorAll(".explorer-list .card-row").length === n,
      n,
    );
  const idle = () =>
    page.waitForFunction(
      () => !document.body.textContent.includes("正在刷新匹配结果"),
    );
  await count(3);
  assert.equal(
    await page.getByRole("button", { name: "关闭卡片集", exact: true }).count(),
    0,
  );
  pass("workbench-and-removed-rail-close");
  await page.getByLabel("搜索知识点", { exact: true }).fill("基期");
  assert.equal(await page.locator(".knowledge-tree-row").count(), 2);
  await page.getByLabel("搜索知识点", { exact: true }).fill("");
  await page
    .locator(".knowledge-tree-row")
    .filter({ hasText: "增长率" })
    .getByRole("checkbox")
    .check();
  await count(2);
  await page.locator(".random-knowledge select").first().selectOption("checked");
  await page
    .getByRole("button", { name: "抽取 / 换一批", exact: true })
    .click();
  assert.equal(await page.locator(".sample-preview .tag").count(), 1);
  await page.locator(".random-knowledge select").first().selectOption("eligible");
  pass("tree-search-parent-descendant-linkage");
  await page
    .locator(".explorer-list .card-row")
    .first()
    .getByRole("checkbox")
    .check();
  await page.getByLabel("搜索卡片", { exact: true }).fill("不存在的条件");
  await count(0);
  assert.match(
    await page.locator(".selection-counts").innerText(),
    /已选 1.*1 张不在/,
  );
  pass("manual-selection-independent-of-results");
  await page.getByRole("button", { name: "重置", exact: true }).click();
  await count(3);
  await page
    .getByRole("button", { name: "抽取 / 换一批", exact: true })
    .click();
  assert.equal(
    await page.locator(".knowledge-tree-row input:checked").count(),
    0,
  );
  assert.equal(await page.locator(".sample-preview .tag").count(), 2);
  await page.getByRole("button", { name: "应用", exact: true }).click();
  await idle();
  pass("random-preview-before-apply");
  await page
    .getByRole("button", { name: "抽取 / 换一批", exact: true })
    .click();
  await page.getByLabel("搜索卡片", { exact: true }).fill("增长");
  await page.getByText("预览已失效，请重新抽取", { exact: true }).waitFor();
  assert(
    await page.getByRole("button", { name: "应用", exact: true }).isDisabled(),
  );
  pass("random-preview-invalidation");
  await page.getByRole("button", { name: "重置", exact: true }).click();
  await idle();
  await page.getByRole("button", { name: "最近7天", exact: true }).click();
  await count(0);
  await page.getByLabel("日期字段", { exact: true }).selectOption("createdAt");
  await count(3);
  pass("real-date-fields-and-relative-calendar-days");
  await page.getByLabel("开始日期", { exact: true }).fill("2026-12-20");
  await page.getByLabel("结束日期", { exact: true }).fill("2026-01-01");
  assert(
    await page
      .getByRole("button", { name: "应用区间", exact: true })
      .isDisabled(),
  );
  assert.equal(await page.locator(".explorer-list .card-row").count(), 3);
  pass("invalid-custom-range-does-not-replace-active-filter");
  await page.getByRole("button", { name: "筛选方案", exact: true }).click();
  await page.getByPlaceholder("保存当前筛选方案的名称").fill("本周新卡");
  await page.getByRole("button", { name: "保存方案", exact: true }).click();
  await page.getByRole("button", { name: "本周新卡", exact: true }).waitFor();
  assert.equal(
    JSON.parse(
      (await call("workspace.read", { sections: ["sessions"], deckId: deck }))
        .savedFilters[0].payload,
    ).date.range,
    "7",
  );
  pass("relative-filter-preset-persistence");
  await page
    .locator(".saved-study-filters")
    .getByRole("button", { name: "重命名", exact: true })
    .click();
  const rename = page.getByRole("dialog", { name: "重命名筛选方案" });
  await rename.getByLabel("新方案名称").fill("本周卡片");
  await rename.getByRole("button", { name: "保存名称", exact: true }).click();
  await page.getByRole("button", { name: "本周卡片", exact: true }).waitFor();
  await page
    .locator(".saved-study-filters")
    .getByRole("button", { name: "删除", exact: true })
    .click();
  await page
    .getByRole("button", { name: "本周卡片", exact: true })
    .waitFor({ state: "detached" });
  pass("filter-preset-rename-and-delete");
  await page.getByRole("button", { name: "重置", exact: true }).click();
  await idle();
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(size);
    const r = await page.locator(".study-selection-footer").boundingBox();
    assert(r.y + r.height <= size.height + 1);
    if (size.width === 1280) {
      await page.getByRole("button", { name: "筛选方案", exact: true }).click();
      await page
        .locator(".study-knowledge-side")
        .evaluate((e) => (e.scrollTop = 0));
      await page
        .locator(".study-filter-toolbar")
        .evaluate((e) => (e.scrollTop = 0));
    }
    await page.screenshot({ path: join(out, `workbench-${size.width}.png`) });
  }
  pass("fixed-actions-at-1280x720-and-1440x900");
  await call("preferences.set", { theme: "dark" });
  await reloadDeck();
  await idle();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.screenshot({ path: join(out, "workbench-dark.png") });
  await call("preferences.set", { theme: "light" });
  pass("dark-theme-workbench");
  const png = join(dir, "test.png"),
    jpg = join(dir, "test.jpg"),
    pixel = Transformer.fromRgbaPixels(Buffer.from([30, 100, 80, 255]), 1, 1);
  writeFileSync(png, pixel.pngSync());
  writeFileSync(jpg, pixel.jpegSync());
  await app.evaluate(
    ({ dialog }, paths) =>
      (dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: paths,
      })),
    [png, jpg],
  );
  await page
    .getByRole("button", { name: "＋ 新增错题卡", exact: true })
    .click();
  const editor = page.locator(".modal-backdrop").last();
  await editor
    .getByPlaceholder("输入题干；图片题可填写简短说明，并在下方直接添加截图。")
    .fill("含图测试");
  await editor.locator("select").nth(1).selectOption("B");
  const imageArea = editor.getByRole("region", { name: "图片编辑区" }).first();
  await imageArea
    .getByRole("button", { name: "＋ 导入图片", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelectorAll(".image-editor figure").length === 2,
  );
  assert.equal(
    (await call("workspace.read", { sections: ["content"], deckId: deck }))
      .questions.length,
    3,
  );
  await imageArea
    .getByRole("button", { name: "删除此图片", exact: true })
    .last()
    .click();
  assert.equal(await imageArea.locator("figure").count(), 1);
  await imageArea.locator(".image-button").click();
  await page.getByRole("dialog", { name: "图片查看器" }).waitFor();
  await page.getByRole("button", { name: "原始大小", exact: true }).click();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.screenshot({ path: join(out, "image-editor.png") });
  pass("png-jpeg-stage-preview-delete-without-card-write");
  await editor.getByRole("button", { name: "保存错题", exact: true }).click();
  await page.getByRole("button", { name: "含图测试", exact: true }).waitFor();
  const card = (
    await call("workspace.read", { sections: ["content"], deckId: deck })
  ).questions.find((q) => q.title.includes("含图测试"));
  assert.equal(card.assets.length, 1);
  pass("atomic-card-and-image-save");
  await app.evaluate(({ clipboard }) => (clipboard.read = async () => []));
  await assert.rejects(
    call("media.stage", {
      deckId: deck,
      purpose: "question",
      source: "clipboard",
    }),
    /MEDIA_REJECTED/,
  );
  assert.deepEqual(await call("maintenance.operations"), []);
  await app.evaluate(
    ({ clipboard }) =>
      (clipboard.read = async () => {
        throw Error("模拟读取失败");
      }),
  );
  await assert.rejects(
    call("media.stage", {
      deckId: deck,
      purpose: "question",
      source: "clipboard",
    }),
    /MEDIA_REJECTED/,
  );
  assert.deepEqual(await call("maintenance.operations"), []);
  pass("empty-and-failing-clipboard-no-unknown-lock");
  await app.evaluate(
    ({ clipboard }, raw) =>
      (clipboard.read = async () => [
        {
          types: ["image/png"],
          getType: async () =>
            new Blob([Uint8Array.from(raw)], { type: "image/png" }),
        },
      ]),
    Array.from(readFileSync(png)),
  );
  assert.equal(
    (
      await call("media.stage", {
        deckId: deck,
        purpose: "response",
        source: "clipboard",
      })
    ).length,
    1,
  );
  pass("electron44-clipboarditem-image-read");
  await page
    .locator(".explorer-list .card-row")
    .filter({ hasText: "含图测试" })
    .getByRole("button", { name: "学习", exact: true })
    .click();
  await page.locator(".study-main").waitFor();
  await page.getByAltText("题目图片，点击放大", { exact: true }).click();
  await page.getByRole("dialog", { name: "图片查看器" }).waitFor();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "B", exact: true }).click();
  await page
    .getByPlaceholder(
      "写出判断依据、计算过程或卡住的位置。完全不会时也请记录原因。",
    )
    .fill("独立计算");
  await page.getByRole("button", { name: "粘贴图片", exact: true }).click();
  await page.locator(".image-editor figure").waitFor();
  await page
    .getByRole("button", { name: "提交答案和思路，查看解析", exact: true })
    .click();
  assert.equal(await page.locator(".image-editor .danger").count(), 0);
  await page
    .getByRole("button", { name: "确认并保存本次复盘", exact: true })
    .click();
  await page.getByRole("heading", { name: "本次学习已记录" }).waitFor();
  const history = await call("workspace.read", {
    sections: ["history"],
    deckId: deck,
  });
  assert.equal(
    JSON.parse(history.attempts[0].questionSnapshot).assets.filter(
      (a) => a.role === "response",
    ).length,
    1,
  );
  pass("study-zoom-response-images-frozen-and-recorded");
  await page.getByRole("button", { name: "主页面", exact: true }).click();
  await count(4);
  await page
    .locator(".explorer-list .card-row")
    .filter({ hasText: "增长题" })
    .getByRole("button", { name: "学习", exact: true })
    .click();
  await page.locator(".study-main").waitFor();
  await page.getByRole("button", { name: "页面管理", exact: true }).click();
  const manager = page.locator(".page-manager");
  await manager.waitFor();
  await manager
    .locator(".managed-page")
    .first()
    .getByRole("button")
    .last()
    .click();
  await manager.waitFor();
  pass("manager-stays-open-after-row-close");
  await manager.getByRole("button", { name: "全部关闭", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".review-page-strip [role=tab]").length === 0,
  );
  pass("close-all-pages-preserves-history");
  await page.getByRole("button", { name: "知识图谱", exact: true }).click();
  await page.locator(".me-tpc").first().waitFor();
  assert.equal(
    await page.getByRole("button", { name: "知识关系", exact: true }).count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "展开思维导图工作台", exact: true })
      .locator("xpath=..")
      .getAttribute("class"),
    "mind-tools",
  );
  for (let i = 0; i < 2; i++) {
    await page.locator(".me-tpc").first().click();
    await page.getByRole("button", { name: "新增下级", exact: true }).click();
    await page.locator("#input-box").press("Enter");
    await page.keyboard.press("Control+s");
    await page.waitForTimeout(300);
  }
  const ks = (
    await call("workspace.read", { sections: ["knowledge"], deckId: deck })
  ).knowledge;
  assert(ks.some((k) => k.name === "新知识点1"));
  assert(ks.some((k) => k.name === "新知识点2"));
  pass("map-toolbar-and-distinct-smallest-suffixes");
  const numberedParent = ks.find((k) => k.name === "新知识点1");
  await page.locator(".me-tpc").filter({ hasText: /^新知识点1$/ }).first().click();
  await page.getByRole("button", { name: "新增下级", exact: true }).click();
  await page.locator("#input-box").press("Enter");
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(300);
  const nested = (await call("workspace.read", { sections: ["knowledge"], deckId: deck })).knowledge;
  assert(nested.some((k) => k.parentId === numberedParent.id && k.name === "新知识点1"));
  pass("default-name-isolated-by-parent");
  const large = await call("catalog.deck.save", {
    name: "千卡验收",
    kind: "question",
  });
  await reloadDeck("千卡验收");
  await page.getByText("当前卡片集还没有卡片", { exact: true }).waitFor();
  await call("content.question.save", {
    deckId: large,
    title: "单卡",
    stem: "单卡",
    answer: "A",
  });
  await reloadDeck("千卡验收");
  await count(1);
  await page.evaluate(async (deckId) => {
    const c = await window.gank.protocol({
      protocol: { major: 2, minor: 0 },
      requestId: crypto.randomUUID(),
      dataEpoch: null,
      method: "app.capabilities",
      payload: {},
    });
    for (let i = 1; i < 1000; i++) {
      const r = await window.gank.protocol({
        protocol: { major: 2, minor: 0 },
        requestId: crypto.randomUUID(),
        dataEpoch: c.dataEpoch,
        method: "content.question.save",
        payload: { deckId, title: "分页" + i, stem: "分页" + i, answer: "A" },
      });
      if (!r.ok) throw Error(JSON.stringify(r));
    }
  }, large);
  await reloadDeck("千卡验收");
  await count(50);
  await idle();
  assert.match(
    await page.locator(".selection-counts").innerText(),
    /匹配 1000 张/,
  );
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  assert.equal(await page.locator(".explorer-list .card-row").count(), 50);
  pass("zero-one-thousand-cards-and-50-row-pagination");
  await page.locator('.explorer-list').evaluate(e=>e.scrollTop=350);await page.locator('.explorer-list .card-row h3 button').nth(5).click();await page.getByRole('button',{name:'← 返回上一个页面',exact:true}).click();await page.locator('.explorer-list .card-row').first().waitFor();await page.waitForFunction(()=>document.querySelector('.explorer-list nav')?.textContent.includes('第 2 / 20 页'));assert(await page.locator('.explorer-list').evaluate(e=>e.scrollTop)>0);pass('detail-return-restores-result-page-and-scroll');
  assert.deepEqual(errors, []);
  writeFileSync(
    join(out, "ui.json"),
    JSON.stringify(
      {
        platform: process.platform,
        asar: process.argv[2]?.endsWith(".asar") ?? false,
        cases,
        errors,
        windows10: "not_run",
        windows11: "not_run",
        nativeDialogs: "stubbed",
        clipboard: "stubbed Electron44 ClipboardItem",
        font: process.env.GANKSOFT_QA_FONT
          ? "QA CJK font injected for screenshots"
          : "system",
        database: "isolated synthetic data",
      },
      null,
      2,
    ),
  );
} catch (e) {
  if (page)
    await page.screenshot({ path: join(out, "failure.png") }).catch(() => {});
  console.error("DATA_DIR=" + dir);
  throw e;
} finally {
  await app?.close();
}
