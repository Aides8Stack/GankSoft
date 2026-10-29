# ⚠️ 历史指令，不再作为 Work 的优先执行入口（2026-10-27）

最新用户已经批准**重新构建设计、实现和测试方案**。原P0–P6指令以下仅供追溯，**新的Work必须先阅读 `docs/v076/rebuild-v37-source-first/README.md` 和 `07-WORK-THREE-STAGES-AND-RECOVERY.md`，从R0源码级解构开始，不继续依据本文件直接跳P4–P6**。原代码及数据安全测试保留，R0–R8目前尚未实施。强制按原型 HTML DOM/CSS/JS 映射 Vue + 真正IPCs/Schema606测试；最多3阶段保存后结束。

---

# GankSoft v0.7.6 — Work 连续执行指令：完整复刻 v3.7

在 GitHub `Aides8Stack/GankSoft`、唯一现有分支 `feature/v075-unified-learning-workspace`、Draft PR #15 上继续开发。先读取 `AGENTS.md`、`docs/development/STANDARDS.md`、`docs/v076/WORK-PLAN.md`、`docs/v076/STATUS.md`、本目录 `FULL-FIDELITY-SPEC.md` 与 `UI-MAPPING-AND-ACCEPTANCE.md`，并打开原版 `docs/v075/reference/OPEN-ME-v3.7.html` 核验 SHA256。以最新远端 HEAD 和未提交 WIP 为准，绝不重置/覆盖已有工作。

## 用户最新最高优先决定
**不是参照原型做相似软件，而是尽可能完整还原原型的界面外观、结构和交互；原型已有而正式 Vue 缺失的 UI 全部允许补齐，不视为需求扩大。**
**纠正此前误传的“窄图标栏”：原版 v3.7 左侧是完整学习总览 + 文件夹 + 卡片集名称/数量的约213px目录，不得继续保留68px纯图标列作为默认布局，也不得再增加一套重复竖向图标侧栏。** 保留以卡片集为中心的操作和图谱工具/根节点特殊规则。原型所有假数字/模拟功能替换为 Schema606 真实数据与接口；不改业务数据库和已稳定业务。把 P0–P3 已有界面的左栏重大偏差列为当前优先修复，先恢复原型完整目录、再继承当前 P3 实际成果继续 P4–P6；不要因为本地场景 PASS 就跳过 UI 差异。

## 具体执行
1. 检查 GitHub 当前 HEAD、PR 和 CI，不等待 CI；核对本地 WIP。读取 v3.7 原型各页函数、CSS、DOM，与正式 Vue 逐页建映射清单。
2. **先修正生产 `UnifiedWorkspace.vue` 的主壳**：恢复原型 `.left-rail` 约213px，完整学习总览、文件夹、卡片集名称/数量及选择状态，不使用一条纯图标侧栏；还原 `.topbar` 与 `.subnav`。随后复验 P1 首页、P2 本集概览/列表/详情和 P3 编辑器/复盘/分析在恢复侧栏后的真实视觉。逐区域修复视觉：排版、尺寸、留白、标题、按钮、图标、卡片、状态、双栏、子导航、工具条、空态。缺失 UI 直接补。保持真实数据、性能和能力。
3. 每一页做 1500/1366/900 三宽的**原型和正式 Electron 同尺寸并排截图对照**；至少分别验证空白606与合成非空606，记录真实实现 SHA、环境、差异项；对照失败则修正后重测。Windows 真实正式截图未完成时仅标视觉 NOT_RUN/BLOCKED。
4. 功能测试、协议、构建、旧 workspace 17 场景以及受到影响的编辑/复盘/图片/图谱回归按原强度测试，绝不删、弱化或跳过断言。旧功能检验结果与视觉验收分开报告。
5. 保留已实现的 P3 编辑器/复盘/分析和测试证据，不重复开发；修正 P0–P3 的共用主壳后继续 P4 全屏知识图谱/MD、P5 设置/回收站、P6 Windows 正式 UI 与便携候选验收。同一套原型复制标准贯穿每页，不得又自行设计。
6. 每个阶段将源码、测试、差异表、脱敏截图、PLAN/PROGRESS/TEST_REPORT/ACCEPTANCE 同步至原 PR #15，推送后读回远端 HEAD 和关键文件。额度或连接中断前优先保存 WIP。
7. 不新建分支/PR，不强推，不修改 Schema606、FSRS 或已取消 S8.b，不自动合并、不绕过 pr-trust、不发布；不等待 CI 阻止独立开发。若视觉原型截图环境超时，标 BLOCKED，保留复验任务；不冒称 PASS。

## 阶段状态不得假称
截至此次设计纠正之前核实的 P3 检查点 `ebcad40cfed81643bbd0d23612d8c99405ecb8f0`：P0–P3 已有源码和 Linux 辅助视觉证据，但仍 IN_PROGRESS，且左栏与原型存在重大偏差；Windows 逐页视觉 NOT_RUN；P4–P6 尚待开发/验收。新 Work 先确认真正最新 HEAD、本地 WIP 和历史测试，优先恢复原型侧栏，勿丢失 P3 代码。


## 新增必须执行的全链路测试

**立即读取 `END-TO-END-BACKEND-ACCEPTANCE.md` 并逐条执行。** 各阶段不仅要修复 v3.7 视觉，还必须从正式 Electron UI 点击到真实 preload/IPC/协议/Schema606 业务，再对数据库/FSRS/事件/图片/知识树及重启后的实际结果检查。复盘、编辑、导入导出、备份恢复、图谱保存、回收站及失败/取消必须做真实端到端专项/回归。可继承未受影响的有效历史证据，但修改公共导航/调用链必须复验受影响入口。禁止因截图通过而标 DONE。按 `VISUAL`、`UI_INTERACTION`、`API_INTEGRATION`、`DATA_PERSISTENCE`、`REGRESSION`、`WINDOWS_REAL` 分开记录退出码/数量/环境/被测 SHA。
