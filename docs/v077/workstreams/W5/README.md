# W5 — 独立 Work 实施入口

> **W5 / P1 — AI 返回 ZIP 安全执行与验收**；状态 NOT_STARTED；模型 GPT-6 / High；依赖 W1–W4 已完成可信验收；关联 #35（执行）、#18（交付）。

**本目录独立于已完成的 B1–B5。** 仅执行 W5 新需求，读取：

- [DESIGN.md](./DESIGN.md)：AI 动作与安全边界
- [IMPLEMENTATION.md](./IMPLEMENTATION.md)：三个检查点
- [TEST-PLAN.md](./TEST-PLAN.md)：动作解析、SQL 安全和集成验收
- [RESULTS.md](./RESULTS.md)：新 W5 的实际证据与恢复记录

## 复制给 W5 Work 的最简指令

继续 GankSoft 的 `feature/v077`，实际以 GitHub 最新 HEAD 为准；本轮只执行 W5，模型 GPT-6 / High；先读 AGENTS、STANDARDS、RECOVERY-NEXT 最新段、本目录 3 份设计/实施/测试文档，及前置 W4 的 RESULTS。只改本批相关生产源码，最多三检查点及四个独立测试 Worker；复用构建、定向验收，保存源码/测试证据并正常推送，独立核验 SHA。完成即结束，不启动任何后续阶段、不等 CI、不强推/合并/发布。

**边界**：W1–W5 是全新的独立 Work 会话与文档分区；正式生产源码按现有模块组织，不增加第二套业务引擎。
