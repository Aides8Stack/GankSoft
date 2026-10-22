# v075 迁移 ADR — S0 冻结策略，未实施 DDL

状态：S1.a只读预检/合成fixture/备份基线已实现并通过本地测试，双平台CI待核实；S1.b/S1.c的DDL/映射/新协议仍未实施。事实基线 schema604，不能沿用其它分支/旧报告中的 schema605。完整字段和旧 CHECK 见 SCHEMA604-INVENTORY。

## ADR-01 扩展、回填、核验、切换、清理

复用 SQLite + typed IPC + ts-fsrs，不重建库、不提前移除旧入口。首个新迁移版本候选 605，S1 开始必须重新核对 develop/任务分支及占用版本后确定；此文不宣称版本已升级。

S1.a 先建立 schema fingerprint、合成 schema604 fixture 和可恢复快照；S1.b 新增统一身份、不可变内容版本、单模式草稿、cycle/event 模型及必要适配；S1.c 幂等回填与重开/中断回滚、类型化合同验证。S3 才切换正式编辑/发布，S4 才启用新事件/评分。旧路径与新模型并存期间明确唯一写入所有者，不能同时更新两个排期真相；adapter 的提交/回填水位同事务推进，不能后台异步双写造成分叉。

### 目标对象候选（不是现存表）

| 概念/建议字段 | 旧数据来源 | 约束和核验 |
| --- | --- | --- |
| Card(id,deckId,publishedType,currentVersionId,currentCycleId,revision,deletedAt) | questions + memory_cards | 通常保持原 id；deck 不限制类型；跨集移动保 id/历史/FSRS/单卡覆盖，解除当前原集知识关联 |
| ContentVersion(versionId,cardId,mode,payload,sourceSchema,sourceRaw,publishedAt) | 当前正文及可用历史快照 | 发布不可变；三种模式各保留已发布版本；不把缺失历史伪造为当前正文 |
| Draft(cardId PK,draftType,payload,revision,basePublishedRevision,updatedAt) | 新能力；旧 study_sessions 不是编辑草稿 | 单卡最多一类型草稿；确认切换清旧草稿；发布前不变 publishedType |
| StudyCycle(id,cardId,startedAt,provenance) | 旧 content_version/learning_version 的证据分段 | legacy 标记，不虚构用户点击过重学；新 publish reset 默认 false，true 才开周期 |
| ReviewEvent(id,cardId,contentVersionId,cycleId,mode,scoreTenths?,objectiveCorrect?,rating?,mappingVersion,engineVersion,legacyRaw,knowledgeSnapshot,elapsed,notes) | attempts、memory_reviews、attempt_faults、evidence、schedule_events | 保持原始事件 ID/内容；旧 score 与 FSRS rating 原样保留，缺失字段 unknown/null；新事件独立映射 |
| ScheduleState(cardId,cycleId,state,revision,policySource) | scheduling、plans/memory_plans、due_overrides | before/after/到期/暂停状态逐项一致；不回放历史“修正”排期 |
| KnowledgeNode(id,deckId,parentId,position,name,markdownBody,legacyFields,revision,deletedAt) + CardKnowledge | knowledge/两种 link/relations | 原 id 不变；同父唯一含根、去环；正文固定字段有标题有顺序地迁成 Markdown，并留原字段可逆副本 |
| MediaAsset + Placement(ownerVersionOrDraft,assetId,width,layout) | assets、settings media-draft:*、历史 assets、attachments | 原文件/引用/排序/角色不丢；旧宽度未存即 unknown/default，不编造；独立放置点宽度由 S2 POC 冻结编码 |
| AppendProvenance/TrashBatch/StorageOperation | import/recycle/restore 机制扩展 | 追加独立 deck，不跨库拼历史；完整恢复与物理迁移分开 |

表名/索引/DDL 由 S1 合成 fixture 和查询计划证据确定。先识别所有现有表及 settings JSON 的引用，不只迁 questions 表。

## ADR-02 身份、版本和历史真实性

1. 审计跨 questions/memory_cards 的 id 碰撞及 legacy_question_id，旧标识是 `(kind,id)`；不能把同字符串误合成一张卡。正常数据保原 cardId；发现碰撞先输出可审核映射方案并阻断相应迁移，不静默重编号或合并。知识/关系/回执/会话/媒体都必须指向同一映射。
2. 当前 contentIdentity(cardId,ordinal) 是 wire 计算身份，**不是**持久版本档案。已有引用必须可解析；按来源保存 ordinal 与原 token，不把 mode/cycle 混在一个版本号中。
3. 当前正文可建一个明确来源的初始版本；旧事件已有 question_snapshot/card_snapshot/content_snapshot/answer_snapshot 时，按原始快照单独归档。旧版缺正文、选项、父级路径或关联时保留缺失状态和 legacyRaw，不凭今天的知识树/正文回填“当时事实”。同序号快照不一致不能任择其一，应保留独立来源并报告。
4. 每条旧事件原始 0–4 score、self_score、correct、effective、parameters、algorithm、elapsed_source、时间戳、所有快照和故障记录均保留。没有自评就 null，不能把 4 直接当新 4.0 或自动乘 2.5 冒充实测。只允许单独标注规则的展示投影，不改原始历史。
5. 新自评以整数 0–100 保存，展示 0.0–10.0；0–59/60–74/75–89/90–100 对应 Again/Hard/Good/Easy；错题 objective=false 无条件 Again。旧 attempts CHECK 仍会禁止错高分/对低分，S1 必须选择新事件表或经验证重建约束；不能只改前端校验。S4 才启用新行为。
6. 旧事件和旧调度保留。未来冻结版本提交可写旧事件；现行 version/cycle 不同则跳过调度并返回明确原因。新周期无证据 pending，不删旧记录。

## ADR-03 WAL、媒体、一致快照与回滚

- `openDatabase` 会迁移和修复旧标题，**不是只读检查函数**。审计外部/源库先使用 `DatabaseSync(...,{readOnly:true})`，不调用该函数触碰原库；未知 schema/application_id 明确拒绝。
- 现有 foreign_keys=ON、WAL、busy_timeout=5000、BEGIN IMMEDIATE/savepoint 保留。迁移前冻结写入并排空 UI/后台操作，使用现有 node:sqlite backup() 获取一致库快照，不能只复制仍有 WAL 页的主文件。媒体清单在同一写入屏障内复制与 hash 校验。
- 快照包括原 schema、所有表行数/稳定行摘要、全部事件与快照、调度 JSON、protocol/store、回收站、暂存媒体、实际图片文件/引用、manifest。库与媒体形成一对恢复单元。备份不可放在将被切换/删除的 staging 内。
- 在 staging 做增量事务和回填，检查 integrity_check、foreign_key_check、每个原始事件 hash、当前/历史/草稿媒体可读性、同级重名/环、ID 映射和队列/回执依赖。出错保留源库，回滚事务并清理未提交目标文件；禁止吞掉错误补空。
- schema 版本、backfill 水位、契约版本只在一致验证成功后提交。重跑已成功迁移不得改事件 hash、生成第二批版本/周期；失败恢复后重跑也必须幂等。S1 注入异常/进程退出验证。
- 切换须持久操作日志和单一活动路径指针；恢复后 renew epoch，旧窗口不能继续旧库写入。源库/媒体留存并停止写入；新路径失联不自动回旧库。跨盘 rename 不具原子性，先复制校验，再原子替换小型指针；S8 验证断电恢复与 Windows 路径权限。
- 新 schema 必须同步 backup Manifest 的版本范围、stageBackup、validateBusinessData、内容交换 codec、引用清理。S1 提供新 schema 可备份的最小适配；S8 才宣称全流程完整恢复/追加/迁移完成。旧程序不能直接打开升级库，回滚用保留的旧版本程序与匹配快照，不对新库直接降 schema。

## ADR-04 合成 fixture 与停止点

S0 只用内存空库生成字段清单和既有测试的临时库，未写迁移器或用户数据。S1 需新增以下 fixture/故障点，不提前标 PASS：

| fixture | 必测不变量 | Gate |
| --- | --- | --- |
| schema604：问答旧记忆/错题、多 deck/文件夹、同名不同父、多根 | 原始 id、跨集隔离、FK、当前内容和关系数量 | T02/T03 |
| 0–4/0–10/空自评、有效/练习/legacy_unknown、缺/完整快照 | 原始事件逐项 hash；不捏造版本/路径/评分；两次迁移一致 | T02 |
| 正文/解析/作答历史图片、settings 暂存图片、删除后仅历史引用 | 图片 hash 与引用闭包完整，不按当前 assets 单表清理 | T02/T04 |
| 有 WAL 未 checkpoint、事务中断、文件复制中断、目标拒写/磁盘满 | 源库可继续恢复，目标全成或可回滚，无半迁移/双活动库 | T04，S8 T40/T42 |
| 同字符串跨类型 ID、legacy_question_id、损坏 JSON/孤立 FK/缺媒体 | 报告并阻断，不静默合并/丢弃 | T02/T04 |
| 旧内容 gank.json/ZIP 和完整 backup ZIP | 区分内容导入/完整恢复，不拿无历史的 content 包假验完整恢复 | T02，S8 T38/T39 |

真实旧 RC fixture 只有在取得可溯源且无私人数据的样本后才标验证；现有合成测试不冒充实测用户库。缺证据保持 NOT_RUN，S1 明确登记。

## ADR-05 边界

知识节点不是调度对象；根拖整图、多选/自由作答、单击克隆、跨数据库历史/FSRS 合并、AI 自动关联/内置 API 都不实现。Milkdown/Crepe 尚未定型；Mind Elixir 继续沿用，普通节点排序由 S5 测真实依赖后适配。既有 CI、发布审批和便携流水线不改。
