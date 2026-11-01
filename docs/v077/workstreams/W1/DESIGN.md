# W1 — 设计与接口合同

> **W1 / P0** — 复盘评分、FSRS、即时同步。状态：NOT_STARTED；模型：GPT-6 / High；W 内依赖：无新 W 批次依赖；Issues #30、#31。

**此处只是待实施的最终需求定义，不代表已进入正式 Electron。** 准确性与刷新遵守 [数据同步合同](../../requirements/DATA-SYNC-CONSISTENCY.md)。

**状态：待实施 / 新合同测试 NOT_RUN。模型 GPT-6 / High；仅此批 Work 可修改以下生产链。**
关联 Issues [#30](https://github.com/Aides8Stack/GankSoft/issues/30)、[#31](https://github.com/Aides8Stack/GankSoft/issues/31)，统一规则 [DATA-SYNC-CONSISTENCY.md](./DATA-SYNC-CONSISTENCY.md)、[REVIEW-EVERY-SUBMISSION-SCHEDULED.md](./REVIEW-EVERY-SUBMISSION-SCHEDULED.md)。前置：**无新 W 批次依赖**，直接基于 `feature/v077` 当前稳定代码实施。历史已完成模块仅作为现有源码，**不是要重做或恢复的开发批次**。

## 设计合同
- **正式提交**必须使学习事件、FSRS 调度事件、最新排期三者同事务一致；旧 practice 记录只读留存，新提交禁止“只练习不调度”。单选题客观答错强制 Again；自评独立记录；同日再次评分同样成为正式事件和合法调度。
- 提交失败/未知回执保留答题与草稿，不能伪称成功；确认后才跳下一卡。请求幂等以原 requestId 核验，防重复插入。
- SQLite 是唯一事实源。复用协议已有 dataEpoch/dataRevision，统一感知写入成功。**旧 `lastLists.rows` 不得覆盖新数据**，只保留列表过滤/排序/选中ID/滚动等交互上下文。已显示页面自动刷新，返回页面检查修订；旧异步响应不能覆盖新版本；刷新失败必须提示保存已成功但显示未更新。
- 统计与调度在恢复备份时按 epoch 重置；无新数据库、状态引擎或独立通知 IPC。避免每次改 Prompt 触发全库刷新。

## 设计边界

- 旧 B1–B5 是已完成的既有软件功能，不需要再开发或重验所有历史用例。
- 本设计只属于 W1，变更权限限于本批直接相关的业务/服务/界面。
