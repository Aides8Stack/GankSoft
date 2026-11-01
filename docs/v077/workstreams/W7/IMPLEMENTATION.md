# W7 三阶段实施指令

## 阶段与模型
仅分三个阶段、三个 Work，不再拆成五个 Work。

1. **W7.1 后端核心与业务规则 — GPT-6 Extra High**
2. **W7.2 UI 与 AI 数据链 — GPT-6 Extra High**
3. **W7.3 整体验收与交付 — GPT-6 High**

每阶段开始先重新读取 GitHub 实际 HEAD、工作区/分支状态和本目录文档。每阶段完成定向测试、更新 RESULTS、只提交本阶段允许文件、普通 push 并独立核验远端。

## W7.1 后端核心与业务规则（Extra High）

### 先审计
复核调用链、协议、SQLite 表、W1/W2既有实现和测试；复现 DUPLICATE_SESSION、session_reserved、practice 被拒绝、点击启动失败的后端原因。审计结果记录在本阶段报告，不另开阶段。

### 实施
涉及：
- `shared/protocol/unified-review.ts`
- `shared/protocol/review-details.ts`
- `electron/modules/cards-unified/review-session.ts`
- `electron/modules/cards-unified/queue.ts`
- 必要的 gateway/事务/领域模块。

要求：
1. 统一会话模式 `practice | scheduled`，模式在服务端创建时确定，提交时从持久化会话读取。
2. practice 只写 learning_review_events 和会话进度，不写 schedule_events，不调用 advanceSchedule，不修改 scheduling。
3. scheduled 每张卡独立事务写 learning_review_events、schedule_events、scheduling 和会话进度。
4. 每个 deck 最多一个未完成 scheduled 会话；在数据库事务内保证并发创建唯一。已有时返回/恢复同一 sessionId。
5. practice 会话不参与正式队列唯一性检查；同一卡可存在于多个 practice 队列。
6. 移除 reservedReviewCards 对 practice 创建和自动正式队列候选的占用排除；保留同一队列内部 cardId 去重。
7. due + relearn 合并成唯一正式队列并按 cardId 去重；新到期卡片进入下一轮。
8. 一次启动请求具有幂等 requestId；同请求重试返回原 session，不同主动 practice 请求创建新 session。
9. 每卡提交是独立事务；后续卡失败不能回滚前序已提交事件。
10. 内容编辑、发布、媒体、Markdown、答案/解析和知识点关联变化不得修改 FSRS/cycleId/dueAt。活动会话使用冻结内容版本，提交事件关联冻结 versionId；内容版本变化本身不拒绝提交。
11. 来源不可识别的旧未完成会话一律按 practice 兼容，不猜测保留一个 scheduled；保留所有草稿、进度和既有事件，不删除数据。
12. 不新增表、不升级 Schema606、不重写 FSRS。

### W7.1 完成条件
- practice 与 scheduled 的写入路径明确分离。
- 每卡提交立即持久化。
- 正式队列按 deck 唯一。
- 自主队列任意重复卡片可创建。
- 内容编辑前后 FSRS 全字段一致。
- 领域和协议定向测试通过。
完成后更新 RESULTS 并保存远端。

## W7.2 UI 与 AI 数据链（Extra High）

### UI
涉及：
- `src/unified/UnifiedDeckOverview.vue`
- `src/unified/UnifiedWorkspace.vue`
- `src/unified/UnifiedStudyPlanner.vue`
- `src/review/UnifiedReviewForm.vue`
- `src/review/ReviewHistory.vue`
- `electron/modules/workspace-unified/dashboard.ts`
- 对应 shared protocol。

要求：
1. 正式复盘主入口固定在卡片集概览页，只保留一个主要入口。
2. 无活动正式队列时显示“开始正式复盘 · N 张待复盘”；有活动队列时显示“继续正式复盘 · 已完成/总数”；无到期卡时明确显示今日已完成。
3. 概览只显示正式队列状态，不把 practice 队列误显示成正式队列。
4. 手动选择、搜索筛选、随机知识点、专项练习均显式创建 practice。
5. 正式入口已有活动会话时恢复原 sessionId；自主练习新请求始终新建，不自动匹配旧会话。
6. 修复 leave/study/resume 静默 return；所有阻止操作的原因必须有可见提示和下一步。
7. 加载、成功、失败、重试状态明确；双击不重复创建。
8. 队列标题、模式、创建时间、进度清晰，不用第一张卡标题冒充队列名称。

### AI 与统计
涉及：
- `electron/modules/workspace-unified/analysis-summary.ts`
- `electron/modules/workspace-unified/analysis-zip.ts`
- `electron/modules/workspace-unified/adjustment-preview.ts`
- `shared/protocol/ai-analysis.ts`
- W4/W5相关测试。

要求：
1. W4 导出全部已提交 learning_review_events：practice + scheduled + 所有历史周期。
2. practice 没有 schedule_event 时导出 null，不丢弃学习事件。
3. 未提交草稿/未完成队列不作为学习证据。
4. AI 可以使用全部已提交历史分析掌握情况并提出现有白名单调度建议；用户确认前零调度写入。
5. 总学习次数、自主练习次数、正式复习次数、最近学习时间、最近正式复习时间分开统计。
6. practice 不参与 FSRS 调度排序。
7. 用分析数据域指纹替代全局 dataRevision 作为 AI 来源有效性依据。指纹覆盖已提交事件、FSRS、卡片内容、调度策略、知识点关联和影响分析的配置。
8. 创建/恢复/暂停/切换/保存未提交草稿不得使指纹变化；真正学习事件或分析数据变化必须使旧来源失效。
9. 保留 W5 动作白名单、来源校验、预览零写入、原子执行和撤销保护。

### W7.2 完成条件
概览入口、practice入口、统计、W4导出、W5来源校验全部通过定向测试；保存远端。

## W7.3 整体验收与交付（High）

使用隔离临时 Schema606 数据库和正式 Electron。

必须验证：
- 自主练习重复同卡多次，逐卡有记录且 FSRS 完全不变。
- 正式复习逐卡写事件并正确更新 FSRS。
- 每卡提交立即持久化；中途退出/崩溃前已提交卡片不丢。
- 每个 deck 只有一个活动 scheduled 队列；不同 deck 独立。
- 多个 practice 队列可引用相同卡片。
- practice 与 scheduled 可同时存在且互不阻挡。
- 内容所有修改不改变 FSRS。
- 旧会话兼容为 practice，草稿和历史保留。
- 概览正式入口正确创建/恢复唯一正式队列。
- 开始按钮有明确反馈，不再静默无响应。
- 软件关闭重启后队列、事件、统计和 FSRS一致。
- AI 导出包含全部已提交历史，未完成草稿不冒充学习事件。
- 队列生命周期操作不导致 AI 来源误失效；真实分析数据变化使来源失效。

命令先执行 W7 定向用例及受影响 W1/W2/W4/W5交界测试，再执行：
```bash
npm test
npm run check:protocol
npm run build
npm run test:package
```
按当前 AGENTS.md / STANDARDS.md 的 Pipeline v4 规则运行适用门禁。不得重跑无关旧250条人工验收。

Linux Electron必须真实启动并核对SQLite及重启读回。Windows CI、Win10/Win11真机分别记录；未运行标记 NOT_RUN。

全部通过后更新 RESULTS、检查 diff、普通 push、独立核验远端 HEAD/tree/文件。不得强推、合并、发布或修改 package 版本。
