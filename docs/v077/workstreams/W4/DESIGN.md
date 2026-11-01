# W4 — 设计与接口合同

> **W4 / P1** — AI 分卡 ZIP 导出与 Prompt。状态：NOT_STARTED；模型：GPT-6 / Medium；W 内依赖：W1、W3；Issues #35（导出）。

**此处只是待实施的最终需求定义，不代表已进入正式 Electron。** 准确性与刷新遵守 [数据同步合同](../../requirements/DATA-SYNC-CONSISTENCY.md)。

**状态：待实施 / 生产测试 NOT_RUN。模型 GPT-6 / Medium，复杂一致性冲突局部升级 High。依赖 W1 与 W3 统计读模型。**
关联 [#35](https://github.com/Aides8Stack/GankSoft/issues/35)，设计源参考该 Issue 与之前提供的 Vue/HTML 预览（**该预览尚未整体入库，实施前需归档/核验正式原型**）。遵守 [DATA-SYNC-CONSISTENCY.md](../../requirements/DATA-SYNC-CONSISTENCY.md)。

## 2026-11-01 最新设计修订：完整卡集 + 自适应多卡分片（优先于所有旧描述）

**不再规定每卡一个文件、每包最多500张或其他固定卡片总数限制。** 用户可以导出所选范围的所有卡；500/501、5,000、10,000 是边界/压力测试数量，不是新的产品上限。实际 RAM、磁盘、ZIP 安全预算不满足时明确报错，不得悄悄裁剪卡片或学习事件。

```text
GankSoft-...-ai-analysis.zip
├─ data/
│  ├─ manifest.json              # 导出身份、snapshot、SHA256/字节数/总数/索引分片
│  ├─ deck.json                  # 卡片集配置/调度策略
│  ├─ summary.json               # 全量卡片、知识点统计与学习趋势
│  ├─ knowledge/nodes-0001.json # 可分片
│  ├─ index/cards-0001.json     # cardId->主体分片/位置/历史分片
│  ├─ cards/cards-0001.json     # **一个文件多张卡片**
│  ├─ cards/cards-0002.json
│  └─ reviews/reviews-0001.json # **一个文件多张卡片的学习事件**
└─ prompt/analysis-prompt.md
```

- 卡片主体分片按照**实际非压缩 JSON 字节数 + 数量**双阈值自适应装箱，优先约20–50张/片、目标约128KiB、普通分片硬256KiB。长正文自动减少同片张数，短卡可增加；均为**内部装箱策略**，不是导出卡片总量上限。
- 历史事件按 `cardId/eventId` 跨卡分组，参考每约40条事件或软128KiB，硬256KiB；允许一个卡片的历史跨多个事件分片。超大单卡/事件安全拆成可还原字段片段或明确报错，不得截断。既要减少“每卡一小文件”，也不能生成唯一巨型 `study-data.json`。
- `manifest.json` 列出 `exportId/snapshotId/deckId/schema/dataEpoch/dataRevision`、总唯一卡片/事件/字节数、索引页及各数据片 SHA256/字节数。索引自身分页，按 opaque cardId/eventId 关联实际位置；每张卡的正文、知识关联、历史事件、评分、有效用时、客观正误、当时的调度快照、当前 FSRS 分别可从 ZIP 完整重建。
- `summary.json` 必须与 W3 当前全量卡片/知识点双维统计一致，使 AI 可以先看总体分布再深入分析全部卡片。Prompt 明确要求按 manifest 遍历**全部**分片；若外部模型因自身上下文限制只分析部分内容，必须标明覆盖率，不得假称分析全量。
- 使用 SQLite 同一可信快照（或导出中修订改变则明确失败）、有界内存游标读取、增量流式 ZIP 临时文件与成功后原子改名；不得一次组装全卡集 JSON 或图片 Base64。可选图片独立存放、去重并校验引用；未附图片的关键材料须标注不完整。
- W4 **只**实施离线数据导出和可编辑/保存/取消/重启读回的 Prompt，不实施 W5 的 AI ZIP 解析、申请、执行、撤销，也不修改普通卡片内容 ZIP（[Issue #36](https://github.com/Aides8Stack/GankSoft/issues/36) 独立）。
- 保留安全资源预算（ZIP 展开字节/压缩比/条目数/路径安全/磁盘空间），但不得转化为“最多N张卡”的暗中限制；失败不能留下可误认为成功的完成 ZIP。源数据库历史、FSRS、调度、知识点数据零修改（Prompt 保存是独立配置写入）。

## 设计合同
- 「学习分析 → AI 调度调整」是子页面，内部提供「导出 ZIP」「导入解析」「解析记录」；此批**只实现导出 ZIP 和 Prompt 编辑**。Prompt 编辑也是二级子页面，有保存与取消/返回，不创建顶部主导航按钮。
- ZIP **恰好两类主要内容**：`data/` 学习数据和 `prompt/analysis-prompt.md`。`data/manifest.json`、`deck.json`、`summary.json`、`knowledge/nodes-XXXX.json`、`index/cards-XXXX.json`、`cards/cards-XXXX.json`（每文件多卡）、`reviews/reviews-XXXX.json`（跨卡事件）均按上方新合同处理。**禁止每卡一个文件或唯一巨型 study-data.json**。
- 卡片/事件均需按上方新合同自适应多卡分片：事件约40条/片或软128KiB，单普通 JSON 硬256KiB；超长正文必须可还原分块或明确拒绝，绝不默默截断。导出固定一致快照，不能混合新旧卡片或调度记录。大卡片集流式 SQLite→ZIP 临时文件；失败清理 temp。
- 可选图片附件默认不导出；包含关键图片但未勾选时标记「材料不完整」并阻止 AI 据此自动推断图像内容。用户明确选择导出图片时校验引用与大小、ZIP 路径。
- Prompt 是人为配置，可修改并显式保存；变更 Prompt 仅失效下一次导出文件，不触发卡片列表或调度全量刷新。AI 不是在线服务，本批不向任何外部接口上传数据。

## 设计边界

- 旧 B1–B5 是已完成的既有软件功能，不需要再开发或重验所有历史用例。
- 本设计只属于 W4，变更权限限于本批直接相关的业务/服务/界面。
