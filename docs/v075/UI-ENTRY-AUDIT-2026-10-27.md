> 所有者最新指令（2026-10-27）：取消UI原型对照与视觉整改。本文件保留既有核对结果，不再扩展；其中UI对齐阻断/后续整改建议已失效，不作为S9交付门禁。正式功能冒烟以S9-PRODUCTION-SMOKE-2026-10-27.json为准。

# v3.7 原型与正式 Electron UI 核对

核对基线：PR #13，`d66b2ce5c8f0f75de17a84e28bf66343ed2e2347`。本轮只修测试启动断言、补核对脚本与文档；生产前端、数据库、依赖、工作流均未修改。

## 结论

六个主要界面均有真实源码，当前正式606入口已接入。本轮用 `package.json` 指定的生产 main 启动隔离空白数据目录，经真实按钮导航核对7个页面，全部可达、无页面异常。**这证明接入，不证明符合 v3.7。** 当前视觉/信息结构仍有明显差距，S9 UI 验收 BLOCKED；不能称“界面已经按原型完成”。

原型没有丢失：本轮从原交接包恢复原文件，已保存到 [reference/OPEN-ME-v3.7.html](reference/OPEN-ME-v3.7.html)，SHA-256 `8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015`，与早期 README 登记一致。当前分支及其可达 Git 历史此前没有该文件，旧文档只有外部 ZIP 的路径和哈希；这解释了只搜索仓库时找不到。没有重建或改写原型。冻结规则及后续用户决定优先，原型演示数据不应搬进正式应用。

## 正式加载链与旧 UI

`package.json main` → `dist-electron/electron/main.js` → `electron/main.ts:createWindow()` → `gank-app://ui/index.html` → `src/main.ts` → `workspace.catalog`。

- 正式主进程通过 `prepareFreshUnified` / `createFullRestoreSession` 打开606；catalog 返回 `model='unified'`，选择 `src/unified/UnifiedWorkspace.vue`。
- 没有 Vue Router URL 切换。主界面使用 `UnifiedWorkspace.vue` 的 `page` 状态导航；各界面 URL 保持 `gank-app://ui/index.html`。
- `src/App.vue`、Overview、CardExplorer、CollectionSummary、StudyWorkspace、Insights 等旧 UI 保留；只有 catalog 返回旧模型时才选择 App。它们未作为正式606的页面组件使用，不能把存在这些文件当作新版已接入。
- 保留的604集成回归通过 `tools/validation/legacy-test-app.mjs` 编译 `tests/fixtures/legacy-main-v074.ts.txt` 到隔离测试目录。它不进入生产 main；不能为了恢复旧首页标题，把正式应用切回此宿主。
- `tools/card-draft-spike/main.cjs` 是另一种独立606测试宿主，通过专用环境变量加载 `src/unified/spike-main.ts`。S7截图来自这里，不是生产 EXE 启动证据。

## 六界面核对与差异

表中“接入”采用本轮真实生产 main 的 Linux 导航结果；Windows当前源码的完整导航及最终便携EXE仍待验。

| 界面 | 真实源码 / 正式状态 | v3.7 与当前实现的差异 | 差异分类 |
|---|---|---|---|
| 学习总览 | `UnifiedWorkspace.vue`，`page='home'`；已实现且已接入 | 原型有卡片集/卡片/今日待复盘/今日完成4项摘要、我的卡片集、继续今天的复盘、最近学习。当前为目录路径、网格目录项、导入/新建入口，没有上述总览组合；文件夹也会显示在同一网格 | 总览组合未实现；功能目录已接入 |
| 卡片集工作台 | `page='cards'` 及 `UnifiedAnalytics.vue` 的 `overview` 分支；已实现且已接入 | 当前进入卡片集直接到列表；“卡片集概览”是分析页的简化分支。没有原型本集学习计划大区、4项快捷入口、最近卡片与复盘概况双栏。列表当前为选择/卡片/类型/排期/操作，缺原型知识点摘要、复盘次数、最近得分等列 | 对应工作台布局及列表列项未实现；旧 CollectionSummary/CardExplorer 已实现但未接入606 |
| 复盘 | `review/UnifiedReviewForm.vue`，`page='review'`；已实现且已接入 | 真实会话标签、进度、暂停、三种模式、作答/揭示/评分/保存存在。原型的本轮进度条、题卡与操作区分组及紧凑视觉层次未完整映射，当前主要是表单块。原型的演示模式切换不作为必须复制的真实行为 | 核心已实现且已接入；视觉对齐未完成；Windows最终同包已实现但未验证 |
| 编辑器 | `UnifiedCardEditor.vue` → `cards/CardDraftForm.vue` → `editor/MarkdownEditor.vue`；已实现且已接入 | 三模式、草稿、发布、Milkdown/Crepe、图片、Prompt及知识关联存在。知识关联当前在表单前作为独立区，不是原型内嵌标签/图谱选择布局；公共材料较靠前，多个编辑器纵向大块排列。所属集当前只读展示，原型为选择控件；不据此新增未经决定的移动语义 | 编辑功能已实现且已接入；对应排版/关联展示未完整实现；原型选择控件业务语义缺少证据 |
| 学习分析 | `UnifiedAnalytics.vue`，`page='analysis'`；已实现且已接入 | 真实数据范围、复盘计数、自评/用时折线、历史回看、按需知识掌握查询存在。原型主区为累计复盘/掌握度/严格正确率/平均自评及趋势、知识点掌握列表。当前4指标为当前卡片/范围内复盘/平均自评/平均用时，知识掌握要展开并选单个节点，不是原型列表 | 现有指标/图表已接入；原型指标组合与掌握列表未实现 |
| 知识图谱 | `components/MindMapWorkspace.vue`，`page='knowledge'`，传 `unified-deck-id` 和 `expanded`；已实现且已接入 | 复用真实Mind Elixir、搜索、图标工具栏、节点操作、MD大纲与交换。当前直接全屏并隐藏外层导航，符合用户后续全屏决定；原型默认含标题/右详情栏，可切全屏，不能把此适配直接判为缺失。具体工具栏顺序/右详情/大纲需结合冻结规则继续核对 | 核心已实现且已接入；完整原型交互/正式Windows同包已实现但未验证 |

## 共性差异与证据边界

1. 当前统一工作区是76px图标栏、独立 `.unified-*` 样式；原型完整导航/顶部子导航没有逐项映射。用户已确认图标化，不要求恢复宽导航；要对齐的是信息层次、紧凑控件和必要内容。
2. `src/main.ts` 确实导入 style/workspace/theme 等 CSS，不能说 CSS 文件完全没加载。但 unified-shell 没有旧 `.v04` 外壳，许多旧壳专用样式不能作用于新壳；`src/style.css` 全局 select 的 `width:100%` 又作用于统一列表的模式筛选，解释了 Windows 截图中筛选独占一整行。按钮基础样式也未形成原型的完整视觉系统。仅加 `.v04` 不能当作安全修复，会同时套入旧布局。
3. 原型七页已实际运行并读取 DOM（overview/deck/cards/review/editor/analytics/knowledge）。本地原型截图在时限内未完成，未做逐像素相似度或声称视觉通过。生产页截图可生成，但本地缺中文字体，不能冒充 Windows 中文视觉验收。
4. 本轮重新下载并校验 S7 原始 Windows Artifact `12603046107`（Run `40203150728`，ZIP SHA-256 `c9fd763727ed96444266725e3d8912d8a6432f4231c46e703816ddf737bd1591`），复用其34张截图清单。实际重看 home/cards/deck-overview/editor/analytics/review-question-answer/map-fullscreen 的1366图。
5. 原34图曾有 V01/V02/V03，不能当作34张全是原始PASS。修复 Artifact `12603867444`（Run `40205235936`，SHA-256 `4d0962564b4caafe1c2999bb0f3c532ff5ccfacb94be7d53cb7f0b5db357f137`）已校验，本轮实看修复后的复盘选项图；其余按 `S7-VISUAL-REVIEW.json` 继承原24张不受影响图+10张修复图，不冒称本轮重看全部44张。
6. S7既有DONE是当时开发自动化/中文布局准入记录；它没有逐条覆盖 v3.7 的信息结构。历史结果保留，新增 `uiV37Acceptance=BLOCKED`，不把历史截图检查直接提升为完整原型验收。
7. Run `40328357083` 的 Windows `production606.json` 实际9场景PASS，证明606正式主进程/数据流程在表格测试失败前已运行；该测试大量调用协议，不等同于六页导航或视觉验收。整次CI仍FAIL。旧604的107回归也不能作为606 UI证据。

## S9 阻断与最小后续方案

- 当前不是“六页源码都没接入”。路由无需切回旧 App；这么做会重新依赖604 DTO。应保留统一页和现有真实API，在下一轮按本表逐项补信息区及样式，对需要的摘要采用现有只读模型，确有缺口再明确最小API扩展。本轮没有实施这些改造。
- 优先首页与卡片集工作台，其次列表/编辑器/分析，复盘与图谱按既定冻结交互补视觉核对。每批只验受影响页，统一以生产main/最终ASAR导航取证；测试宿主截图只作辅助。
- 新Windows CI尚待复验本次测试修复；最终便携ZIP未生成。现有portable-only仅接受develop，PR不产软件包；未改守卫、自动合并或发布。版本仍0.7.5-rc.1，不重命名冒充正式0.7.5。
- Win10/11同包人工验收 NOT_RUN。UI未对齐和核对通过前，S9保持BLOCKED。

可复现正式接入审核：`npm run build` 后运行 `node --experimental-strip-types tools/validation/audit-production-ui.ts`。使用真实生产main及独立合成目录，报告/7张截图只写 `validation-results/production-ui-audit/`；不访问用户库、不修改生产代码。这个7页导航通过也不表示v3.7视觉通过。
