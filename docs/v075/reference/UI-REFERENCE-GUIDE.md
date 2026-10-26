# 提供给 Work 的前端 UI 视觉与交互参考说明

## 从哪里打开

- **最容易查看**：`08-references/UI/OPEN-ME-v3.7.html`（单文件离线，双击 Edge/Chrome）
- **开发者可分文件查看**：`08-references/UI/source/index.html`、`styles.css`、`app.js`、`knowledge-forest.js`、`knowledge-md.js`、`tests/*.test.cjs`。
- 截图：`08-references/UI/screenshots/knowledge-toolbar-v3.7.png`；窄屏：`knowledge-toolbar-narrow.png`。
- 优先阅读 `08-references/UI/source/UI-DESIGN-SPEC.md` 与 `REVISION-v3.7.md`，但如与本包最终冻结规则冲突，**以 `01-design/00-AUTHORITY-AND-DECISIONS.md` 为准**。

## 主要流程的 UI 对照

| Work 要实现的页面 | v3.7 演示/设计要点 | 必须真实接入的后端 |
|---|---|---|
| 学习总览 | 左侧小图标卡片集导航、中心紧凑概览 | 卡片集/队列/统计摘要 |
| 所有卡片与详情 | 搜索/筛选/列表；勾选后批量工具栏；详情与编辑分离 | `card.listSummary`/详情/操作 |
| 编辑卡片 | deck 选择与标题行有层级，三种模式区域按需出现，Markdown 在焦点处工具栏，草稿状态不扰动 | Single Draft/Published Content/Media/Prompt |
| 类型切换 | 有确认并清理旧草稿；发布前再选「重新开始学习」 | `draft.switchType` 与原子 `publish` |
| 复盘工作台 | 顶部会话进度、计时暂停、题目内容优先、自评 | 固定版本的事件与 Scheduler |
| 图谱工作台 | 大画布+纯图标工具栏+tooltip/搜索/节点操作；右侧只是选中节点详情 | Mind Elixir event adapter/Knowledge service |
| MD 大纲 | 按节点正文排版；右侧**缩进树形目录** | 同一份知识树 + Markdown Body |
| MD 导入导出 | 导入右侧来源/大编辑框，左边图选择挂载；导出先点节点再显示复选项 | preview/confirm/exchange API |
| 统计/调度 | 精简主指标，详细分析按需展开，参数重算预览 | assessment / scheduler read models |
| 设置/回收站 | 与普通功能页分离，保留返回原处；不让用户一击永久删除 | storage/backup/trash API |

## 原型中没有完成的真实能力

`contenteditable` 是交互模拟，不能当 Markdown 引擎；假 API/假数据刷新不保留；图谱拖拽/历史/恢复在原型中只是部分模拟；无真实 SQLite/FSRS/完整媒体二进制/Windows 原生文件选择对话框。Work 需把视觉设计映射到真实现有 Vue 组件，不直接替换 `src/App.vue` 为 demo 页面。

## v0.7.5 最新拖拽决定

- 空白画布平移、**普通节点**重排/改层级：要实现与验证。
- **拖动根节点移动整张思维导图：暂缓，不演示、不验收**。
- 根节点手势不等于普通节点拖拽自由布局；不允许为了本次交付增加复杂自由坐标算法。

## UI/UX 对齐验收

- 大屏笔记本宽度下内容区域舒展，图谱工具栏图标不挤到右边；窄屏可换行但不相互遮挡。
- hover/focus tooltip 说明功能；键盘可访问，标题、选中态和数据未保存提示准确。
- 知识图谱详情无重复树导航，MD 大纲右侧目录按 `parentId` 显示 18px 级差或等价明显层级。
- 文本输入区域可扩展、不会因固定高度把 MD 输入压到页面底部；不滥用显式保存按钮。
- 真实交互要有错误/取消/无数据状态，不能仅验证截图。
