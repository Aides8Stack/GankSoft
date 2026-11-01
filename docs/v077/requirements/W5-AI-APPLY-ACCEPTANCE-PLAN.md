# W5 — AI 返回解析、可控调度执行/撤销与集成交付（P1/质量）

**状态：待实施 / 生产测试 NOT_RUN。模型 GPT-6 / High。依赖 W1–W4。**
关联 [#35](https://github.com/Aides8Stack/GankSoft/issues/35)、[#18](https://github.com/Aides8Stack/GankSoft/issues/18) 和 [DATA-SYNC-CONSISTENCY.md](./DATA-SYNC-CONSISTENCY.md)。

## 设计合同
- 导入 AI 返回 ZIP 只解析白名单版本 `ganksoft.ai-schedule-actions/1` 和 `ai-adjustments.json`；要求来源 `exportId/snapshotId/deckId` 与源数据库匹配，严格限制 ZIP 文件数、展开后尺寸、JSON 深度/字段、总建议数（每批最多 500）、路径穿越/炸弹/重复文件。
- **唯一允许四类动作**：`deck.policy.retention.set` (0.80–0.97)、`card.policy.max_interval.set` (1–3650天)、`knowledge.cards.max_interval.set`（direct/aggregate 展开卡片 ID 去重）、`card.schedule.advance_due`（仅提前尚未到期卡片，绝不延后或把已逾期卡移至未来）。不允许改题目、答案、学习历史、FSRS 内核状态、脚本、SQL 或制定独立学习计划。
- **解析 ≠ 执行**：验证并显示每项「调整前→调整后」、原因/被拒详情；只有用户勾选、确认后，以 snapshot/revision/read token 再次核对并**整批事务原子执行**。重复 requestId 返回原回执，不重复调度；同卡/多批冲突拒绝，不能悄悄部分成功。失效建议须重新解析。
- 执行/撤销后通过 W1 统一 revision 通知刷新列表、概览、双维分析、当前排期、学习队列与 AI 再导出。撤销需保护“应用后又复盘”的更新，不能覆盖后续 FSRS；必要的前后状态由现有调度事件审计持有。
- 「解析记录」**只保存实际已执行或已撤销的变化摘要**（时间、动作类别、受影响卡片数、结果状态）。仅解析/被拒建议不应生成「已修改」日志；不保存原始学习数据、Prompt、AI 返回全文。

## 最多三个检查点
1. **W5.1 导入安全与只读预览**：严格校验 ZIP、schema、修订、动作白名单和相互冲突，出具逐项 preview token；解析不更改生产数据。
2. **W5.2 安全执行/撤销与变更日志**：延用现有 FSRS/调度覆盖、SQLite 事务/CAS/幂等及业务事件机制；双向回滚须确认无后续更新；用 W1 数据失效刷新，零第二套调度引擎。
3. **W5.3 定向跨模块验收、Windows 便携测试包**：一次必要集成，基于经核验的最新源码触发可复用手动 GitHub Windows portable 测试工作流，**不等待 CI**；只报告真实结果，不合并、发布或强推。

## 新增测试矩阵
| CASE | 强制断言 |
|---|---|
| W5-01 | 合法 1/500建议及无效 schema、错误 deck/snapshot、恶意 ZIP、路径穿越、超限全部正确拒绝 |
| W5-02 | 四类白名单动作合理生效；非白名单/越界/逾期延后、客观数据修改被拒 |
| W5-03 | ZIP 解析→预览而未点击执行，数据库/日志/FSRS **零写入** |
| W5-04 | 预览后用户又复盘、修改知识树/调度：执行前再校验并拒绝过期操作 |
| W5-05 | 相同卡片重复建议、跨批冲突、中途 SQL 失败：整批零部分写入、真实回执 |
| W5-06 | 幂等 requestId 重试、未知回执核对，只能生成一次合法应用和一条变更摘要 |
| W5-07 | 允许撤销成功且恢复精确合法排期；应用后又有正式复盘则保护后续调度并拒绝破坏性撤销 |
| W5-08 | 应用/撤销后无需重启，概览、列表、分析双维、知识点、下次复习立即一致 |
| W5-09 | 跨 W1–W4 最小 Electron UI→IPC→SQLite→新 PID 读回，问题 #16/#17/#21 的 Win10/11 真实用户链独立标记 |
| W5-10 | Windows 便携构建源 SHA/制品哈希/工作流 ID 可追踪；CI 未完成不声称 PASS、真实 Win10/11 未测 NOT_RUN |

**历史测试隔离**：旧 250 条冻结账本 `235 PASS / 0 FAIL / 3 BLOCKED / 12 NOT_RUN` 不自动晋升新合同；老 Windows `WIN-01～09、BACK-14` 与 `NEW-13、CLIP-03、CLIP-09` 仍须原证据链。专项优先用四 Worker 隔离并行；两个非 Windows 设施遗留 `EDITOR-12/SET-08` 保持原始 NOT_RUN，不无界重试。

**验收门槛**：真实业务事务安全；用户明确确认才执行；AI 不覆盖更新后的排期；Windows 交付制品可溯源。Windows 真机无证据不能宣称最终已验收。