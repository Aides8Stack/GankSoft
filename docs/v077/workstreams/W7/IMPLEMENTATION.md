# W7 实施方案与文件影响

## 实施顺序

### A. 协议与会话模型
涉及：
- `shared/protocol/unified-review.ts`
- `shared/protocol/review-details.ts`
- `electron/modules/cards-unified/review-session.ts`
- `electron/protocol/gateway.ts`

新增/明确会话模式 `practice | scheduled`，并引入可幂等的创建 requestId。旧 `practiceMode` 会话按 practice 兼容。openReviewSession 在事务内检查 scheduled 唯一性；practice 不检查正式队列，不查 reservedReviewCards。正式入口重复调用时恢复唯一活动 scheduled 会话；practice 新请求始终新建。

### B. 自动队列
涉及：
- `electron/modules/cards-unified/queue.ts`
- `electron/modules/cards-unified/review-session.ts`

移除 reservedReviewCards 对队列候选的过滤。due/relearn 在同一正式队列中按 cardId 去重。自动队列不读取未完成 practice 会话作为排除条件。

### C. 逐卡提交
`commitReview` 按会话模式执行。practice只写学习事件与会话结果；scheduled在事务中读取最新 scheduling 并调用既有 FSRS。内容版本变化不影响原冻结版本提交；事件使用会话保存的 versionId/cycleId。cycleId发生变化时安全阻止并保留草稿。每卡提交和会话进度在同一事务内提交，前序卡片事件不受后续失败影响。

### D. 卡片内容修改隔离
审查所有内容保存/发布/关联知识点写入路径，确认不调用 `advanceSchedule`、不更新 scheduling、不重置 cycleId。只修改内容版本及必要索引。补充内容修改前后 FSRS 全字段哈希不变测试。

### E. 概览入口与交互
涉及：
- `src/unified/UnifiedDeckOverview.vue`
- `src/unified/UnifiedWorkspace.vue`
- `src/unified/UnifiedStudyPlanner.vue`
- `electron/modules/workspace-unified/dashboard.ts`
- `shared/protocol/workspace-unified.ts`

概览 dashboard 只返回正式队列摘要。正式入口固定概览页。study mode 显式传入 practice/scheduled，不再把 due/relearn/specialty 混成一个未区分数组。移除 exactCardIds 自动恢复旧会话。静默 return 改为明确状态/错误。

### F. AI导出与来源
涉及：
- `electron/modules/workspace-unified/analysis-summary.ts`
- `electron/modules/workspace-unified/analysis-zip.ts`
- `electron/modules/workspace-unified/adjustment-preview.ts`
- `shared/protocol/ai-analysis.ts`
- W4/W5 相关测试

确保所有已提交学习事件都导出；practice无schedule_event时导出null。未提交草稿不导出为学习记录。分析来源使用数据域指纹，忽略会话生命周期操作，学习数据变化后拒绝旧建议。

## 兼容策略
- Schema606不变，不新增表。
- 旧 practice 历史和旧未完成会话可读。
- 来源不明的旧未完成会话按practice恢复。
- 旧的多个未完成会话全部保留，不删除、不自动合并；若多个旧会话都被错误标为scheduled，按最早创建的会话作为正式队列，其余转practice，写入明确迁移诊断记录，不修改已提交学习事件。
- 不对旧 practice 历史补造调度事件。

## 禁止事项
不新增学习引擎/FSRS实现，不改评分映射，不清理历史，不升级Schema，不把整队列完成作为提交边界，不以UI隐藏代替服务端规则。
