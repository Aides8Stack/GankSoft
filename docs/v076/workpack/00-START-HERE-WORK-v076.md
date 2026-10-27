# GankSoft v0.7.6 — v3.7 原型正式 UI 完整改造 / GitHub 全过程同步（Work 唯一主指令）

> 这是用户 2026-10-27 最新版本指令。**先读本文件，再读 GitHub `docs/v076/WORK-PLAN.md`、`docs/v076/GITHUB-RECORDS-AND-ACCEPTANCE.md`、`docs/v076/STATUS.md`；包内 `previous-v075-plan` 仅供补充业务细节，与此文件冲突时以 v0.7.6 为准。**

## 唯一目标

将 `OPEN-ME-v3.7.html` **直接实施为正式 Schema 606 的 Vue/Electron 前端**，结合后续确认的设计/交互要求完成 v0.7.6 小版本，用户已确认的窄图标栏和卡片集工作台不回退。**禁止再做一套简化 UI 或只是参考原型配色。**

此任务绝非只输出方案：按 P0→P6 真正编码、测试、截图、修复、GitHub 保存、验收；用户无需为已确认需求反复授权。全部保留既有 606 / FSRS / 复盘历史 / Markdown & Milkdown/Crepe / 媒体/备份/导入导出，S8.b 保持取消。不重写数据库、不引入首次启动额外网络下载、不改写已有学习数据、不用静态 demo 冒充真实前端。

## 仓库与版本（2026-10-27 已实际同步）

- `Aides8Stack/GankSoft`，目标 `develop`（受保护），既有功能工作分支 `feature/v075-unified-learning-workspace` 已 **非强制 fast-forward** 到 develop 的初始基线。
- 此工作分支最新已核实 HEAD：`06c342dbe421b0ef721aefd08d8e4632e0a5d93d`。开始前必须重新读取远端 HEAD 和本地 WIP；不得覆盖别人的并发修改。
- `package.json` 与 `package-lock.json` 已在此分支修改为 `0.7.6-rc.1`；**仅修改了开发分支，尚未合并 develop，尚未构建 0.7.6 产物。** 经过所有阶段验收与用户批准后才可发布正式 `0.7.6`；每个候选用真实 semver，不伪造发布。
- GitHub 已存 3 个 v0.7.6 核心文档：`docs/v076/WORK-PLAN.md`、`docs/v076/GITHUB-RECORDS-AND-ACCEPTANCE.md`、`docs/v076/STATUS.md`。
- 需要先按 `AGENTS.md` / `docs/development/STANDARDS.md` 识别任务状态、初始化/归档独立 v0.7.6 记录，保存旧 v0.7.5 历史，不凭旧文档宣布任务完成。
- 修改 package 文件需要现有 `pr-trust` owner 对**最终 SHA**审核；不可伪造审批或绕过门禁。

## 原型直接执行原则

1. 运行 `node <工作包>/tools/verify-and-stage-references.mjs <GitHub 工作树目录>`，对真正的 `docs/v075/reference/OPEN-ME-v3.7.html` 校验 SHA256 `8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015`。不可从不完整的文本临摹/自行伪造原型。
2. 抽取原版布局、间距、颜色、按钮、表格、卡片、二级导航、提示、响应式、页面信息区域和交互；转化为实际 Vue 组件与统一 CSS token。不能用 iframe/HTML demo 代替软件；统计不得用原型假数字。
3. **近期确认规则优先**：左侧窄图标栏（不是原版宽侧栏）、以卡片集为中心的入口；图谱全屏、工具栏连续排列，新增子/同级按钮紧跟全屏、普通节点移动、MD 层级大纲、右侧节点详情。根节点拖整图暂缓。
4. 正式链路 `electron/main.ts` → `src/main.ts` → `workspace.catalog` unified → `src/unified/UnifiedWorkspace.vue`。不要把 `src/App.vue` 旧界面/604 回归/spike 图冒充正式 606。
5. 空白 606 首次打开也须具有 v3.7 的完整视觉结构，真实摘要为 0 与合理空态；不可再出现用户截图里的两个方框、默认按钮和大片无结构留白。

## 实施阶段（每阶段都必须 push GitHub）

- **P0** 原型核验、现状截图/差异、设计系统 token、完整主壳/控件与顶部导航；先建立真正的视觉基础。
- **P1** 学习总览：4 真实 KPI、我的卡片集、继续复盘、最近学习与文件夹/新建；空白和真实合成非空 606 全覆盖。
- **P2** 卡片集概览工作台默认入口、主学习计划区、快捷入口、近期卡片/复盘概况、卡片列表/详情/筛选/批量。
- **P3** 三模式编辑器/MD/图片/知识点、复盘标签/暂停/FSRS、分析 KPI/折线/知识掌握度；业务语义不回退。
- **P4** 正式全屏 Mind Elixir 图谱、节点拖动与层级/排序持久化、连续图标工具栏与 tooltip、右侧 Markdown 层级目录、导入差异预览/导出。
- **P5** 设置、回收站、备份/目录与空态/加载/异常/键盘/窄屏的整体完善。
- **P6** **正式 Windows Electron 生产 EXE/ASAR** 的逐页中文截图和真实交互验证，含 1500/1366/900 宽必要状态、空库/合成非空库，业务/安全/构建门禁与 ZIP 验收。

详细页面矩阵见 `previous-v075-plan/03-ACCEPTANCE-MATRIX.md` 和 Github `docs/v076/GITHUB-RECORDS-AND-ACCEPTANCE.md`。

## GitHub 保存是强制验收条件（不可只写“已保存”）

**每一阶段 P0–P6 至少一个远端可追溯 checkpoint commit；每个有意义子任务或中断前也应 push。** 设计、差异、源码、测试脚本、测试报告、Windows 中文截图（安全筛选的非敏感图片）和阶段结论都必须进入 GitHub 仓库。不能仅保存在 Work、一次性临时目录、PR 评论或短期 Actions Artifact。

每个阶段要有 `docs/v076/stages/PX/PLAN.md`、`PROGRESS.md`、`TEST_REPORT.md`、`ACCEPTANCE.md`；必要图存 `evidence/`；同时更新 `docs/v076/STATUS.md` 和 `docs/development/` 的通用恢复记录。每次提交后重新 fetch 核对 HEAD、文件和状态，报告完整 SHA/PR/CI/截图路径，不能以本地 commit 冒充推送。无需每阶段独立分支；按现有分支继续，分支/PR 政策以最新 GitHub 权限实际状态为准。

严禁上传私人学习数据库、账户凭证、密钥、完整敏感运行日志、未经清洗的真实个人路径、巨型生成依赖目录。大型 Windows ZIP 存 Actions Artifact；仓库至少有来源 SHA、Run/Artifact ID、文件清单及 SHA256。GitHub 上必须留真实测试和可复核的结论。不能绕过 pr-trust、分支保护、强推、自动合并 PR、自动发布 Release。

测试结果只能是 PASS/FAIL/BLOCKED/NOT_RUN；阶段仅 NOT_STARTED/IN_PROGRESS/BLOCKED/DONE。正式 Windows 中文视觉验收 NOT_RUN 时不允许写 UI DONE；CI/ASAR/旧 604 测试绿不是 UI 按原型完成证据。

## 持续开发与中断保护

按 P0→P6 连续执行，避免每一步询问已批准事项。每次 Work 恢复先读远端 STATUS，继承已有有效证据，先做未完成项。CI 需要等待时先保存 GitHub 并继续独立模块，不用不停轮询。额度/连接不足时立即停止新增功能，优先普通 commit/push 全部有效 WIP、报告失败/下一任务；如无法推送，生成可验证备份并明确“未同步”。不为保存降低测试或审查标准。

## 完成声明（硬门槛）

所有正式页面依据原版 v3.7 + 后续确认改动完成视觉、交互和真实606数据核对；GitHub 按阶段有源码/设计/测试/截图报告且远端实际存在；正式 Windows 软件截图与用户原型逐页复核通过；现有业务/安全回归无新增阻断；便携 ZIP 来源可验证；用户独立授权后才能合并或发布。

**当前只是 v0.7.6 任务规划和版本号已推送。UI 改造本身尚未完成，P0–P6 的测试应为 NOT_RUN。**