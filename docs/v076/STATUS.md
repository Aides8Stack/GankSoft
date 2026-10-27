# GankSoft v0.7.6 — GitHub 开发状态

更新依据：2026-10-27 用户明确授权将按 v3.7 原型直接落地的 UI 改造作为 **0.7.6 小版本更新**；所有阶段设计/源码/测试/截图/结果必须保存到 GitHub。

## 当前基线

- 目标仓库：`Aides8Stack/GankSoft`；目标集成分支：`develop`（受保护）。
- 起点已核实 develop SHA：`ea78b80c953fb9c4ad3f0ad33e6983191ad50e1d`，版本 `0.7.5-rc.2`。
- 现有 `feature/v075-unified-learning-workspace` 分支已通过正常非强制 fast-forward 跟进这一基线，保留原历史；v0.7.6 规划先同步于此工作分支，供 Work 恢复，后续以真实工作区与远端 SHA 为准。
- v0.7.6 开发版本 **已实际同步**：`package.json` 与 `package-lock.json` 根版本均为 `0.7.6-rc.1`（先行），版本提交检查点 `06c342dbe421b0ef721aefd08d8e4632e0a5d93d`；全部 UI/业务/Windows 证据确认且所有者授权后才可成为正式 `0.7.6`。
- 正式 UI 入口：`src/unified/UnifiedWorkspace.vue`（`src/main.ts` 读取模型后选择）；原型：`docs/v075/reference/OPEN-ME-v3.7.html`。
- 已知真实问题：v0.7.5 正式 Windows 606 首页与原型差距严重，见原有 `docs/v075/UI-ENTRY-AUDIT-2026-10-27.md`；v0.7.6 必须修复，不得仅凭功能回归及 CI 绿宣布验收。

## 阶段状态

| 阶段 | 状态 | 下一检查点 |
|---|---|---|
| P0 视觉基线/设计系统 | IN_PROGRESS | 源码/本地三宽PASS；Windows视觉NOT_RUN |
| P1 学习总览 | IN_PROGRESS | 完整信息区/真实数据/本地7场景PASS；Windows视觉NOT_RUN |
| P2 卡片集工作台/列表详情 | NOT_STARTED | 以本集概览进入，而非列表 |
| P3 编辑器/复盘/分析 | NOT_STARTED | 原型界面映射到真实 API，回归 |
| P4 知识图谱/MD | NOT_STARTED | 全屏/工具栏/拖动/大纲/保存 |
| P5 设置/回收站/整体完善 | NOT_STARTED | 复合交互/状态/布局 |
| P6 正式 Windows 逐页验收/RC | NOT_STARTED | 真实 Windows 生产 EXE 中文截图、必要回归、便携 ZIP |

## 当前测试及发布状态

- v0.7.6 业务专项：NOT_RUN。
- v0.7.6 Windows 正式 UI 对照：NOT_RUN。
- v0.7.6 RC 便携版：NOT_RUN，未生成。
- GitHub PR：此处不预设为已创建，Work 需要在实施前确认原分支关联与 PR 保护，再建立本版本审核入口。
- Release：NOT_RUN，**未授权发布**。
- 已存在的 v0.7.5 CI/产物不能冒充 v0.7.6 的有效测试或发布记录。

## Work 恢复入口

1. 读取 `docs/v076/WORK-PLAN.md` 与 `docs/v076/GITHUB-RECORDS-AND-ACCEPTANCE.md`；可使用用户提供的 v0.7.6 Work ZIP 作为离线备份。
2. 读取 `AGENTS.md`、现有 `docs/development/` 状态和远端 HEAD，不改写他人 WIP；初始化/归档新的 v0.7.6 任务态。
3. 对每个阶段创建/更新 `docs/v076/stages/PX/PLAN.md`、`PROGRESS.md`、`TEST_REPORT.md`、`ACCEPTANCE.md`，连同源码、测试、可公开的 Windows 截图同步 push。
4. 每次 push 后核对远端文件树/HEAD/PR。中断/额度不足先保存检查点；PR 及 Release 的合并/发布须所有者授权。

> 此文件是当前任务进度索引；未执行的测试和功能不标 PASS/DONE。

## 2026-10-27 工作包原文 GitHub 补存检查点

- 已提交 12 份原工作包文本/补充规范及 1 份目录说明到 `docs/v076/workpack/`，包含当前 v0.7.6 Work 执行指令、阶段文件要求、工作包恢复说明、上一版 v0.7.5 五份计划留档、原 `UI-DESIGN-SPEC.md` 与 Markdown 编辑器复核材料。
- 对应 GitHub 文档同步提交：`39bf7296e212240acb434277233da254397ab84c`，已通过读取远端目录验证；正式 v3.7 HTML 原型仍保存在 `docs/v075/reference/OPEN-ME-v3.7.html`。
- **未将 ZIP 二进制归档文件或用户实际 Windows 失败截图写进 GitHub**：文档原文已保存于仓库，ZIP 仍为用户本次会话的离线备份；后续如需把二进制归档也上传，须先做隐私检查并使用有二进制上传能力的环境。不可把缺少 ZIP 归档误称为“全部二进制均已上传”。
- 本轮只进行文档同步，不包含正式 UI 改造/测试；P0–P6 状态不变，Windows 截图验收仍 NOT_RUN。

## 工作包 ZIP 归档（2026-10-27 已补充）

- 原型与本版本核心执行文件已从 GitHub 源文件重新打包为 `docs/v076/workpack/GankSoft-v076-v3.7-Source-Workpack.zip`，GitHub Blob SHA `1236f863b1f600d458cc75364ac6e3c3087b7194`，目录元数据大小 `325793` 字节，GitHub 归档提交 `6dd062e7326ace3bf9d940c9c75aedc92d13c16a`。
- ZIP 内含原版 v3.7 HTML、现阶段核心改造方案、设计规范和验收材料；其余逐项文本/上一版归档仍分别存在 `docs/v076/workpack/`，无需依赖聊天附件。ZIP 是由已入库的文本重新生成的源码/工作归档，**不是与本次会话离线 ZIP 字节完全一致的副本**，不含用户桌面截图。既有文档中“二进制 ZIP 未上传”仅是历史中间状态，现已由此记录更新。
- 只读原型、设计文本及 ZIP 入库不表示功能改造或测试已完成；后续 P0–P6 需继续按证据逐阶段提交。

## P0 正式源码检查点（2026-10-27）

P0 IN_PROGRESS：设计token/统一按钮表格/正式主壳/图标导航已实际落地，build及Linux正式主进程三宽结构PASS；Windows视觉NOT_RUN。下一步P1真实首页。PR14已合并，需建立v076新审核入口；不合并或发布。普通git push因当前环境无凭据不可用，使用仓库规定GitHub API原tree/父提交/非强制ref流程保存并独立fetch核验。

## P1 源码检查点

前序远端b529d4b07317302eb3cb5fd2dd4752898ad4ba0f/tree76b68f1ecc761d4c48d6ec35081233e865385336已独立fetch逐树核验。审核入口PR15，Draft。P1实现/8专项/21协议/构建/正式Linux7场景PASS；新增最小只读dashboard，未改Schema606。Linux中文辅助图已永久保存于stages/P1/evidence；Windows和原型截图仍未通过，阶段不DONE。下一步P2正式集概览及列表详情。
