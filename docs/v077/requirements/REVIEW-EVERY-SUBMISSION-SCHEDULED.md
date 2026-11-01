# GankSoft v0.7.7 — 所有正式学习必须记录历史并推进 FSRS

> **最高优先级新产品规则 · 2026-10-31 · Issue [#31](https://github.com/Aides8Stack/GankSoft/issues/31)**；与 [#30 复盘保存后记录/状态不更新 P0 缺陷](https://github.com/Aides8Stack/GankSoft/issues/30) **必须同一 Work 修复与联测**。
>
> 用户原话：**「取消/隐藏这种个只练习API，只要学习都要进入调度与记录。」**
>
> 此规则覆盖旧代码和 B1–B5 测试中的「仅练习、不更新排期」及「同日巩固不进入 FSRS」合同。**本轮只归档已明确的需求和实施范围，尚未修改正式生产代码。**

## 1. 唯一学习提交语义

用户打开/浏览/揭示答案/修改草稿，只代表**学习进行中**，不代表已有完成的评分记录。**一旦用户明确提交本张自评分并完成保存**，必须以**同一事务**做到：

1. `learning_review_events`：每次实际有效提交**恰好一条**不可变学习事件，保留评分、独立作答/客观正误、用时、学习版本及知识点快照；
2. `schedule_events`：同一事件 `eventId` 对应**恰好一条**调度推进历史；
3. `scheduling`：原卡当前 FSRS 状态与调度修订递增，按评分产生新 `dueAt`（不要求每次都晚于当前时刻）；
4. 已核验回执后刷新卡片列表、详情、分析和卡片集概览，复盘次数、最近自评、最近学习时间及排期均能读回。

上述写入**原子成功或原子失败**。成功不得只记录事件却不更新 FSRS；失败不得写入不完整的事件/排期。保持 `eventId` 和 `requestId` 既有幂等机制，重复点击、未知回执、重试不得重复写事件或推进 FSRS。

**范围：** 单选错题、问答记忆、直接记忆；卡片集复盘、指定卡片复盘、所有卡片勾选后学习、筛选学习、随机知识点、专项队列、同一日重复复盘；统一视作正式学习。可保留专项**选题入口**，但不再有不计入调度的特殊评分模式。

## 2. 评分和状态

- 主观自评 `0.0–10.0`，步长 `0.1`；客观正误单独存。
- `0–5.9 = Again`、`6–7.4 = Hard`、`7.5–8.9 = Good`、`9–10 = Easy`；单选错题的**客观答错强制 Again**，无论主观分数。
- 同一日重复正式复盘也要**记录新事件并更新 FSRS**。FSRS 可能在低分、重学情形安排立即或近期再复盘，卡片**依旧显示「待复盘」可以是合理结果**，但其复盘次数、最近得分、调度事件/修订和实际最近复盘时间应变化；界面不能以“状态文字是否变化”判断提交成功。
- 不可因为同日、提前复习、错题答错、非今日到期或「专项队列」就跳过调度。是否到期只影响**自动队列挑选**，不能阻断用户明确主动学习及其正式提交（如已暂停、并发冲突等另依业务安全校验）。

## 3. 移除「仅练习」必须贯穿 API 而非只隐藏 UI

静态核对源码基线 `9444f7c49cc958a0593ab8695faad225e09b9c57`（改代码时始终以最新 HEAD 为准）：

| 文件/层 | 现状 | 必须变化 |
| --- | --- | --- |
| `src/review/UnifiedReviewForm.vue` | `draft.practice` 复选框可把本次提交变成「仅练习，不更新排期」 | **删除该可选开关、条件文案和提交绕过**；可显示只读说明「保存后自动记录并更新排期」；不要引入另一套复盘表单 |
| `src/unified/UnifiedWorkspace.vue` | `study(ids?,practice=false)` 及会话按 `practiceMode` 匹配；返回列表可恢复旧 `lastLists` | 新启动的任何学习都使用正式会话；移除按练习模式分流；提交成功使对应读缓存失效并按需刷新 |
| `src/unified/UnifiedStudyPlanner.vue` | 专项按钮调用 `emit('study',specialtyIds,true)` | 保留「开始专项」**队列选择**，但不再传「仅练习」标记；专项也必须正常写事件/推进 FSRS |
| `shared/protocol/unified-review.ts` | `OpenReviewSession.practice`、`CommitReview.practice`、`ReviewSessionView.practiceMode` | 新请求不再以 practice 控制跳过排期；新 `practice:true` 请求应明确拒绝而非无声接受；新会话一律正式 |
| `shared/protocol/review-details.ts` | `ReviewAnswerDraft.practice`、`StoredReviewSession.practiceMode`、`ScheduleOutcome.practice` | 区分**旧记录读兼容**和**新提交写合同**；不能删除旧字段后导致历史事件或老会话读回失败；禁止新写入 practice outcome |
| `electron/modules/cards-unified/review-session.ts` | `p.practice?'practice':... ` 并允许事件写入但调度不推进 | 移除非排期成功分支；确保每次成功 `commitReview` 都调用 `advanceSchedule`，`learning_review_events`+`schedule_events`+`scheduling` 同事务 |
| `electron/modules/cards-unified/queue.ts` / 预算 / 分析 | `practiceUsed` 与排除 `practice` 学习的历史统计；特殊队列对 practice 有配置 | 新学习不再计为「仅练习」，按当前正式事件计入预算/学习分析；**保留历史 practice 事件原义，不追溯补造 FSRS**，必要时只读展示「历史练习」 |
| 旧 UI 可达路线（`App.vue`、`StudyWorkspace`、`ReviewWorkspace`、`MemoryWorkspace`） | 有「同日巩固不更新排期」等遗留合同 | **先核实生产是否可达**；对可达的正式保存入口适配统一合同。不要无故重新启用已退役的 legacy 功能 |

**API 最小修改原则：** 继续使用现有 `learning.session.open/change/get`、`learning.review.submit` 和 `advanceSchedule`、现有 SQLite Schema606/复盘事件表。可以删除新请求的 practice 参数并用版本化协议做读兼容；但**不能仅把 UI 复选框隐藏、服务端还接受 `practice:true` 并悄悄不调度**。无需新增学习引擎、数据库表、全局 Store 或 IPC 方法。

## 4. 无法安全调度时必须怎样处理

- **卡片内容版本、学习周期、调度修订已变化：** 不得返回「保存成功但未更新调度」。应视为**本次正式提交尚未完成**，给出清晰冲突说明并保留当时填写的评分/思路与作答。可通过用户明确动作恢复/重建当前正式卡片学习会话；禁止将旧版答案强行用于新版内容调度，禁止强行覆盖新排期。
- **写入失败/未知回执：** 用原事件 ID 和幂等机制先核对是否真实提交；不能直接生成第二条事件。未确认成功时保留当前输入，不能宣称完成。
- **历史仅练习事件：** 一律保留真实历史属性，不得回溯重新计算或凭空补写 `schedule_events`；本规则仅对**启用后的新正式提交**生效。
- **历史未完成的 practiceMode 会话：** 不允许静默以「仅练习」完成。用现有会话修订机制安全迁移或明确阻止旧会话提交、提供重新开始正式学习的路径。必须保留原来作答，不擅自删除数据；详细操作以实际生产验证为准。
- **暂停、重试、未完成：** 暂停/退出/草稿缓存本身不记录为完成学习，不触发 FSRS；只在有效评分提交后原子写入。

## 5. 结合 Issue #30 同时修复可见性和静默丢提交

- `UnifiedReviewForm.vue` 现有 `submit()` 若碰到 `busy`、500ms 自动保存草稿或 `pending.change`，可能**静默返回**。用户明确点击提交后必须有可见的**排队中/提交中/已核验成功/失败或待核对**状态；没有成功回执不得显示「复盘已保存」。保持 requestId/eventId 单次提交。
- `UnifiedWorkspace.vue` 的 `lastLists` 可能在复盘后保留提交前的缓存：提交成功应使对应卡片列表缓存失效；按需重新调用 `card.listSummary`，并让详情/分析/概览重新读取。
- 对低分 Again，可能依然展示「待复盘」，但必须能看到复盘次数+1、最近得分、最近复盘时间和下一次到期。
- 最终以**真实数据库/协议回执/重新打开软件**为验收依据，不能仅按 UI 标签或提示文本断言 PASS。

## 6. 定向验收用例（全部待执行，不继承旧 PASS）

| Case | 验收要求 |
| --- | --- |
| REVIEW-ALWAYS-01 | 三种卡片正常自评提交各产生1条学习事件、1条 schedule_event 和新调度状态 |
| REVIEW-ALWAYS-02 | 单选题客观答错且自评分很高，仍强制 Again 并记录与调度 |
| REVIEW-ALWAYS-03 | 当天同一卡片再次主动复习，历史记录再+1、调度修订再+1，不能合并成「只练习」 |
| REVIEW-ALWAYS-04 | 专项队列启动/筛选/随机学习均无 `practice:true` 绕过调度 |
| REVIEW-ALWAYS-05 | 主动调用旧 `practice:true` 新提交被明确拒绝，无事件/调度不一致 |
| REVIEW-ALWAYS-06 | 既有历史 practice 事件完整读回且不被伪造为新的正式事件 |
| REVIEW-ALWAYS-07 | 旧 practiceMode 未完成会话安全迁移或带说明阻止提交，不丢原作答 |
| REVIEW-ALWAYS-08 | 版本/周期/排期冲突不得部分成功，不可将旧内容强行用于新调度 |
| REVIEW-ALWAYS-09 | 输入评分后立刻点击保存、双击、自动草稿保存并发、失焦、未知回执都无静默丢提交/重复调度 |
| REVIEW-ALWAYS-10 | 保存成功后卡片列表、详情、学习分析、概览读取均一致，且独立进程重启仍一致 |
| REVIEW-ALWAYS-11 | 低分 Again 允许仍是「待复盘」，但复盘次数/自评/排期修订真实变化 |
| REVIEW-ALWAYS-12 | SQL事务注入失败时学习事件、schedule_event、scheduling 全部回滚；重试只写一次 |

**测试矩阵须包含新用户/已有已发布卡、3模式、真实 GUI 点击、IPC 回执、SQLite 检查与重启读回。** 不重跑无关250条历史测试；旧测试中明确允许 practice 不排期的断言应**改为新合同用例并保存旧证据**，不能硬改旧 PASS 统计。Linux Electron、GitHub hosted Windows 与 Windows10/11 实机结果单列；没有真实结果仍写 NOT_RUN。

## 7. 执行边界

- 建议执行模型 GPT-6 / High；**本变更与 #30 作为一次 P0 修复 Work**，最多三个检查点：①真实 GUI 与事件流根因 ②统一提交/调度合同与 UI/协议最小改动 ③定向测试和证据保存。
- 只涉及对应复盘/调度/队列/统计与受影响测试；保留 B1–B5 的已通过功能；沿用 Schema606、现有 RPC/FSRS 模块，不扩增第二套系统。
- 保存到 `feature/v077` 并独立核验完整 SHA，更新 `docs/development/RECOVERY-NEXT.md`、Issues #30/#31、最新测试与后续 Windows 实测状态。
- 不强推、不合并、不触发正式发布、不等待 CI；完成后立即结束 Work，后续才重新编译 Windows 测试 ZIP。

**当前状态：仅记录了新决定和待执行验收合同，生产代码尚未实施。**
