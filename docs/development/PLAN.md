# Pipeline v4.0 实施与验收
分支 infra/pipeline-v4；基线 c8db715d33265bdf8e2edd05f0f14a35b97de8ac；版本0.7.4-rc.1。
P0–P5代码实施及阶段测试DONE，独立提交并远程ref+tree核验。P6本地验收DONE；真实GitHub合并/自动RC/Windows验收BLOCKED（需要用户配置保护并人工合并）。不把代码完成写成上线完成。
产品改动仅版本单一来源（后端去硬编码）；不合入图片PR#2。旧PR#3被v4功能替代但未关闭。禁止自动修改main/develop、合并、公开、Stable。
风险分类对全部非文档保守执行完整双平台质量回归，后续有真实测试映射后再缩小；PR从不制作Windows安装器或便携包。

## G0–G1 Windows 权限审计解阻（2026-10-20）
继续既有 infra/pipeline-v4 任务，不重复初始化。先核实远程 db5a5ea 和 PR #4，复现 LF PASS / CRLF FAIL；仅将 auditWorkflows 改为 yaml 结构化 fail-closed 审计，保留既有测试并追加正反例。复用既有 yaml，不改依赖/业务/工作流。分两次检查点：故障代码和测试；Actions 一次查询确认后必要交接。执行 pipeline、ci:quality、安全与差异检查；不等待 CI、不实施 G2–G7。

## G2 最终安全整改（2026-10-20）
继续既有infra/pipeline-v4。S1/F02：保护默认分支的metadata-only pr-trust状态（外部/Fork拒绝，CI控制文件变更要求所有者针对完整SHA单独review），仅statuses写权限；绝不checkout/执行PR。PR scope用已审计不可变999a184源码，与候选工作树分开；双平台测试只在无Secrets/只读Token的pull_request中执行。S2/F03/F04：旧分支迁移清单（不写其他分支、不关闭#3），发布前逐项验证有效Rules及bypass，保留门禁。S3：安全正反例、完整本地质量、分阶段提交和远程核验，最终一次Actions触发回执后退出。
部署约束：main当前无可信工作流，本轮禁止修改main/develop；pr-trust必须由所有者先批准推广到默认main并设required，然后验证恶意探针。不得声称仅凭本PR修改已消除平台级自改workflow绕过。所有者/具有仓库写权限的账号和App属于信任根，不能让不可信账号拥有同库写Token。当前PR#4的CI控制修改需明确人工审查。

## G2 Windows测试换行修复（2026-10-20）
基线f457cba；继续既有分支任务，不初始化。先读Run39401503994/Job118557286576，四组合LF/CRLF临时源码快照复现两项失败。只修改pr-trust.test.mjs：仅规范CRLF/LF的嵌入脚本精确比较；用YAML结构修改并回读验证写权限/Secrets/PR事件攻击条件，再断言生产审计拒绝。保留全部安全设计/生产文件/测试预期，补内容篡改与无操作变更拒绝。专项和全部pipeline、必要质量/安全检查后提交；保存触发回执立即退出，不等待CI，G2平台验收仍独立BLOCKED。

## RC withdrawal recovery (2026-10-20)
Continue PR #4 at verified 96eaf5e129b24a211689b0740b3b22d5cfd80459; no task reinitialization. A: reproduce strict published() orphan failure; B: protected-main owner-reviewed two-phase withdrawal record and manual execution receipt; C: history classification separate from same-version publishing; D: stateful normal/adversarial recovery tests; E: complete pipeline/quality/security and remote checkpoint, then exit without CI polling.
Authority: .github/release-withdrawals/v<canonical RC>.json read by API from pinned protected main, never candidate checkout or plan input. Owner-approved authorization snapshots verified original release. Manual main withdrawal deletes only that Release ID, never Tag, and produces completion receipt; a separately approved main PR persists it. Queue requires completion plus successful owner main release-control Run. Until receipt is persisted and verified, history remains BLOCKED. This deliberately does not auto-write main.
