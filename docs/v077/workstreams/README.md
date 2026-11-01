# GankSoft v0.7.7 — W1–W6 独立开发区

**这里是 W1–W6 独立工作入口。** B1–B5 和 W1–W4 的已完成成果与历史证据保持不变，不重做。

| 独立目录 | 功能范围 | Issue | 推荐模型 | W 阶段依赖 | 状态 |
|---|---|---|---|---|---|
| [W1](./W1/README.md) | 复盘评分、FSRS、即时同步 | #30、#31 | GPT-6 / High | 无新 W 批次依赖 | DONE_LINUX |
| [W2](./W2/README.md) | 暂停、逐卡计时、结算与历史 | #32、#33 | GPT-6 / High | W1 | DONE_LINUX |
| [W3](./W3/README.md) | 卡片/知识点统计与知识图谱 UI | #34、#24 | GPT-6 / Medium | W1 | DONE_LINUX |
| [W4](./W4/README.md) | AI 分卡 ZIP 导出与 Prompt | #35（导出） | GPT-6 / Medium | W1、W3 | NOT_STARTED |
| [W5](./W5/README.md) | AI 返回 ZIP 安全执行与验收 | #35（执行）、#18 | GPT-6 / High | W1–W4 | NOT_STARTED |
| [W6](./W6/README.md) | 卡片详情紧凑布局与知识点关联管理（方案已完成，未实施） | #37 | GPT-6 / Medium | W1、W3、B4 | PLAN_ONLY |

## 每个 W 工作目录

- README.md：独立工作入口和授权范围。
- DESIGN.md：需求、协议、数据和交互约束。
- IMPLEMENTATION.md：实施步骤和文件清单。
- TEST-PLAN.md：独立验收 CASE 和质量门槛。
- RESULTS.md：只记录实际执行的测试证据、源码 SHA 和恢复记录。

## 资源与开发边界

- 与已完成 B1–B5/W1–W4 成果独立；不得重做或覆盖历史证据。
- 每个 W 单独开工作会话，从 GitHub 实际最新 HEAD 开始。
- 每批最多三个检查点；仅对本批变更作定向测试，不重跑旧 250 条全量。
- 数据写入与页面刷新遵守统一同步合同；Win10/11 未实测一律 NOT_RUN。
- 不强推，不绕过审批，不自动合并或发布。

## W6 授权边界（2026-11-01）

W6 当前仅交付需求、设计、Vue 视觉原型、实施计划和测试计划。正式生产代码未获本轮授权，不执行实现、测试、构建、合并或发布。PR #38 保持 Draft。
