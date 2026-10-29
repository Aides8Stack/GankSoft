# 08 — 已审基线、历史资产复用决策与未决风险

## 本设计包的事实基线（不可误当新实现）
- GitHub 项目 `Aides8Stack/GankSoft`，现有 `feature/v075-unified-learning-workspace` 与 Draft PR#15 → `develop`。制作时已核实HEAD `8bad335e6c6d7ee7e853c87cd82853d36c20cb90`；若工作开始时HEAD前移，以最新状态和差异为准。
- 冻结 v3.7 文件 `docs/v075/reference/OPEN-ME-v3.7.html`，SHA256 `8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015`，约238632字符。含 `overview()`、`deckHome()`、`cardsScreen()`、`cardDetailScreen()`、`filterScreen()`、`reviewScreen()`、`editorScreen()`、`knowledgeScreen()`、`analyticsScreen()`、`exchangeScreen()`、`scheduleScreen()`、`settingsScreen()`、弹层/MD导入等函数和完整内嵌CSS。
- 生产UI入口 `electron/main.ts → src/main.ts → src/unified/UnifiedWorkspace.vue`。已有 `UnifiedHome.vue`、`UnifiedDeckOverview.vue`、`UnifiedCardDetail.vue`、`UnifiedCardEditor.vue`、`UnifiedAnalytics.vue` 等。**保留能验证的实际功能，不从头复制业务**。
- 已确认原型左栏 `.left-rail` 约213px、学习总览+卡片集文字目录。以前 68px 纯图标作为默认布局是误传，**已撤销**。GitHub最近 P0/P1截图已有左栏纠错，但尚不足以证明全原型视觉等价。
- `src/unified/ui-v076.css` 在核对版本中有大量重复选择器/后置覆盖（例如 `.unified-content` 多处、`.metric` 多处），需要 R0 computed style 归因后有计划迁移，不能一口气删掉。
- 现有 GitHub P0–P3 Linux测试/截图曾有实际证据，Windows正式中文/Win10/11人工未完成；现有原型对照的合成数据稀疏，不能代替与v3.7布局同状态的严格对照。
- 生产 Schema606、FSRS、草稿/发布、图片资产、知识树、备份恢复、学习历史、Milkdown/Crepe/Mind Elixir 都是应复用资产；用户未授权重写数据库、复活 S8.b 或重新下载启动资源。

## 必须避免的重复错误
1. 仅阅读原型截图、再根据主观习惯重新组织 Vue 页面。
2. 先强加 UI 新框架/侧栏，再补一个“原型特殊例外”。
3. 不把原型函数/选择器/事件与正式组件逐项映射，导致卡片行、统计、续学按钮、设置回收站等被改造。
4. 层叠CSS补丁 + 多次覆盖同选择器，不查看最终computed style/响应式，改一处坏其他页。
5. 用原型丰富demo数据对比空白606后宣称“已还原”；把原型模拟掌握度作为真实指标。
6. 测试只断言按钮能点、213px栏和截图尺寸，未测全页差异；单测/模拟后台不能代替真实 IPC、数据库和重启。
7. 因 Work时长或额度耗尽而未提交/未推送；等待 Windows CI 而不保存；把UI纠偏任务混进Schema/流水线扩大改造。
8. 现有状态文档里旧版阶段和断言报告可能自相矛盾，应以代码/测试实际证据+最后提交记录为准，R0生成权威差异与最新恢复入口。

## R0 的第一份必须产出
- `docs/v076/rebuild-v37-source-first/stages/R0/PROTOTYPE-INVENTORY.md`：各函数、DOM结构、CSS/token、状态和事件覆盖清单；
- `.../stages/R0/PROTOTYPE-VUE-API-MAP.md`：逐项源码位置与实际typed API；
- `.../stages/R0/STYLE-CASCADE-AUDIT.md`：重复覆盖的选择器、实际computed styles、迁移顺序；
- `.../stages/R0/FIXTURE-PLAN.md`：v3.7等效真实合成数据/独立空态/错误态种子；
- `.../stages/R0/BASELINE-EVIDENCE.md`：原型/正式同状态截屏、环境、截图元数据与初始差异；
- `.../stages/R0/{PLAN,PROGRESS,TEST_REPORT,ACCEPTANCE}.md`：真实进展，NOT_RUN写NOT_RUN。
这些是 R0未来实施交付物，本工作包上传阶段不应伪造它们已经存在。

## 未决风险与处置
- **Windows视觉**：目前本包无新Windows截图；R8必须实机，不凭Linux称PASS。
- **数据指标映射**：原型假76%或242卡，不能直接写正式UI；夹具真实建立对应业务状态，无法等价则标 `BUSINESS_ADAPTED` 并解释。
- **图谱原型部分交互模拟**：复用真实Mind Elixir与知识API，对视觉和操作合同直接迁移，不把模拟实现当实际数据库功能。
- **编辑器**：仍以Crepe官方原生公开API为主，不从原型粘贴contenteditable; 重点回归表格拖拽/图片粘贴/IME/撤销及持久化。
- **存量历史**：保留全部原 P0–P6截图/测试文档与原 v2/v3 zip，目录新版优先；逐项可复用证据而非一键声明完成。
- **权限/并发**：若 GitHub HEAD变化必须非强制fast-forward到新HEAD重审并重建tree；不覆盖外部Work成果。
