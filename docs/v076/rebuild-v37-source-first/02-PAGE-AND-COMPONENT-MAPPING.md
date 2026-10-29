# 02 — 原型函数 → 正式页面 → API → 强制对照矩阵（初始蓝图）

> 下述是**已核对原型函数名及现有部分 Vue 文件**得出的迁移待办，不代表这些项目都已验证。R0 必须展开原型每个对应函数及 CSS 再补精确 DOM、位置、事件 handler、完整 API schema 与可复核源码行号。

| 原型实际函数/区域 | 用户可见设计与状态 | 优先检查的现有正式代码 | 真实业务/API应验证 | R0需做的差异调查 |
|---|---|---|---|---|
| `.app-shell`/`.left-rail` | 213px品牌、学习总览、文件夹树、卡片集文字与数量、选中态、设置 | `UnifiedWorkspace.vue`, `UnifiedCatalogBranch.vue`, `ui-v076.css` | `workspace.catalog`、目录写/删/恢复/重启、选中集 | 旧纯图标列禁止；核目录多层与分页 |
| `.topbar`/`.subnav` | 路径、状态、顶栏和本集页签/hover/focus/折叠 | `UnifiedWorkspace.vue` | 导航守卫、会话暂停、草稿保护 | 子导航顺序与原型一致，不能重复菜单 |
| `overview()` | 页面 heading、4 统计、我的卡片集左栏、右续学 callout、最近学习、三宽/空态 | `UnifiedHome.vue`, `UnifiedWorkspace.vue` | `workspace.dashboard`、catalog、真实 sessions/recent | 原型 `deck-row` 结构；禁止把说明文本换成无依据入口 |
| `deckHome()` | 本集标题、路径、统计行、计划 hero、4 快捷、最近卡片、复盘概况 | `UnifiedDeckOverview.vue` | 本集 dashboard/card summary/FSRS | 原型演示76%必须用可解释真实指标或真空态，不假装长期掌握 |
| `cardsScreen()` | 搜索+类型筛选、草稿箱、批量工具栏、卡片表格、详情入口、空态 | `UnifiedWorkspace.vue`, `UnifiedCardBatch.vue` | 分页 summary、范围筛选、批量操作、回收站 | 全选当前页 vs 跨页；列顺序/密度/状态样式 |
| `cardDetailScreen()` | 正文、答案解析、知识点、事件历史、统计图、返回、编辑 | `UnifiedCardDetail.vue` | card detail/history/只读统计 | 版本与模式不串；详情按需加载 |
| `filterScreen()` | 知识点/状态/时间/随机/卡片模式筛选及发起学习 | `UnifiedStudyPlanner.vue` | 真实筛选/确定性选择/学习会话 | 选中/取消/错误/无结果 |
| `editorScreen()`, `mdBox()`, 弹层 | 三模式、题干/答案/解析/素材/知识、原生富文本、草稿/发布/媒体/Prompt | `UnifiedCardEditor.vue`, CardDraftForm/Crepe 子组件 | draft/publish/knowledge/media/API | 切换类型清草稿需确认；图片/表格/LaTeX/历史 |
| `reviewScreen()`, `reviewQuestion()`, `reviewRecall()`, `reviewReading()` | 三模式答题、计时、暂停、揭示、自评、思路、错因、保存/下一题 | 现有复盘表单及 `UnifiedWorkspace.vue` | learning.session、events、FSRS | 答错强制 Again；每次原始思路和时间均持久化 |
| `analyticsScreen()`, `chartSVG()` | KPI、折线、分组、明细、展开状态与知识点掌握 | `UnifiedAnalytics.vue` | 真正的学习事件与只读聚合 | 不把自评平均值标成掌握度，空数据有原型层级 |
| `knowledgeScreen()`, `knowledgeSide()`, `knowledgeNavItems()`, `treeOutline()` | 全屏图谱、连续工具栏、搜索、节点详情、右侧MD缩进大纲 | 知识图谱现有组件/Mind Elixir | 知识树持久化/父子排序/多对多/历史快照 | 工具栏次序、增子/同级紧随全屏、层级缩进 |
| `knowledgeTransferScreen()`, `previewMerge()`, `makeExportPreview()` | 导入位置、差异预览、Markdown整体/局部范围 | 现有 KnowledgeExchangeMap/交换UI | preview/confirm/export、冲突解决 | 真实树层级与取消无副作用 |
| `exchangeScreen()` | 导入导出、批量操作、数据格式反馈 | `UnifiedCardExchange.vue` | 内容协议、媒体、知识关联、回执 | 不跨集污染/不丢历史 |
| `scheduleScreen()` | 本集调度/单卡例外、重算预览、保存 | `UnifiedScheduleSettings.vue` | FSRS 设定/最大间隔/重算命令 | 修改参数默认不重排现有排期 |
| `settingsScreen()`, `settingsBody()`, `trashPane()` | 通用、复盘与调度、数据与备份、外观、关于、设置内回收站 | `UnifiedSystemSettings.vue`, `UnifiedRecycle.vue`, `UnifiedCardRecycle.vue` | 设置/备份/恢复/迁移/回收站 | **回收站属于设置内的功能导航**，不可作为同级重复主侧栏项；危险操作确认、返回原处 |
| `renderModal()`, 多种`*Dialog()` | 知识点选择、粘贴预览、复制/导出、资源、删除、模式切换 | 既有 modal/editor dialogs | typed API 正反向/失败/取消/重试 | 样式、覆盖层、焦点/Tab、确认、图片引用 |

## R0 源码清单字段（必须填完整）
```
id:
prototype_function:             # 例如 overview()
prototype_dom_selector:         # 例如 .split-layout > .surface
prototype_css_location:         # CSS 定义及媒体查询；记录计算后的实际值
prototype_action_and_state:     # DOM事件，render分支，弹窗，hover/focus/disabled
vue_component_and_lines:        # 仓库当前版本路径+位置
actual_protocol_method:         # 必须从 registry.ts 实核，不得臆造
data_mapping_or_empty_state:    # 用真实数据或合法空态，禁止硬编码演示数字
status: EXACT|BUSINESS_ADAPTED|MISSING|NOT_VERIFIED
difference_and_reason:
reference_screenshots:
production_screenshots:
e2e_test_case:
reviewer_signoff:
```
优先还原**主结构**，再逐项确认图标、字体、间距、表格列、按钮、滚动和状态；每次迁移按原型真实函数划定边界，而非按 Work 心目中的“等价视觉”自拟页面。
