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

## W7.1 实施审计（2026-11-01）

起点5c047d201f6df95e398a52613b00aa5352629788。TASK继承W6，已按task:init仅初始化一次W7；原五份执行记录逐字节归档到docs/development/history/。AUDIT.md为旧基础设施审计，仅作历史，不作本轮证据。

根因复现：原后端强制practice=false并拒绝practice提交；reservedReviewCards扫描所有未完成会话，open报DUPLICATE_SESSION，queue排除session_reserved；提交还比较当前versionId；next才冻结下一卡，导致队列中未到达卡的版本随编辑变化；publish(resetStudyCycle=true)重开周期并删除旧FSRS。原复现2 FAIL，日志保留。

实现：
- OpenReviewSession新增mode，默认practice。scheduled仅接收deckId，禁止客户端指定卡片；在现有BEGIN IMMEDIATE/协议外层回执事务内先查同deck活动scheduled，已有则返回，否则复用queue的due+relearn（保持既有预算/排序/上限500）并以cardId去重，不包括specialty。空正式队列抛NO_SCHEDULED_CARDS。
- 模式写入原study_sessions.payload；老/缺失mode默认practice，不从practiceMode=false推断。客户端practice字段保留兼容，不参与决定模式。无需新表、索引或Schema升级；完整性检查拒绝导入/恢复产生重复活动正式队列。
- 每卡原子写学习事件和进度；仅scheduled调用原advanceSchedule并同事务写schedule_events/scheduling。原回执、eventId、CAS、学习周期检查保留；practice可在正式复习后提交，不因排期改变被拒绝。
- 移除native全部跨队列占用；606旧session.save也不再按队列签名拒绝新自主队列。gateway中606旧review命令缺少正式来源，强制走原引擎的practice分支；604旧运行时合同保持。
- 新会话创建时冻结全队列entry（event/version/cycle/hash/knowledge），next复用冻结版本；提交绑定旧versionId，schedule log也记录实际旧版本。仅内容版本变化不拒绝提交；真正周期/正式排期冲突仍拒绝并保留草稿。
- publish.ts所有既有卡内容发布保留cycle/FSRS，旧resetStudyCycle输入不再重置并回执false。首次发布仍仅创建初始周期，不创建FSRS。
- 必要额外后端：import-json/import-map重映射全部冻结entry及当前有效CAS哈希；recycle session-scope裁剪被删除卡的冻结entry；unified-integrity核验冻结引用与正式唯一性。否则新增payload字段会破坏现有导入/回收数据一致性。

协议导出实际177方法通过；静态大快照原先已滞后于W5，为避免混入无关导出变化，仅归档4个受影响方法的当前生成契约到evidence/protocol-contracts.json；运行时Zod/领域校验始终权威。

当前可执行自动化按W7新合同调整创建方式和预期，保留事务/回执/备份/媒体/历史保护断言；W1–W6历史验收报告和250条权威账本未修改。UI、W4/W5生产、版本、CI均未修改。W7.2/3仍NOT_STARTED。

### 检查点B：9项继承测试错误修复（用户追加授权）

全量check曾得到745 PASS / 9 FAIL；独立起始基线核对也复现相同9项旧前提失败。用户要求所有错误均修复，因此本轮一并修复测试夹具，不保留失败：
1. v077-e2e-runner：所有250 CASE已经有handler；用仅存在于测试临时目录的未注册依赖夹具，运行字节未改的run/promote CLI，验证NOT_RUN/exit2、拒绝未注册PASS、拒绝API证明，且真实和夹具两份账本均零改写。纯selectCases用合成未注册组验证拒绝分支。
2. M1/M2/M3 handler覆盖：删除错误的“已经验过的CASE必须永远NOT_RUN”前提；改成导入前后整份真实账本逐字节不变，保留每个handler/分支/GUI/证据/高风险断言检查。
3. remaining-plan：207条历史集合、基线SHA、初始NOT_RUN、优先级、模块、批次和环境不变；历史计划状态与当前账本分别校验，不强迫两个不同时点状态一致，额外验证读取不写账本。
4. WIN-09：正向合成夹具补全现有校验器要求的ProductType=1和Win32_OperatingSystem身份来源；补验Server/错误来源/错误系统拒绝，继续拒绝不同ZIP且绝不自动晋升真实Windows PASS。

未修改生产验证器、CI门禁、权威250账本或W1–W6历史验收。9项错误对应23项回归PASS，最终完整check另记RESULTS。

### 内容隔离最终边界修复

补验实际复现3 FAIL：新旧AI提前日期摘要均包含versionId，发布新版本后虽然scheduling/settings字节未变，currentDue却忽略原有效提前日期；此外，自主队列冻结后发生正式调度，再完成自主队列，已有混合历史回收重锚用提交时排期摘要重建entry，与队列创建时冻结entry不同，导致保留页被错误阻断。

schedule.ts的dueOverrideAnchor现仅绑定卡片/卡片集/周期、排期哈希与原到期状态，移除内容版本；对旧摘要仅在同一卡片既存历史版本中验证原哈希，保留周期/排期检查，不写settings、不重置或重放FSRS。新旧摘要在发布、列表和重启后均保持有效日期。该模块属于内容编辑不影响自动调度的直接必要修复，不修改W5 UI或执行服务。

session-scope.ts优先使用保留卡原冻结entry重锚，旧无entries会话才从历史事件重建；保留所有幸存卡的学习事件/调度字节，不放松冻结身份或删除保护。新增真实SQLite回收兼容回归。

### W7.1 最终回执

W7.1 DONE：18要求全部PASS，专项21组PASS，全量757/757、协议21/21、177方法、类型/边界/build及check均PASS。最终源码远端d93d3c5b472cbe8ac3cc743dcf7ee89cd281d71e，完整tree280bb215cb590c4e064d52fbe12eddda3ce29534，与本地实际被测946d0efda3df400bf9362205e024e8d0c48aff88一致。所有发现的错误已修复；最终证据及范围见RESULTS。W7.2/3未开始，保存核验后立即停止。
