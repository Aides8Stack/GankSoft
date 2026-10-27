# GankSoft v0.7.6 — v3.7 原型直实施 UI 改进计划

> 2026-10-27 用户最新决策：将 **0.7.6** 作为独立小版本，直接以原版 **OPEN-ME-v3.7.html** 设计正式 Vue/Electron UI，结合后续确认的交互改动；此前「取消 UI 视觉整改」仅对 v0.7.5 交付有效，不约束本次 v0.7.6 改造。此文档在 GitHub 中作为 v0.7.6 任务基线，完成状态不能从文档存在推断。

## 导航与设计包纠错（2026-10-27，优先于本仓库较旧的冲突记录）

原版 HTML 的左侧目录是必须照搬的基本结构：不是一排图标。此前 `docs/v076/workpack/` 与 `full-fidelity-v3.7` 包中写的“保留窄图标栏”已撤销。**最新权威为 `docs/v076/workpack/full-fidelity-v3.7/README.md` 及 v3 ZIP**。P0–P3 需要重验左栏及其引发的布局变化；保留原有业务代码和有效功能测试结论，Windows 视觉仍 NOT_RUN。

## 版本、代码与安全基线

- 仓库 `Aides8Stack/GankSoft`，集成目标 `develop`，稳定分支 `main`；开发任务基于 develop 最新提交。此计划初始基线 `ea78b80c953fb9c4ad3f0ad33e6983191ad50e1d`。执行者须核实新的远端 HEAD、保护规则与 WIP。
- 版本目标：开发版 `0.7.6-rc.1`（后续 RC 正常递增），全部验收且经所有者批准后才可发布 `0.7.6` 正式版。**不得未经用户授权自动合并或发布 Release。**
- 必须阅读 `AGENTS.md`、`docs/development/STANDARDS.md`、`docs/v075/AUTHORITY-AND-DECISIONS.md`、`docs/v075/reference/UI-REFERENCE-GUIDE.md`、`docs/v075/reference/REVISION-v3.7.md` 和 `docs/v075/UI-ENTRY-AUDIT-2026-10-27.md`。
- 唯一原版视觉源：`docs/v075/reference/OPEN-ME-v3.7.html`，SHA-256 为 `8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015`；先复核哈希。视觉结构和控件必须实际转化为生产 Vue；不能把模拟 HTML/静态假数据直接投产。
- 真实生产入口是 `electron/main.ts` → `src/main.ts` → `workspace.catalog` 返回 unified → `src/unified/UnifiedWorkspace.vue`。不得只修改旧 `src/App.vue`、旧 604 宿主或测试 spike。
- 保持 Schema 606、FSRS、事件历史、备份恢复、知识树、图片和 Markdown/Crepe 编辑器以及原数据安全策略。S8.b 外部数据追加保持取消；不增加首次启动下载，不全量预加载。现存旧数据不能覆盖删除。
- **最新用户纠正（最高视觉优先级）**：左侧必须按 v3.7 原型 `.left-rail` 原样还原，约 213px，显示 GankSoft 品牌、学习总览、文件夹与卡片集完整名称/数量/选中态、底部设置；不能默认以 68px 纯图标栏代替，也不能添加重复图标侧栏。顶部路径与卡片集二级导航依原型还原。以卡片集为操作中心的业务方式继续保留，知识图谱铺满应用工作区，普通节点拖动变层级/排序、根节点拖动整图暂缓；新增子/同级节点图标紧跟全屏，右侧 MD 大纲真实层级缩进。用户允许补齐原型有而正式 UI 缺少的区域、组件和入口，也允许有必要的新增 UI，但不能改造原型主布局。

## 分阶段落实，禁止只出方案

| 阶段 | 真正交付内容 | 核心验收 |
|---|---|---|
| P0 | 原型哈希确认、正式入口与旧版差异审计、设计 token/公共组件/导航、空白数据库屏幕基准 | v3.7 配色与按钮/表格/页面层次接入正式 Vue，不再是原生默认按钮 |
| P1 | 完整学习总览：四摘要指标、我的卡片集、继续学习、最近学习、文件夹/创建入口与零数据空态 | 空白 606 首次启动同样遵循原型结构，无演示假数字 |
| P2 | 从卡片集进入本集概览；计划主区、4 快捷入口、近期卡片与复盘概况、列表/搜索/批量/详情 | 首页点击集进入集工作台，不直接落到粗糙表格 |
| P3 | 三模式卡片编辑、Markdown/图片/知识关联；真实复盘与统计视觉层次 | 原生编辑功能、FSRS 评分/暂停/历史/自动保存不能回退 |
| P4 | 全屏 Mind Elixir 知识图谱、连续图标工具栏/中文提示、普通节点拖动、MD 正文/层级大纲、导入导出预览 | 1500/1366/900 宽布局、真实保存重开、无重复树导航 |
| P5 | 系统设置、回收站、备份/路径操作、全局窄屏/高 DPI/键盘/加载失败/空态、样式收尾 | 真实路径独立、恢复安全、未保存导航保护 |
| P6 | 正式 Windows Electron/ASAR/EXE 对照验收、必要业务回归、证据补齐、RC 便携包候选 | 与原型逐页对照；未实测 Win10/11 人工项为 NOT_RUN |

## 阶段内质量与提交要求

每一阶段按：原型具体设计 → 源码差异 → 最小实现 → **针对性测试** → Windows 正式主进程截图 → 结果 → GitHub commit/push → 读回完整 SHA → 下一阶段。各阶段代码、设计、验证脚本、聚合测试报告、允许公开的截图及进度必须放到 GitHub；不能仅存在 Work 的临时工作区或临时 Artifact。格式见 `docs/v076/GITHUB-RECORDS-AND-ACCEPTANCE.md`。

真实实现使用现有 API 和增量只读模型；如果数据模型缺指标，标明缺口，批准范围内增加最小只读聚合查询，不修改旧库 Schema、不捏造统计。依赖原生编辑器的表格鼠标拖拽、图片引用、输入法、撤销回退等旧测试不能删除或弱化。

先保证原型的**全部主要信息区、视觉系统和交互模式**，再局部响应式适配；左侧应显示完整卡片集目录与学习总览，不能再以“窄图标导航”为理由替换原型 `.left-rail`；已有的 P0–P3 纯图标版截图不再证明最终视觉一致。未获得真实 Windows 截图对照，**禁止标识 UI DONE**。

## GitHub 远程保存承诺

- 本任务每个 P0–P6 阶段至少一个可追溯 GitHub 检查点；长期任务中每个有意义的子任务或连接中断前都优先 commit/push。
- 每阶段维护 `docs/v076/stages/PX/PLAN.md`、`PROGRESS.md`、`TEST_REPORT.md`、`ACCEPTANCE.md`，必要 ADR、测试脚本及经允许的截图；总览 `docs/v076/STATUS.md`。沿用 `docs/development/TASK.json`、`PLAN.md`、`PROGRESS.md`、`HANDOFF.md`、`TEST_REPORT.md` 进行任务恢复。
- 除明确用于可追溯的非敏感结果外，不提交真实用户数据、密钥、凭据、完整 CI 原始日志、带路径/隐私的截图、巨型缓存/node_modules。大 ZIP 作为 Actions Artifact 或用户下载产物，GitHub 中至少存它的 SHA、Run ID 和非敏感构建清单。
- 不 force push、不绕过 owner pr-trust、不能直接提交到受保护 develop/main；不能自动合并 PR 或发布任何 Release。CI/截图尚未出结果时标记 PENDING/NOT_RUN，继续开发独立任务，不假称 PASS。

## 错误与中断

只允许 `NOT_STARTED` / `IN_PROGRESS` / `BLOCKED` / `DONE`；测试只允许 `PASS` / `FAIL` / `BLOCKED` / `NOT_RUN`。若连接中断、额度不足或测试难以修复，立即停止扩大改动，将已验证代码、未完成 WIP、失败证据摘要及下一步保存到 GitHub，读回远端 SHA。禁止等待长 CI 后导致本地成果丢失。

**v0.7.6 完成定义**：正式生产启动入口读取全新和已用606数据库均正常；全部相关界面按 v3.7 + 用户补充做真实视觉与交互对照；可公开证据同步到 GitHub；既有安全/数据/功能回归通过；便携 ZIP 同源可复验；经所有者审核后再决定合并与发布。


## 双线验收：视觉 + 真实业务（2026-10-27 最新用户要求）

每个 P0–P6 页面必须同时满足**原版 HTML 视觉/交互一致**和**真实生产 Electron → preload/协议 → Schema606 服务/SQLite/FSRS/媒体 → 重新启动恢复**的全链路功能正确；包含负向/异常/取消/事务回滚、作用域隔离与受影响回归。查看 `docs/v076/workpack/full-fidelity-v3.7/END-TO-END-BACKEND-ACCEPTANCE.md` 的逐页必测矩阵。UI 截图、DOM smoke 或静态协议检查不替代真实业务写入和持久化检查。每页独立报告 `VISUAL / UI_INTERACTION / API_INTEGRATION / DATA_PERSISTENCE / REGRESSION / WINDOWS_REAL`；任何关键项未通过都不得 DONE。合成数据+临时数据库，不使用用户库，Windows/人工验收仍单独记录。
