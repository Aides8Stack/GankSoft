# W5 — 设计与接口合同

> **W5 / P1** — AI 返回 ZIP 安全执行与验收。状态：NOT_STARTED；模型：GPT-6 / High；W 内依赖：W1–W4；Issues #35（执行）、#18。

**此处只是待实施的最终需求定义，不代表已进入正式 Electron。** 准确性与刷新遵守 [数据同步合同](../../requirements/DATA-SYNC-CONSISTENCY.md)。

**状态：待实施 / 生产测试 NOT_RUN。模型 GPT-6 / High。依赖 W1–W4。**
关联 [#35](https://github.com/Aides8Stack/GankSoft/issues/35)、[#18](https://github.com/Aides8Stack/GankSoft/issues/18) 和 [DATA-SYNC-CONSISTENCY.md](../../requirements/DATA-SYNC-CONSISTENCY.md)。

## 2026-11-01 最新设计修订：允许全量建议，不再限制500条

- **AI 可分析 W4 导出的全部卡片，W5 用户可一次导入/预览/选择任意数量的合法调度建议**；取消原 `max(500)` 建议总量上限，也不换成 5000、10000 等其它固定数字。W5 只控制资源安全与单次事务的可实现性。
- 小包继续兼容单个 `ai-adjustments.json` 和已有 `ganksoft.ai-schedule-actions/1` 协议；大包采用 `manifest.json` + `adjustments/part-0001.json` 等**每片含多条建议**的分组 ZIP。逐片检查 SHA256/字节数、总建议数、重复 actionId/目标冲突、source exportId/snapshotId/deckId、路径穿越/重复条目/压缩炸弹、版本和白名单。不能读取前500条后无声丢弃其余建议。
- UI 可分页预览**完整**建议集，说明来源、动作、原因与 before→after；未点击明确确认之前不产生学习记录、策略修改或「已执行」日志。正式执行前复核 W1 数据 revision/epoch 与已变更卡片周期和排期；**所确认的一组建议必须全有或全无**。可批量执行内部SQL，但不得分批提交后产生部分成功；资源无法安全执行须在确认提交前拒绝。
- 执行/撤销后调用 W1 数据即时同步，保证 W3 卡片/知识双维统计与最新 SQLite 一致；后续复盘的 FSRS 更新不能被旧撤销覆盖。沿用既有四类调度调整白名单，其余数据严禁修改。
- 普通卡片内容 ZIP 500张限制另见 [Issue #36](https://github.com/Aides8Stack/GankSoft/issues/36)，**W5 不得擅自重写该功能**。此处仍仅未来设计，W5 NOT_STARTED。

## 设计合同
- 导入 AI 返回 ZIP 只解析白名单版本 `ganksoft.ai-schedule-actions/1`；兼容小包 `ai-adjustments.json`，大包多建议分片 + manifest；来源 `exportId/snapshotId/deckId` 与数据库匹配，限制 ZIP 文件数、展开字节、JSON 深度/字段与危险路径，但**不限制建议总条数为500**。
- **唯一允许四类动作**：`deck.policy.retention.set` (0.80–0.97)、`card.policy.max_interval.set` (1–3650天)、`knowledge.cards.max_interval.set`（direct/aggregate 展开卡片 ID 去重）、`card.schedule.advance_due`（仅提前尚未到期卡片，绝不延后或把已逾期卡移至未来）。不允许改题目、答案、学习历史、FSRS 内核状态、脚本、SQL 或制定独立学习计划。
- **解析 ≠ 执行**：验证并显示每项「调整前→调整后」、原因/被拒详情；只有用户勾选、确认后，以 snapshot/revision/read token 再次核对并**整批事务原子执行**。重复 requestId 返回原回执，不重复调度；同卡/多批冲突拒绝，不能悄悄部分成功。失效建议须重新解析。
- 执行/撤销后通过 W1 统一 revision 通知刷新列表、概览、双维分析、当前排期、学习队列与 AI 再导出。撤销需保护“应用后又复盘”的更新，不能覆盖后续 FSRS；必要的前后状态由现有调度事件审计持有。
- 「解析记录」**只保存实际已执行或已撤销的变化摘要**（时间、动作类别、受影响卡片数、结果状态）。仅解析/被拒建议不应生成「已修改」日志；不保存原始学习数据、Prompt、AI 返回全文。

## 设计边界

- 旧 B1–B5 是已完成的既有软件功能，不需要再开发或重验所有历史用例。
- 本设计只属于 W5，变更权限限于本批直接相关的业务/服务/界面。

## W5.1 实际只读导入合同（2026-11-01）

不新增已导出来源表。用户先选择原始 W4 分析 ZIP，再选择 AI 返回 ZIP。原包由 W4 流式完整性校验器校验，manifest 的 exportId/snapshotId/deckId/epoch/revision 必须与返回 source 完全相同；snapshotId 按 W4 原算法复算，来源必须仍匹配当前数据库。原包是用户选择的来源基准，不宣称具备 W4 尚未提供的数字签名认证。

小包：`{"format":"ganksoft.ai-schedule-actions/1","source":{"exportId":"UUID","snapshotId":"原值","deckId":"原值","dataEpoch":"原值","dataRevision":0},"actions":[...]}`。
大包 manifest：相同 format/source，另有 `actionCount` 和 `files:[{path,sha256,bytes,count}]`；片路径为 `adjustments/part-0001.json` 等，内容为 `{"actions":[...]}`。manifest 不列自身。小包与大包不能混用，分片必须完整精确覆盖，任何重复 actionId 整包拒绝；同目标字段冲突将涉及项全部标为 conflict，仍只读展示。

动作公共字段为 actionId/type/reason。留存率动作使用 deckId/value；单卡最大间隔使用 cardId/value；知识点最大间隔使用 knowledgeId/scope/value；提前动作使用 cardId/dueAt。所有对象严格校验，未知字段拒绝；非法动作逐项显示 rejected，不转为可执行。知识点按 direct/aggregate 展开已发布卡片并去重，与重叠知识点/单卡同字段建议双向标记冲突；before 按真实最大间隔分组计数。提前仅接受当前未到期、未暂停、有实际排期且新到期早于旧到期的卡片。

新增统一网关 query：`learning.aiAdjustment.preview.open/page/close`。页条数只控制单次传输（默认50，最多100），还按字符/字节估算缩页；客户端必须以实际返回 rows.length 前移，绝不作为总建议数限制。token 用流式 SHA256、随机 nonce 及全部行/来源生成，绑定内存 owner、epoch/revision、十分钟有效期与最早旧到期时间。分页/激活/数据失效通知再次核对，过期明确标记。token 不是执行授权；执行/撤销方法没有注册，按钮 disabled。

资源预算：返回 ZIP 压缩32MiB、实际展开64MiB、单文件8MiB、4096条目录项、目录2MiB、压缩比200、JSON深度24；每次ZIP解析/预览计算15秒，目标展开与预览估算64MiB。限制的是文件/字节/时间，**没有固定建议总数上限**。超限整包拒绝，无静默部分接受。原始 W4 包沿用其2GiB/10万条目预算，manifest另限8MiB，并有来源校验时间预算。只流式读取，不解压到文件系统。

W5.2 必须重新取得经过验证的规范动作/精确目标与周期/hash，并设计用户明确选择后的原子执行和撤销保护；不得把本轮展示字符串当写入依据，不得直接启用按钮。W5.1 不保存原包、AI全文或已执行日志。
