# GankSoft v0.7.7 — W1–W6 独立开发区

**这里是 W1–W5 唯一新工作入口。** B1–B5 已经完成开发及 Linux 定向验收，仍保留在旧版 `docs/v077/requirements/IMPLEMENTATION-WORKPLAN.md` 及 `docs/v077/fixes/`；**无需重做，也不再作为新 Work 的任务。**

| 独立目录 | 功能范围 | Issue | 推荐模型 | W 阶段依赖 | 状态 |
|---|---|---|---|---|---|
| [W1](./W1/README.md) | 复盘评分、FSRS、即时同步 | #30、#31 | GPT-6 / High | 无新 W 批次依赖 | DONE_LINUX |
| [W2](./W2/README.md) | 暂停、逐卡计时、结算与历史 | #32、#33 | GPT-6 / High | W1 | DONE_LINUX |
| [W3](./W3/README.md) | 卡片/知识点统计与知识图谱 UI | #34、#24 | GPT-6 / Medium | W1 | DONE_LINUX |
| [W4](./W4/README.md) | AI 分卡 ZIP 导出与 Prompt | #35（导出） | GPT-6 / Medium | W1、W3 | NOT_STARTED |
| [W5](./W5/README.md) | AI 返回 ZIP 安全执行与验收 | #35（执行）、#18 | GPT-6 / High | W1–W4 | NOT_STARTED |
| [W6](./W6/README.md) | 卡片详情紧凑布局与知识点关联管理 | #37 | GPT-6 / Medium | W1、W3、B4 | IN_PROGRESS |

每个工作目录独立拥有：
- `README.md`：本批一次性执行入口和阅读范围
- `DESIGN.md`：需求、协议、数据和交互约束
- `IMPLEMENTATION.md`：仅本批三个实施检查点
- `TEST-PLAN.md`：独立的验收 CASE 和质量门槛
- `RESULTS.md`：**仅在实际执行后**填写的测试证据、源码 SHA 和恢复记录

## 资源与开发边界

- 与已完成 B1–B5 **完全独立**：旧开发结果和历史证据保持不变，不重做、不启动旧 B 工作包。
- 每个 W 单独开一个 ChatGPT Work 会话；生产分支继续使用 `feature/v077`，按当前真实 HEAD 顺序实施；正式源码仍遵循既有组件和模块，不人为添加第二套业务层。
- 每批最多三个检查点，测试最多 4 个独立 Worker，复用依赖和有效构建输出；仅对本批变更作定向测试，不重跑旧250条、不无界等待 CI、不强推、不合并或发布。
- 数据写入与页面刷新必须遵守 [统一同步合同](../requirements/DATA-SYNC-CONSISTENCY.md)；所有 W 新用例与旧 B 验收分账，Win10/11 未实测一律 NOT_RUN。
- 前一个 W 完成后仅读取它的 `RESULTS.md` 和 `RECOVERY-NEXT.md` 的新段落，不重复加载前一批所有源码和测试报告。


## 设计资料与未归档内容

- W1：[#30](https://github.com/Aides8Stack/GankSoft/issues/30)、[#31](https://github.com/Aides8Stack/GankSoft/issues/31) 及统一提交/同步规范。
- W2：[#32](https://github.com/Aides8Stack/GankSoft/issues/32)、[#33](https://github.com/Aides8Stack/GankSoft/issues/33)；暂停原型在 `docs/v077/prototypes/review/`，结算/历史完整 Vue 原型尚未全量归档。
- W3：[#34](https://github.com/Aides8Stack/GankSoft/issues/34)、[#24](https://github.com/Aides8Stack/GankSoft/issues/24)；完整统计 Vue 原型尚未全量归档。
- W4/W5：[#35](https://github.com/Aides8Stack/GankSoft/issues/35)；当前已有 Issue 中的 API/ZIP 合同，但完整 Vue 原型源尚未全量归档，不能视为已入 GitHub。

**执行：每次只新开一个 Work，读取对应 W 目录，不必读取其他四个 W 或整个旧 B 阶段。**

## 2026-11-01 最新阶段状态及 W4/W5 分片合同

- W1–W3 已完成 Linux 定向验收，各8/8 PASS；W3 最终文档 SHA `d4afcb33efc6d2f654d58c16eb45dcaf16ec5476`。Windows/125%DPI/中文字体视觉按各批 RESULTS 保持未验收状态。
- W4/W5 仍是 **NOT_STARTED**，W4 实施以前须遵守本轮修订的 `W4/DESIGN.md` 和 `W4/TEST-PLAN.md`：**不设固定卡片总数上限、同文件多卡、按字节动态分片、外部 AI 数据完整覆盖率明确**。
- W5 设计和测试已取消原500条建议总量上限；真正的解析/执行仍必须等 W5 单独 Work。普通卡片内容包取消500张单独跟踪 [#36](https://github.com/Aides8Stack/GankSoft/issues/36)，不得混入 W4/W5。


## 2026-11-01 W6 新增

- W6：卡片详情紧凑布局、题目/选项与答案/解析分组、统计区合并、详情页内知识点关系查看和显式修改。独立设计/实施/测试/结果见 `W6/`；隔离 Vue 原型 `docs/v077/prototypes/card-detail/W6CardDetailPreview.vue`。Issue [#37](https://github.com/Aides8Stack/GankSoft/issues/37)。当前仅完成设计归档，生产实现和测试尚未执行。
