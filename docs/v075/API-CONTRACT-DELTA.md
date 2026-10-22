# v075 API 差异 — 以实际 registry 为基线

S0差异表保留作计划；下节记录S1.b已落地入口，其余拟定方法仍未实现。基线：`shared/protocol/registry.ts`、`data.ts`、`models.ts`、`model-codec.ts`、`src/services.ts`、`electron/protocol/gateway.ts`。现有 protocol 2.0，registry 75 个定义，不代表全部可调用。

## S1.b 已实现（protocol 2.0，定义75→78）

`shared/protocol/unified.ts`是独立显式Zod DTO/校验codec与推导类型；不套用旧snake_case/ordinal转换器。registry、gateway、src/services.unifiedCards和生成的contracts-v2/API-INDEX已同步；现有Vue页面没有改接。

| 方法 | 输入 | 返回/边界 |
| --- | --- | --- |
| card.listSummary（query） | deckId, filters.mode?, cursor?, limit默认50最大100 | items只含cardId/deckId/title/publishedType/contentVersionId/revision/dueAt/paused/knowledgeCount；nextCursor/dataRevision。cursor绑定deck/mode/revision/epoch；变化明确拒绝重读 |
| card.getPublishedContent（query） | deckId,cardId,versionId? | 单模式ContentVersion；不带其它模式/全部历史/二进制；校验所属deck和card |
| content.getVersion（query） | deckId,cardId,versionId必填 | 与上相同的指定档案查询，不能跨card取版本；旧token多来源返回歧义错误 |

604当前只读adapter返回按card+dataRevision+epoch标识的**当前视图token**，不是已持久归档承诺；数据变化后旧token返回CONTENT_VERSION_NOT_AVAILABLE。不会以当前内容替代未归档的历史。606隔离模型的版本身份为持久来源ID，支持具体历史档案和受限旧UUID alias。606查询service可独立验证，但Application protocol在S1.c激活前拒绝该副本，生产仍只读604。

摘要SQL仅身份/标题/模式/修订投影；调度复用dueEligibility（改为仅取其所需卡片列，语义不变），知识只count，不取正文/图片/全部历史。606使用learning_cards_deck索引，不join版本大document。合成106卡、每卡3万字符正文，50条页最大13497 bytes；是本地JSON序列化实测，不代表全部S7预算验收。单次仍受现有2MB wire保护。

新增错误：CURSOR_INVALID、DATA_REVISION_CHANGED、CONTENT_VERSION_NOT_AVAILABLE/NOT_FOUND/AMBIGUOUS、MIGRATION_NOT_ACTIVATED；复用DECK_CONFLICT/MIGRATION_ID_COLLISION。新3方法均query，不新增写入或回执体系；编辑草稿仅内部副本CAS primitive，公开mutation/幂等/确认与发布归S3，统一评分归S4。

## 复用的协议规则

公共 envelope 已含 `protocol/requestId/dataEpoch/method/payload`；成功返回 `dataRevision`，失败含 code/outcome(rejected|unknown)/retryable/fieldErrors。command 事务与 durable receipt，maintenance 的平台操作日志、operation.status 和幂等冲突验证继续复用；requestId 不能只藏在 payload 里自行去重。restore/迁移成功更新 epoch，旧客户端 DATA_EPOCH_CHANGED 不能重放写操作。

S1 以新增方法、capabilities/字段 schema 扩展和 adapter 渐进接入；不默默改变现有 wire 方法的解释或强行把三模式塞入旧 d.Kind。若后续确需 major 升级，先列全部调用者/codec/导入/备份迁移与版本拒绝测试，再成对更新两端；S0 不自行升号。

实体 expectedRevision 用于业务乐观锁，dataRevision 用于读一致性，二者不能互换。所有新修改接口明确事务边界和重试语义；预览 token 绑定配置/数据 revision、epoch、对象范围、摘要/时间与过期，commit 重新校验，不把 UI 展示的 count 当授权。

## 逐入口差异

右栏均为**拟定合同**，不是现有方法。

| 真实现有入口（effect） | 当前字段/限制 | 目标合同与实现边界 |
| --- | --- | --- |
| catalog.deck.save（command） | name/kind(question或memory)/folderId/sortOrder；修改 expectedRevision | deck 不受模式限制；保留目录/名称/排序/修订；kind 仅作为旧数据来源元信息，不再筛除卡片 |
| workspace.read（query）/cards.query（query） | sections/deckId/offset/limit；前端逐页拼接；cards.query 返回完整 matched/eligible 集 | `card.listSummary(deckId,filters,cursor,limit)` 有界摘要，不预取全正文/全史；现有组合筛选、预算、随机知识点保留 |
| content.question.save（command） | stem/options文本、A–D answer、analysis/source/initialThought/images(id,role)/material/knowledgeIds；直接写正式内容 | `draft.get/save/switchType` + `card.publish`；选项 `{optionId,position,markdown}`，≥2、唯一正确 optionId；images 用 placement refs；发布原子且 resetStudyCycle=false 默认 |
| content.memory.save（command） | cue/content/source/knowledgeIds 等；只允许 memory deck；直接保存并可能重置学习 | QA `{front,back,supplement}` 与 direct `{body}` 按模式分离；一份单模式 draft；已有目标发布版优先恢复，首次转换才建议映射 |
| 无 published version/read detail/edit draft 接口 | wire UUID 版本只编码 ordinal；session.draft 是作答状态 | `card.getDetails/getPublishedContent`、`content.getVersion`、`draft.*`；cardId 稳定，单模式/指定版本读取，历史另分页；不能把 session 草稿改造成编辑草稿 |
| content.bulk（command） | deckId/ids/action/target；move 同类型限制；解除旧链接，保留当前排期 | `card.moveDeck` 扩展至任意混合集；revision/requestId、cardId/历史/当前 FSRS/单卡覆写不变，目标知识点需重选，后续排期用目标集全局设置 |
| session.*（command） | sessionId/entryId/ids/index/stage/contentVersion、总计时/单题计时/暂停、revision | `review.startSession/getItem` 或对应现有扩展；每 item 冻结 mode/contentVersionId/cycleId 和知识关联快照；同一活动会话不同页不能重复领取 |
| review.question.submit（command） | cardId/deckId/contentVersion UUID/answer A–D/thought/basis/understanding/selfScore/elapsedSeconds/knowledgeIds/responseImages；requestId 与 envelope 一致 | 统一 `review.submit`: cardId/sessionId/entryId/contentVersionId/cycleId、selectedOptionId?、scoreTenths(整数0–100)、elapsed、笔记；服务按冻结版算客观正误并保存实际 rating/mappingVersion |
| review.memory.submit（command） | rating(again/hard/good/easy)、note/practice；gateway 转 0–4 score | QA/direct 用同一自评/事件模型；无客观正误为 null；原 legacy 评分只读保留，不假装原本有 0–10 自评 |
| review.receipt / operation.status（query） | requestId（后者含原 method/payload）；durable 回执；unknown/rejected/committed | 复用；保存成功/刷新失败、响应丢失/提交未发生分别返回；复盘重试只生成 1 事件/排期变更，不另建第二套请求账本 |
| analytics.card/timeline/collection/deck、knowledge.insight（query） | card kind 分两类；timeline 聚合；版本可筛选，无统一 cycle | 新增/扩展 `review.listEvents/getEventDetail` 有界分页；assessment.getCard/getKnowledge 返回 pending/evaluated、证据数、currentCycleId、direct/aggregate，cardId 集合去重，不产生知识点排期 |
| policy.config.get/save/preview/applyExisting/undoExisting、policy.card.get/set、policy.previewQueue | 保持率/最大间隔/预算/专项；single card override 目前最大间隔；preview token、config/data revision 已有 | 优先扩展现有方法，不另造 Scheduler；全局改动默认未来生效；主动重算有 preview/confirm，单卡覆盖不受全局影响，due≤now 不因重算延后；S4 测新模式/新周期 |
| knowledge.save/map.save（command） | 固定正文分段；map nodes 只有 id/name/parentId，expected 为所有节点版本 | `knowledge.listRoots/listChildren/getNode/getMarkdown/search`（query）；`applyTreeChanges`（command）只写 parent/order 等结构变更、tree revision；正文 revision 独立，避免整图带全文 |
| knowledge.merge/delete/restore（command） | merge sourceId/targetId 无 preview；delete registry 有 cascade/detach 但服务路径并非完整子树恢复；restore 缺父自动挂根 | mergePreview/commit、trashSubtree/restorePreview/commit：完整正文/子树/links/relations 冲突预览，用户选择缺父/同名，事务与逆操作；历史快照不改 |
| media.stage（maintenance） | deckId/purpose(question,analysis,response)/source(file,clipboard) → id/mime | 统一媒体资产/放置点服务；独立 width/layout 存在内容/草稿 placement 上；受控 URL 读取，不传绝对路径/临时 blob；扩展 QA/direct/knowledge/option 所有者 |
| media.remove/import/paste | registry 仍定义，gateway 为 METHOD_RETIRED，capabilities 排除 | 不恢复这些旧写入口；迁移到统一 Media adapter 后按调用者审计删桩 |
| exchange.open/preview/commit、collection.describe/import、deck.export | content2.0/ZIP/gank.json；collection 仅一种类型；无全部学习历史 | 内容交换继续独立；`knowledgeMd.previewImport/commitImport/previewExport/saveExport` 只负责 marked MD + Base64；正文标题不作结构猜测，token 校验/冲突预览 |
| maintenance.backup/restore（maintenance） | 整库 ZIP、manifest/hash、staging/journal；旧 schema600–604 | 完整备份升级覆盖新表/媒体；`storage.previewAppendDecks/commitAppendDecks` 和 `storage.migrateDirectory` 为不同事务/平台协调器。追加新 deckId 与内部 ID 映射，不跨库合并卡片/FSRS |
| trash.preview（query）/manage（maintenance） | items(kind,id)，restore/purge，purge expected revision，跨引用清理 | 扩展 Card/版本/草稿/事件/子树；整 deck 恢复有独立影响清单，图片标记闭包包含历史和回收站 |
| ai.config.get/save/analyze | 已存在配置/网络调用，不是新需求 | S3/S7 退役界面/服务/权限和旧 API；外部 Prompt 两独立默认关闭范围，仅剪贴板解析→预览→草稿，绝不自动知识关联 |

## 新 DTO 示例和预算（S1 测试后冻结）

`CardMode` 候选为 question/qa/direct，保留 legacy memory 的来源，不把旧 memory 直接改写为已做过 direct 学习。

摘要只返回 `{cardId,deckId,title,publishedType,contentVersionId,revision,dueAt,lastScore,knowledgeCount}`。每页 limit 默认50、最大100，返回 nextCursor 与 dataRevision；cardId 不重复，读期间 revision 变化则重试/明确提示。预算由实际 fixture 测量（S1/S7），单次仍遵守现有 2MB wire 上限。

当前内容示例 `{cardId,mode:'qa',versionId,fields:{front,back,supplement},mediaRefs:[{placementId,assetId,width}],revision}`；不含其它模式、历史数组或二进制。只有切换目标模式编辑才取其已发布版本。历史页返回事件摘要，展开再查不可变 event detail。

自评保存 scoreTenths，评分映射和 objective 服务端算；调用端不能传“已判定正确”绕过答案核对。mutation 校验 card/deck/版本/cycle 归属；在同一事务里校验后写事件与回执，再有条件更新调度，scheduleApplied=false 的旧版事件仍可成功保存。

MD 可能包含大 Base64，不允许简单突破 2MB IPC 上限。选文件使用平台 fileToken/只读解析，文本粘贴超限给出可恢复错误；是否分块/流式作为 S6 有界资源设计，所有块都需明确生命周期与 hash，不能在普通列表传 Base64。

## S1 最小入口

先建立 schema604 合成 fixture/只读 inventory 对照，冻结 Card/ContentVersion/Cycle/Event 来源字段与 ID 映射，扩展 shared contract + codec + 类型检查。S1 不接编辑器、不切换生产评分、不实现发布/根拖/MD parser/外库追加。新增合同必须同时更新 registry/models/codec、gateway/service adapter 与契约测试，不能只加前端类型。
