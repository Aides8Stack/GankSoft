# W5 — 设计与接口合同

> **W5 / P1** — AI 返回 ZIP 安全执行与验收。状态：NOT_STARTED；模型：GPT-6 / High；W 内依赖：W1–W4；Issues #35（执行）、#18。

**此处只是待实施的最终需求定义，不代表已进入正式 Electron。** 准确性与刷新遵守 [数据同步合同](../../requirements/DATA-SYNC-CONSISTENCY.md)。

**状态：待实施 / 生产测试 NOT_RUN。模型 GPT-6 / High。依赖 W1–W4。**
关联 [#35](https://github.com/Aides8Stack/GankSoft/issues/35)、[#18](https://github.com/Aides8Stack/GankSoft/issues/18) 和 [DATA-SYNC-CONSISTENCY.md](./DATA-SYNC-CONSISTENCY.md)。

## 设计合同
- 导入 AI 返回 ZIP 只解析白名单版本 `ganksoft.ai-schedule-actions/1` 和 `ai-adjustments.json`；要求来源 `exportId/snapshotId/deckId` 与源数据库匹配，严格限制 ZIP 文件数、展开后尺寸、JSON 深度/字段、总建议数（每批最多 500）、路径穿越/炸弹/重复文件。
- **唯一允许四类动作**：`deck.policy.retention.set` (0.80–0.97)、`card.policy.max_interval.set` (1–3650天)、`knowledge.cards.max_interval.set`（direct/aggregate 展开卡片 ID 去重）、`card.schedule.advance_due`（仅提前尚未到期卡片，绝不延后或把已逾期卡移至未来）。不允许改题目、答案、学习历史、FSRS 内核状态、脚本、SQL 或制定独立学习计划。
- **解析 ≠ 执行**：验证并显示每项「调整前→调整后」、原因/被拒详情；只有用户勾选、确认后，以 snapshot/revision/read token 再次核对并**整批事务原子执行**。重复 requestId 返回原回执，不重复调度；同卡/多批冲突拒绝，不能悄悄部分成功。失效建议须重新解析。
- 执行/撤销后通过 W1 统一 revision 通知刷新列表、概览、双维分析、当前排期、学习队列与 AI 再导出。撤销需保护“应用后又复盘”的更新，不能覆盖后续 FSRS；必要的前后状态由现有调度事件审计持有。
- 「解析记录」**只保存实际已执行或已撤销的变化摘要**（时间、动作类别、受影响卡片数、结果状态）。仅解析/被拒建议不应生成「已修改」日志；不保存原始学习数据、Prompt、AI 返回全文。

## 设计边界

- 旧 B1–B5 是已完成的既有软件功能，不需要再开发或重验所有历史用例。
- 本设计只属于 W5，变更权限限于本批直接相关的业务/服务/界面。
