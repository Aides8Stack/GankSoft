# v075 迁移 ADR — S1.c 隔离恢复与显式激活

状态：S1.b检查点f24c6b05e10e925a52a7ff57c62f300a40597d25的双平台quality/pr-gate及pr-trust均成功；S1.c隔离路径的幂等、故障恢复、备份和显式激活已实现并本地验证。生产默认仍604，没有自动操作真实用户库；当前新SHA远端门禁待核，S1整体IN_PROGRESS，未进入S2。完整旧字段/CHECK见SCHEMA604-INVENTORY。

## ADR-01 扩展、回填、核验、切换、清理

复用 SQLite + typed IPC + ts-fsrs，不重建库、不提前移除旧入口。目标版本选择606：本轮fetch后develop/本任务均604；origin/feature/unified-image-recovery（6d47b785e6b55d0f0c4146f8edd7d84842e30ff3）已声明605，不能复用其版本含义。该分支未合入，不导入其实现；606只有显式协调器验证日志/指针/租约/epoch后能打开；默认openDatabase仍拒绝606。

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

## ADR-01b S1.b 检查点的边界与来源合同（当前恢复能力以下节为准）

- DDL：`electron/infrastructure/migrations/unified-schema.ts`。7个learning_*表：cards/content_versions/published_modes/card_drafts/study_cycles/review_events/model_meta；旧42张用户表和sqlite_sequence逐行保留。Card引用同card+mode的版本、同card的cycle；deck.kind不约束新卡。每模式有独立发布指针；单卡Draft主键唯一；版本/cycle/event触发器拒绝UPDATE/DELETE。
- `stageUnifiedModel(ctx, sourceDatabasePath)`只构建源库之外的副本，要求已核实完整604 schemaHash、S1.a预检、无pending平台操作；同事务安装/映射/完整性校验后写606/staged标记。当前不提供重跑606/no-op、恢复协调、活动路径切换；不能调用它升级活动库。S1.c必须在WAL+媒体恢复点、写屏障、幂等/故障/重开/备份验证之后接启动。未知同版本结构明确阻断，不把版本号当自动信任。
- 旧表仍为活动库唯一写入所有者，旧协议/事务/回执和评分不变。新增查询在604直接只读投影，不创建learning_*或异步双写。隔离606不允许创建Application protocol（MIGRATION_NOT_ACTIVATED），也不被openDatabase接受；不能悄悄把staged副本当活动库。S1.c启用前必须完成同事务旧写adapter/水位或明确的新写所有者，不能直接删除此保护。
- 卡片ID原样保留，memory.legacy_question_id只保留来源，不合并身份。旧memory映射qa并保留legacy_kind=memory，不伪造direct历史。当前版本ID为来源内容hash；历史每事件单独版本ID，即使ordinal相同也不合并。旧wire UUID留在source.wireToken；查询按card限定解析，多个来源返回CONTENT_VERSION_AMBIGUOUS，必须用具体档案ID。
- 原始快照不足即partial/unknown、payload=null；rawJson保留已知部分，绝不拿当前正文/知识路径补齐。当前内容也不把updated_at冒充publishedAt，旧cycle.startedAt=null、provenance=legacy-segment，不宣称用户重学过。A–D自由文本保留legacy-question-604编码，未做不可靠分行猜选项；未来question-v1选项ID/position/正确ID由Zod严格校验。
- ReviewEvent保留原事件ID、完整row/evidence/faults/schedule JSON、原0–4分/0–10自评/实际旧评级/引擎、原知识快照；scoreTenths与新rating保持null，mappingVersion=legacy-preserved。deckIdAtEvent仅证据已有时赋值，缺失保持null。新表允许独立客观结果和0–100整数模型；没有接入新评分/FSRS/提交行为。
- 图片引用保存assetId/fileName/role及独立placementId；没有旧宽度即null，原文件不改。现有调度/策略/会话/回收站/媒体暂存表全部保留，不创建第二份ScheduleState真相；新direct调度待S4。
- 内部saveStagedDraft仅606副本使用，校验basePublishedRevision/expectedRevision，拒绝隐式模式覆盖，不改变正式指针/cycle。无公开draft.save/switch/publish方法，无编辑器或发布UI。

## ADR-01c S1.c 已实施的恢复与写入所有权

- `stageUnifiedModel`在606上只读核验结构、不可变约束、完整档案、源映射与媒体闭包后返回noOp=true；不新增版本/cycle/event、不推进水位。604事务在DDL/逐卡/逐事件/提交前注入异常或进程退出，回滚后可重跑。重复的协调操作从原control目录调用recoverUnifiedMigration，而非覆盖重建目录。
- `inspectLegacyBaseline`仍严格604；通用inspectDatabaseBaseline识别604/606并逐表/媒体hash。validateUnifiedData验证learning表/索引/触发器的精确结构、Zod DTO、外键所属关系、旧→新和新→旧完整映射，以及已激活库的adapter digest/revision/epoch。缺原事件/冲突不能修复为空；旧分数与unknown规则沿用S1.b。
- backup manifest明确支持600–604和606（605仍拒绝）；stageBackup先校验清单schema/application_id与实际库一致。604/606只读检查，不触发旧标题修复。旧600–603保留原升级路径，不追加新的验收声明。恢复目标必须是新目录，拒绝覆盖/删除调用方已有文件；失败只清理本次创建目录。606严格解码图片并覆盖版本独有引用；604沿用旧备份的不改附件字节语义（既有测试含opaque附件），但补齐路径/hash和当前/历史/暂存/作答会话引用闭包。迁移预检604仍严格解码。
- `prepareAndActivateUnified(ctx,controlDir)`仅显式后端调用，未接生产启动或公开UI。先要求无源事务、无pending操作，且control为源外新目录；保留源库和媒体、两个已验证604/606 ZIP恢复点。源路径marker冻结应用入口，源连接query_only，另一个BEGIN IMMEDIATE连接在整个快照/提交期间阻断外部SQL写入；调用方须先排空异步系统操作。未决操作由原人工核对入口处理，不自动认可。
- 新副本始终有目标marker；转换期间仅绑定内部事务所有者，不开放606应用协议。迁移和目标epoch/learning_owner先在副本事务完成，606备份完整还原验指纹，再持久化prepared日志。原子替换小型active.json是唯一提交点；不以跨盘rename大目录作原子承诺。源文件不删除/不降schema。
- `recoverUnifiedMigration`：指针未切换时核源指纹后恢复源可用；指针已指向目标时核prepared指纹、606恢复点hash、owner/epoch后完成提交。已提交目标丢失或证据损坏保持BLOCKED，不回旧路径。源marker保留并校验；旧窗口/默认openDatabase不能继续旧源写入。提交后响应丢失明确MIGRATION_COMMITTED，必须查日志，不重试源升级。
- `openUnifiedOwner`只接受committed日志+目标指针、源/目标marker、库内operation/epoch和独占writer lease。活进程租约不可抢占；仅显式recover可回收已退出PID的租约。相同控制域只一个写者；过期epoch/指针/租约直接拒绝。租约按控制目录隔离，不宣称阻止任意绕开应用协议的外部工具操作副本。
- 旧Application/协议事务继续唯一业务写入所有者；database.transaction在最外层COMMIT前调用同步adapter，把当前内容/旧事件增量归档，与旧表、protocol回执和水位同事务提交。digest没变不创建第二份记录；投影中途错误回滚旧写/新档案/回执/水位。不另建FSRS真相，不重放历史或启用S4评分。新的只读查询在受控606使用持久版本ID。
- 旧物理purge若会删除已归档卡片/历史或改写原事件证据，明确LEGACY_HISTORY_PROTECTED/IMMUTABLE_CONFLICT并回滚，不静默丢档。604旧入口行为不变；606的完整回收站/历史清理归S8，不能把“入口保留”当作已支持危险清空。新native三模式和单Draft可无损备份恢复，但没有编辑/发布/评分UI。
- 安全激活状态：合成/隔离目录的完整准备→冻结→迁移→备份验证→提交→旧API写入→重开已验证；真实用户库/生产自动升级未启用。现有604恢复UI在606备份已验证后、替换旧目录之前明确拒绝，须走受控协调入口，避免单纯放开openDatabase。

持久性边界：POSIX文件/目录fsync和原子小文件rename已有实现；Node在Windows不提供目录fsync，真实断电、真实磁盘耗尽/硬件故障和Win10/11实机仍NOT_RUN。ENOSPC为故障注入，EEXIST为真实文件错误；进程exit/WAL重开不是断电验收。恢复进程自身在持有recovery.lock时崩溃会保守阻断，需人工核对，不自动删除未知锁。S8再覆盖目录迁移/电源级故障，不据此宣称已完成全部存储验收。

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
