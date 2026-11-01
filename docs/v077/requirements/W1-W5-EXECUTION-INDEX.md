# GankSoft v0.7.7 — 新 W1–W5 设计、实现、测试的唯一执行入口

> 生效日期：2026-11-01。**W1–W5 是独立的新开发阶段，不是 B1–B5 的延续、替代或重新实施。** B1–B5 已于 2026-10-31 完成开发及 Linux 定向验收，其文档独立保留为历史归档；尚未完成的 Windows 实际验收属于交付验证，不是重启 B1–B5 开发。
>
> **状态：W1–W5 是新需求的待执行工作包，五批全部 NOT_STARTED。** 直接使用 `feature/v077` 已有生产源码作为实现基线；目标分支 `develop`、Schema606；每轮以 GitHub 最新 HEAD 为准，不以旧 B 批次完成作为 W1 的执行前置。

## 批次总表：每次只执行一批，最多三个检查点

| 批次 | 唯一设计、实现和测试方案 | 主体 Issue | 模型/思考强度 | 前置 | 当前 |
|---|---|---|---|---|---|
| W1 保存/FSRS/即时同步 | [W1-REVIEW-DATA-SYNC-PLAN.md](./W1-REVIEW-DATA-SYNC-PLAN.md) | #30 #31 | GPT-6 / **High** | 无（新计划起点） | 未开始 |
| W2 暂停、计时、结算和历史 | [W2-REVIEW-QUEUE-HISTORY-PLAN.md](./W2-REVIEW-QUEUE-HISTORY-PLAN.md) | #32 #33 | GPT-6 / **High** | W1 | 未开始 |
| W3 卡片/知识点统计及小范围知识 UI | [W3-ANALYTICS-KNOWLEDGE-UI-PLAN.md](./W3-ANALYTICS-KNOWLEDGE-UI-PLAN.md) | #34 #24补充 | GPT-6 / **Medium** | W1（建议在 W2 后依次执行） | 未开始 |
| W4 AI 按卡分片 ZIP 与 Prompt | [W4-AI-EXPORT-PROMPT-PLAN.md](./W4-AI-EXPORT-PROMPT-PLAN.md) | #35导出 | GPT-6 / **Medium** | W1 W3 | 未开始 |
| W5 AI ZIP 安全解析、应用、撤销与交付 | [W5-AI-APPLY-ACCEPTANCE-PLAN.md](./W5-AI-APPLY-ACCEPTANCE-PLAN.md) | #35执行 #18验收 | GPT-6 / **High** | W1–W4 | 未开始 |

**状态解释**：`NOT_STARTED` = 未开发/未跑新版生产测试；`IN_PROGRESS` = 部分检查点有效；`DONE_LINUX` = Linux/领域定向验收完成但 Windows 未确认；`BLOCKED` = 真实阻断；`DONE` 需有本批约定证据，不靠 Vue 原型或旧测试晋升。分开列 Linux Electron、Windows CI、Windows10 实测、Windows11 实测、125%真实缩放。

## 两个阶段严格分离

- **B1–B5：DONE（历史归档）**。原设计、实施记录及已通过验收原样保留，不重开批次、不更新其 DONE 状态；Windows 未验收项只在新的质量验证记录中列为 NOT_RUN。
- **W1–W5：NOT_STARTED（独立新计划）**。单独任务编号、单独 CASE、单独结果文档与 SHA；只有 W1→W2/W3→W4→W5 的依赖关系，**不存在 W1 依赖 B1–B5 重新执行**。

## 所有 Work 必须采用的唯一架构与测试合同

- [AGENTS.md](../../../AGENTS.md)，[`docs/development/STANDARDS.md`](../../development/STANDARDS.md)，[`RECOVERY-NEXT.md`](../../development/RECOVERY-NEXT.md) 最新首段，[`ARCHITECTURE-GUARDRAILS.md`](./ARCHITECTURE-GUARDRAILS.md)。
- **[DATA-SYNC-CONSISTENCY.md](./DATA-SYNC-CONSISTENCY.md)** 高于单模块旧缓存策略：SQLite 唯一事实源、已有 `dataEpoch/dataRevision`、写入成功通知、受影响页面重读、旧慢查询不覆盖新状态、恢复备份后 epoch 彻底失效。不能靠退出重启显示新分数。
- B1–B5 已完成的代码和证据仅作历史基线，不是本轮需要执行的批次；不重新安装依赖、不重新构建未变化制品、不重跑全量旧 250 条。曾冻结 `235 PASS / 0 FAIL / 3 BLOCKED / 12 NOT_RUN` 是**旧合同历史成绩**，不能等同 W1–W5 PASS。
- 新合同每批在自己的 W*-PLAN 内有明确 CASE ID、UI操作步骤/结果、业务 SQL/FSRS 断言；只运行对应 CASE 与必要跨模块冒烟。最多四个**互不写同一业务源码**的测试 Worker，独立目录和临时 Schema606 数据库，禁止读取用户正式库。
- 每批最多三检查点；每一步保存有效源码+定向测试+不完整项，最后更新 `docs/v077/fixes/Wx-RESULTS.md`（如需）与 `docs/development/RECOVERY-NEXT.md`。提交和正常推送到 `feature/v077`，远端独立校验完整 SHA/tree 与被测生产 SHA。不 force push、不合并、不发 Release、不等待 CI，完成即停。
- 共享热点 `src/unified/UnifiedWorkspace.vue`、`src/review/UnifiedReviewForm.vue`、`src/unified/UnifiedAnalytics.vue` 的生产编辑**串行**；并行只用于隔离测试。不要五个 Work 同时修改单一分支。

## 已有设计资料与仍待归档的原型

| 业务 | 权威设计/记录 | 当前交付边界 |
|---|---|---|
| 复盘保存与同步 | #30 #31 + [REVIEW-EVERY-SUBMISSION-SCHEDULED.md](./REVIEW-EVERY-SUBMISSION-SCHEDULED.md) + [DATA-SYNC-CONSISTENCY.md](./DATA-SYNC-CONSISTENCY.md) | 完整规则已入库 |
| 暂停与结算历史 | #32 #33 + [REVIEW-PAUSE-TIMER.md](./REVIEW-PAUSE-TIMER.md) + `docs/v077/prototypes/review/` | **暂停原型在库；完整结算/历史 Vue v3 原型在上一轮对话文件中，尚未提交 Vue 源文件到仓库** |
| 双维度学习统计 | #34 | **设计和 HTML/Vue 预览此前交付对话文件，源码预览尚未归档 GitHub；本计划收录接口/验收合同** |
| AI 离线调度 | #35 | **设计和 HTML/Vue/API-DESIGN.md 预览此前在对话文件中；正式 Vue 和完整版 API 文件仍未归档 GitHub，本计划收录操作边界和验收条件** |
| 知识 Markdown 局部 UI | #24 补充评论 | 导入 Markdown 属于知识图谱工作区，已确认**两个多余返回按钮都删除**；radio+标题同行，粘贴框自适应 |

**Work 的预览依赖要求**：在动正式 UI 之前，先核实能否读取已交付的原型源；如不可见，优先按该批已在 GitHub 的文本合同实现，明确标记“未核对完整 Vue 原型”，不可假定原型已经在 repo，也不可自己改变用户已否定的页面层级。

## 最省 Token 的 Work 输入模板

> 继续 `Aides8Stack/GankSoft` 的 `feature/v077`。本轮**只执行 W{n}**，模型/推理强度见本页，仅三个检查点；权威入口 `docs/v077/requirements/W{n}-...-PLAN.md`。先读 AGENTS、STANDARDS、RECOVERY 最新首段、该计划、架构规则、同步规则与直接涉及源码/Issue；**不重复全仓历史阅读、安装、构建或旧250测试**。实现后只跑文档列出的 W{n} CASE 和必要最小交界冒烟，四 Worker 可独立并行测试但不可并行生产改码。每检查点保存真实成果，最终正常 push、独立校验 SHA/证据，更新恢复交接，完成即停止，不进入 W{n+1}，不等待 CI、不合并或发布。

## 严格停止条件

1. 任一 P0 事务一致性未通过：保持 `BLOCKED`，不推进依赖批次。
2. 仅 Vue/Chrome 预览 PASS 不可宣称 Electron/SQLite/Windows 功能已实现。
3. Windows 真机/物理剪贴板/中文输入法未测，记录 `NOT_RUN`，不以 GitHub Windows Runner 替代。
4. 发现新需求与旧文本冲突：优先本文件、该 Wx-PLAN 与用户最新确认的 #30–#35；禁止按旧「仅练习」「手动结束队列」「销毁归档」「知识图谱返回所有卡片」重做。
