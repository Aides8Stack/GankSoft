# W1 — 复盘保存、强制调度与即时数据同步（P0）

**状态：待实施 / 新合同测试 NOT_RUN。模型 GPT-6 / High；仅此批 Work 可修改以下生产链。**
关联 Issues [#30](https://github.com/Aides8Stack/GankSoft/issues/30)、[#31](https://github.com/Aides8Stack/GankSoft/issues/31)，统一规则 [DATA-SYNC-CONSISTENCY.md](./DATA-SYNC-CONSISTENCY.md)、[REVIEW-EVERY-SUBMISSION-SCHEDULED.md](./REVIEW-EVERY-SUBMISSION-SCHEDULED.md)。前置：B1–B5 已有代码，不重新初始化或重跑其旧测试。

## 设计合同
- **正式提交**必须使学习事件、FSRS 调度事件、最新排期三者同事务一致；旧 practice 记录只读留存，新提交禁止“只练习不调度”。单选题客观答错强制 Again；自评独立记录；同日再次评分同样成为正式事件和合法调度。
- 提交失败/未知回执保留答题与草稿，不能伪称成功；确认后才跳下一卡。请求幂等以原 requestId 核验，防重复插入。
- SQLite 是唯一事实源。复用协议已有 dataEpoch/dataRevision，统一感知写入成功。**旧 `lastLists.rows` 不得覆盖新数据**，只保留列表过滤/排序/选中ID/滚动等交互上下文。已显示页面自动刷新，返回页面检查修订；旧异步响应不能覆盖新版本；刷新失败必须提示保存已成功但显示未更新。
- 统计与调度在恢复备份时按 epoch 重置；无新数据库、状态引擎或独立通知 IPC。避免每次改 Prompt 触发全库刷新。

## 最多三个检查点
1. **W1.1 核验当前真实失败链**：从 `src/review/UnifiedReviewForm.vue`、`src/unified/UnifiedWorkspace.vue`、`src/services.ts`、`shared/protocol/client.ts`、`electron/modules/cards-unified` 复现“立即保存/自动保存竞争/退出回列表旧快照”，用同一隔离数据库核验三个真实表及可信回执。区别“未提交”与“已提交但 UI 陈旧”。
2. **W1.2 实现单一提交与同步合同**：消除正式页面/后端的 practice 绕过；修复提交锁与排队自动保存；维持单事务及原 requestId 幂等；借现有网关回执扩展元信息透传，轻量失效通知和列表 context-only 恢复。只动确实受影响的读页面。
3. **W1.3 定向回归/保存**：运行下面测试矩阵，记录 GUI→IPC→SQLite→返回列表/分析→新进程重启完整证据，提交源码+结果+RECOVERY 并核验远端 SHA；完成立即停止。

## 必须执行的测试（新增 ID，不能算入旧250条）
| CASE | 场景与强制断言 |
|---|---|
| W1-01 | 单卡普通提交：learning_review_events + schedule_events + scheduling 原子对应，卡片次数/得分/到期立刻变化 |
| W1-02 | 单选错答强制 Again、问答、直接记忆，各自评分和排期一致 |
| W1-03 | 同日再复盘、专项单卡、之前 practice UI 入口：每个新正式提交均入历史与调度 |
| W1-04 | 500ms 自动保存与立即点击评分提交竞态；连续点击、不重复学习事件 |
| W1-05 | 返回所有卡片的搜索/筛选/滚动保留；旧 rows/慢请求不得覆盖更新后卡片及概览/分析 |
| W1-06 | SQLite失败、版本冲突、网络/IPC未知回执、幂等重试：保留回答，不假成功；读回与重启一致 |
| W1-07 | 两个快速写入后第一轮旧查询延迟回包；分页游标、分析图表、知识掌握不会混版本 |
| W1-08 | 备份恢复 epoch 变化、重新获得窗口焦点和跨学习日：不复用旧业务读缓存 |

**验收门槛**：无重启立即看到最新卡片得分、次数、调度与学习分析；多表与 GUI 读回一致；W1-01～W1-07 至少在实际 Linux Electron 定向验收，W1-08 依现有平台能力定向验证；Windows 10/11 的专用场景未测时标记 NOT_RUN。不得以旧 235 PASS 冒充新合同。失败则保存可信 WIP，不自动启动 W2。