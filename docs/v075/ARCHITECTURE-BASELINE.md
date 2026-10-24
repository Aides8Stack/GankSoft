# v0.7.5 S0 — 真实架构基线

日期：2026-10-22（Asia/Shanghai）。本文件为源码审计和实施方案，不是 v0.7.5 功能完成声明。

## 来源、版本与远程状态

- 仓库 `Aides8Stack/GankSoft`；实际 `origin/develop` 与交接包快照相同：`7970896c0306833e3b2f54a843f388d2e380618f`。启动时全新 checkout，工作树干净；没有同名/近似 v075 任务分支或 PR。
- 应用仍为 `0.7.4-rc.6`；S0 不改版本/锁文件。Node >=24，实际 Node 24.19.0/npm 11.9.0/Linux x64；Vue、Electron、TypeScript、Vite，SQLite 使用 `node:sqlite`。关键依赖声明：Mind Elixir `6.0.0-next.4`、ts-fsrs `5.4.2`、Zod `4.6.7`；实际锁定版本见 TEST_REPORT。
- develop Actions `39581175708`：completed/success；preflight、security、双平台 quality、windows-package、artifact-verify、release-rc、report 均 success。此处是继承基线证据，不是本分支 CI 或 Windows 人工验收。
- 已合入 #11（便携发布）；#12 开源流水线试点不在开放 PR 列表，也没有其分支，不能重新引入。开放 Draft：#2 `feature/unified-image-recovery`（`6d47b785e6b55d0f0c4146f8edd7d84842e30ff3`）、#3 `chore/ci-efficiency`、#6/#7 旧门禁探针。只记录，不改动、不合并。
- 保留 `feature/unified-image`、`feature/unified-image-recovery`、`infra/portable-only-release` 等现有分支。#2 的图片能力不能被当成 develop 已实现；不自动 cherry-pick。
- S0 分支 `feature/v075-unified-learning-workspace` → `develop`。新任务用 `npm run task:init` 归档继承的 5 份状态文件；旧安装任务记录不是当前阶段进度。

## 模块、字段、入口、覆盖与差距

以下“已实现”仅指当前基线代码及本轮旧功能测试，不代表已满足新规格。精确字段/约束/外键见 [SCHEMA604-INVENTORY.md](SCHEMA604-INVENTORY.md)。未运行覆盖率工具，不提供虚构覆盖率百分比。

| 范围 | 当前字段与源码事实 | 读写入口、UI | 现有测试与 v075 差距 |
| --- | --- | --- | --- |
| 目录/卡片集 | `folders(id,name,parent_id,sort_order,deleted_at,version)`；`decks(id,name,kind,parent_id,sort_order,deleted_at,version,folder_id)`，kind CHECK question/memory | `catalog.folder.*`/`catalog.deck.*` → folders/decks 模块；App/Overview/FolderTree/DeckWorkspace/CatalogManager | decks/trash/import-scope；已实现目录与回收站；混合三模式未实现，不能只删 UI kind |
| 错题 | `questions`: id/module/title/stem/options/answer/analysis/source/initial_thought/material_id/status/version/content_version/project_note/时间与软删；options 是文本，answer A–D | `content.question.save/note/delete/restore`；questions/service/content；QuestionEditor/CardExplorer | core/v04/v071/v072/reliability；正式保存立即生效，正文改变自动 reset scheduling；稳定 optionId、草稿发布未实现 |
| 记忆 | `memory_cards`: id/module/title/cue/content/source/version/learning_version/legacy_question_id/时间与软删 | `content.memory.save/action`；memory/service；MemoryEditor/MemoryWorkspace | core/review-policy/direct-study；单独存储，cue 必填；不存在 QA/direct 两种已发布模式 |
| 内容版本 | questions.content_version 与 memory.learning_version 是数字；wire `contentVersion` 经 shared/protocol/identity.ts 编成 UUIDv8，可反解序号 | snapshots/analytics 与 review.*；不是可查询的版本仓库 | review-timeline/reliability；无独立不可变版本表，不能把当前正文填进缺失旧版本 |
| 编辑/会话草稿 | `study_sessions(deck_id,payload,updated_at,revision)`，唯一 deck+payload.sessionId；settings 中 media-draft:* 保存暂存图片信息 | `session.draft/reveal/advance/restart/skip/finish`；sessions/service/events；useStudySession | study-pages-v065/reliability/protocol-v2；这是作答会话草稿，不是单卡单类型编辑草稿 |
| 历史/幂等 | attempts: 原始答案/正误/0–4 score/0–10 self_score/思路/错因/用时/内容及知识快照；memory_reviews: 0–4 score、内容/卡快照、note；schedule_events 保存 before/after/log | review.question.submit/review.memory.submit/review.receipt；review/workflow/service、memory/service；ReviewWorkspace/StudyWorkspace/ReviewRecordDetail | 202 基线包含重复提交/备份/内容冲突测试。旧版变更会拒绝复盘，不支持继续归档冻结版本；memory 证据字段更少；无独立 cycleId |
| FSRS/策略 | scheduling(kind,card_id,data,updated_at)；plans/memory_plans；card_review_policies 最大间隔；deck_review_config_v2 JSON/修订；due overrides/config operations | policy.*；review/fsrs/config-service/due-preview/policy/review-queue；DeckReviewSettings/ReviewQueuePreview | review-config/due/budget/adaptive/matrix/performance；已有参数保存不重排、预览/确认/撤销和到期保护；需三模式及新周期适配，不能重写 FSRS |
| 评分/掌握度 | shared/self-assessment.ts 和 attempts CHECK 都把正误与 self_score 分段绑定；assessedGrade 与新 5.9/7.4/8.9 边界不一致；memory 仍 0–4 | assessment/read-model、analytics/*、shared/assessment/review-evidence；SelfAssessmentSlider/Insights/CardReviewAnalytics | assessment-v051/analytics-v066/review 系列；统一新评分与当前 cycle 掌握度仅设计，历史原分保留 |
| 知识/关联 | knowledge: id/module/parent_id/name/aliases/principle/conditions/method/traps/version/软删/时间；同 module+coalesce(parent_id,'')+name 活跃唯一；question_knowledge 与 memory_knowledge 多对多；relations 同层关系 | knowledge.save/merge/delete/restore/map.save/insight；knowledge/service/map；KnowledgeEditor/Picker/Outline/MindMapWorkspace | core/v070/v071/decks/trash；多根与去环已存在，正文仍固定字段，merge 无独立预览 token，delete 单节点路径拒绝有子节点，restore 缺父自动挂根，不满足新子树恢复流程 |
| 图谱交互 | `gank-root` 仅虚拟视图根；mindMapPan.ts 空白左键平移；treeRows 只传 id/name/parent_id，SQLite 无同级序字段 | MindMapWorkspace/mapPersistence → knowledge.map.save（expected 节点版本表） | 既有 mind smoke；层级可保存，同级顺序持久化未实现；Mind Elixir 普通节点拖拽真实能力待 S5 验证；根拖整图明确暂缓 |
| 图片 | assets(id,question_id,role,file_name,mime,sort_order)；attachments 二进制；response 图片在历史快照中；暂存 metadata 在 settings | media.stage → main 平台协调器 → media/drafts、images/image-binding；app-media://；ImageAttachments | image-binding/v072/containers；当前宽度为组件共享 ref(360)，所有 figure 同宽且不持久；非新版 per-placement MediaAsset；记忆/知识/选项全链尚未完成 |
| 内容交换 | ganksoft.content 2.0；ganksoft.content.container v1 ZIP/gank.json；knowledge_archives/keys、import_batches/entries | exchange.open/preview/commit/collection.*/deck.export；imports/*/export；ImportWorkspace/CollectionImport | exchange/import-scope/bulk-ready；导入即可学/隔离保留；exportDeck 不是完整历史备份，collection 仍单类型；没有专用 marked MD/独立外库追加 |
| 完整恢复/存储 | backup v1 支持 schema600–604；node:sqlite backup() 捕获 WAL 一致性快照，清单 hash；恢复 staging/journal/保留旧目录 | maintenance.backup/restore；backup/restore-journal/integrity、main；Settings | containers-v060/review-backup；路径默认 userData/v060/data，支持 GANKSOFT_DATA_DIR 测试覆盖；活动库目录迁移、独立追加尚未实现 |
| AI | ai.config.get/save/analyze 和 adapter.generate 当前可请求外部模型 | main、ai/adapter、DiagnosisSettings 等入口需 S3/S7 清理 | ai.test；这与新“只复制外部 Prompt、不内置模型 API”不一致，S0 不提前删除，仅登记后续退役 |

## 真实调用链与载荷风险

Vue → `src/services.ts` → `shared/protocol/client.ts`/registry（Zod）→ preload 的唯一 `gank.protocol`/`gank:protocol` → gateway → Application/领域服务 → infrastructure SQLite/files。协议当前 2.0，定义 75 方法，但 capabilities 排除退休入口，不能用定义数冒充可用数。

现有 query/command/maintenance 分类、epoch、requestId、digest、protocol_receipts、operation.status、platform_operations 已存在，应扩展而非再造另一套幂等框架。Application 事务与嵌套 savepoint 必须保留。

`workspace.read` 支持 sections、deckId、offset/limit，然而 services.workspace.read 会逐页拼接，store.refresh 默认取全部 sections；Application.snapshot 还查询全局 links/assets。当前不是“只取当前卡片摘要/单模式正文”。S1 定合同，S3/S7 逐页面替换调用，数据预算验收见 T37；S0 不伪称性能优化已完成。

## UI 对照与保留边界

实际用本地 Electron/Chromium 打开包内 OPEN-ME-v3.7.html，访问学习总览、deck、cards、editor、review、knowledge、settings；检查图谱、Markdown 大纲/交换入口及包内截图。原型页面导航未观察到 pageerror。自动截图在 headless 环境超时，截图结果不计 PASS；包内截图只作视觉参考。

| 原型期望 | 生产复用入口 | 阶段 |
| --- | --- | --- |
| 小图标目录 → 卡片集内操作；列表勾选再显工具栏 | App/Overview/DeckWorkspace/CardExplorer/WorkspacePageBar | S7；保留原 Vue shell |
| 标题/所属集/三模式、自动草稿、默认不重学发布 | QuestionEditor/MemoryEditor 外包共享编辑 shell | S2/S3；不复制 demo contenteditable |
| 内容优先、总计时/暂停、主客观分离 | ReviewWorkspace/StudyWorkspace/useStudySession | S4/S7 |
| 全屏导图、工具栏新增按钮紧跟全屏、仅右侧详情 | MindMapWorkspace/mindMapPan/mapPersistence | S5/S7；无根自由坐标 |
| Markdown 大纲右侧缩进目录、导入右侧大正文/左图挂载 | KnowledgeOutline/KnowledgeEditor 的适配边界 | S2/S6；同一数据源 |
| 分析按需展开；设置/回收站独立且可返回 | Insights/Settings/TrashWorkspace | S7/S8 |

Milkdown/Crepe 仅 S2 首选候选，尚未安装/验证。不能把历史原型 31/31、普通文本框或模拟保存算生产编辑器验收。

## 当前结论

已实现：上表旧业务能力、既有协议与调度/备份基础；已验证：本轮基线命令与 Electron smoke（TEST_REPORT）。仅设计：MIGRATION-ADR/API-CONTRACT-DELTA/PHASE-GATES 的新增模型和流程。尚未实现：S1–S9 全部新增能力。尚未验证：新迁移、POC、Windows10/11 人工、真实用户数据。用户私人数据库未打开。
