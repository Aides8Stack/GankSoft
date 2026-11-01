# W2 — 独立 Work 实施入口

> **W2 / P1** — 暂停、逐卡计时、结算与历史。状态：NOT_STARTED；模型：GPT-6 / High；W 内依赖：W1；Issues #32、#33。

**本目录独立于 B1–B5**。只执行 W2 的新需求和对应测试，不回头执行历史 B 批次。

- [需求与 API 设计](./DESIGN.md)
- [三个开发检查点](./IMPLEMENTATION.md)
- [独立测试方案与案例](./TEST-PLAN.md)
- [执行结果与交接](./RESULTS.md)

## 复制给当前 Work 的最简执行指令

继续 GankSoft 仓库 `Aides8Stack/GankSoft`，唯一生产分支 `feature/v077`，Schema606，实际以 GitHub 最新 HEAD 为准。**本轮只执行 W2，模型 GPT-6 / High**。读取 AGENTS、STANDARDS、RECOVERY-NEXT 最新首段、本目录 DESIGN/IMPLEMENTATION/TEST-PLAN、直接受影响源码及统一同步合同。最多三个检查点、最多四个独立测试 Worker；不重装依赖、不重新执行已完成 B1–B5 或旧250全量测试。完成后只填本目录 RESULTS 并保存 GitHub，独立核验完整 SHA；立即结束，不进入 W3、不等 CI、不强推/合并/发布。

**说明**：交付的生产源码仍放在现有业务模块，`workstreams/W2/` 只保存设计/执行/测试/证据导航，不创建同名的第二套业务实现。
