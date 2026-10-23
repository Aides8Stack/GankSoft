# v0.7.5 原 Work 指令包的连续执行补充说明（2026-10-23）

**唯一主指令来源**：《GankSoft-v0.7.5-Work-Handoff-v1.0.zip》。这是对**原始 Work-Handoff-v1.0** 执行节奏的增量授权，**不是第二份业务需求、第二套阶段规划或重新设计**。本 ZIP 未完整提交到 GitHub；新 Work 会话需由用户上传原 ZIP（不能假装 GitHub 已含全部参考原型、fixtures 与阶段 prompts）。

## 新 Work 如何使用原包

1. 从用户上传的原始 ZIP 完整读取 `00-START-HERE.md`、`01-design/00-AUTHORITY-AND-DECISIONS.md`、`01-design/01-FUNCTIONAL-SPEC.md`、`04-work-prompts/00-WORK-MAIN-PASTE.md`、`03-plan/01-STAGED-ROADMAP.md`、`05-acceptance/01-TEST-MATRIX.md`、对应 `02-architecture/` 资料；UI 继续用 `08-references/UI/OPEN-ME-v3.7.html` 及 `03-plan/04-UI-REFERENCE-GUIDE.md` 参照，不复制演示 JS。
2. 从真实 GitHub `Aides8Stack/GankSoft` 原分支 `feature/v075-unified-learning-workspace` / Draft PR #13 开始，核实最新 HEAD/CI、源代码/仓库记录；读 `AGENTS.md`、`docs/development/STANDARDS.md`、`TASK.json`、`PLAN.md`、`PROGRESS.md`、`HANDOFF.md`、`TEST_REPORT.md`、`docs/v075/PHASE-GATES.md`。
3. S0、S1 与 S2 的**开发准入**已取得代码及 CI 证据；不重复这些阶段。当前从 **S3.a 未完成的 T09–T12** 开始，完整 S3 要依原包 `04-work-prompts/phases/S3-CARDS-DRAFT-PUBLISH.md` 与 T09–T15。此后依原包 S4–S9 阶段提示实施，不另造路线。
4. 若新会话需要恢复，**使用原包的** `04-work-prompts/91-RECOVER-INTERRUPTED-WORK.md`；当确实需要读取刚结束的 CI 时使用 `04-work-prompts/90-CHECK-CI-AND-CONTINUE.md`，避免重复查旧运行或无关阶段。

## 用户新授权仅覆盖的旧执行规则

原包 `00-WORK-MAIN-PASTE.md` 及 `03-plan/01-STAGED-ROADMAP.md` 中“初次只做 S0”“只允许用户指定的单阶段”“每阶段结束立即退出并等待用户再说继续”等**会话节奏限制已不再适用**。当前用户明确授权：**同一 Work 会话内分阶段设计 → 模块化实现 → 本地专项与必要回归 → 保存检查点 → 自动继续下一个可安全执行的阶段，不逐阶段询问。** 若 Work 额度/时间中断，只需保存 GitHub 检查点，下一 Work 会话依据原包恢复指令接续；不能在后台自动开启新会话。

原包的 **S0–S9 业务范围、模块边界、45 项验收、设计优先级、数据安全、先测后提交、CI 真实性、GitHub 工作流程等全部继续生效**，没有被新授权取消。新授权把“已通过自动化开发准入”与“最终真实 Win10/11 人工验收”分开：后者（尤其真实中文 IME、人工拖拽/系统截图、断网与最终便携 ASAR）仍 `NOT_RUN`，**正式编辑器接入真实用户数据前及最终发布前必须按适用门禁实际完成**。

## 优先级与提交规则

- 事实来源：远端实时源码/测试/CI/PR ＞ ZIP 制作时的历史 HEAD 与旧进度叙述。业务规格：用户已确认最新决定 + 原包 `01-design/` 冻结决策；仅实际存在的后续明确授权覆盖旧的**单阶段等待行为**，不能借此更改卡片映射、字段或数据完整性要求。
- 一阶段内可有多个小提交；在同一 Work 会话尽可能推进多个阶段。必要本地测试失败先修、证据记账，数据/身份/历史安全问题阻断相应危险写入。不能因为等待与后续工作无关的 CI 或 `pr-trust` 而停工；但发现实质性必需 CI 失败应按原包恢复入口定向处理，不能忽略并宣布阶段完整 PASS。
- 全部改动推送**原分支、原 Draft PR #13**，保存远端完整 SHA 与该 SHA 的一次即时 CI 快照。**不等待/轮询 CI，不代替用户审核 `pr-trust`，不自动合并、不发布、不新建分支/PR、不强推或降测试门禁。**
- 如剩余工作尚未执行，应记 `NOT_STARTED` 或 `IN_PROGRESS`，不得把指令/计划记为已实现。`DONE` 必须包含可追溯实现和测试证据。

