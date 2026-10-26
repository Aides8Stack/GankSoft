## S8.b完整对象图转换检查点（2026-10-26）

append-map.ts已组合既有转换器，预留有序实体身份后绑定cycle/全部版本，再转换正式卡、三模式/草稿/复盘/FSRS/会话/知识/回收/媒体及旧元数据。新旧混合606图在独立SQLite实际提交、整库校验及关闭重开PASS；源库全baseline不变。旧正文真实CommonMark图片与placement按身份转换，代码/正文普通ID保留；schedule log仅改cycle/version关系，原before/after证明hash保留。旧会话所含已移动卡片新增明确选择依赖，放弃作答草稿图片缺归属明确拒绝、不静默遗漏。

专项append-map3及相关映射/选择/来源图合计36/36 PASS；npm run build、protocol boundaries PASS。仍未向实际owner追加；逐deck provenance/默认去重、事务/媒体补偿/API/UI是首个未完成任务，T39整体NOT_RUN。源码c002ecc11d5c50a46898cdef4d0fcf73ef22993d/tree1bd5d1dd0f2858c12ea384559b55f69371036d7e（798文件）已独立核验完整保存；CI40280578725首次in_progress，不等待/轮询。本检查点自身SHA由Git/原分支解析，保存后继续。

## S8.b元数据映射检查点（2026-10-26，继续开发）

已新增append-metadata.ts，复用既有身份/typed JSON转换：旧关系/策略/筛选/会话、待提交与放弃草稿、回执、归档命名空间、到期覆盖anchor、媒体元数据、统一知识回收及整集回收。原始请求proof/hash、知识归档artifact正文/checksum、评分/时间及FSRS数值保留；ID仅在已声明关系字段转换，导入会话暂停。未知筛选/回收/设置格式明确拒绝，不静默丢弃。新analysis/namespace/request/operation域操作内稳定、操作间隔离。

实际append-metadata4项、既有相关17项合计21/21 PASS，npm run build、protocol boundaries PASS。合成604所选完整旧图的受测表在新SQLite中提交，foreign_keys开启且foreign_key_check为空，validateBusinessData通过；当前仍仅转换集成验证，没有owner目标追加/去重/API/UI，T39整体NOT_RUN。S7/S8.a DONE，S8.b IN_PROGRESS，S9 NOT_STARTED。源码be2d83e CI40256988173、恢复点41961a4 CI40265875079已真实核验success。

首个未完成：将各转换器接成完整mapped graph，逐deck来源版本/provenance去重及实际owner原子追加/媒体补偿；补齐旧会话历史图片与跨集依赖边界后接typed API/UI。当前保存后继续，不因提交停止，不等待/轮询CI；生产604及真实用户库不操作。

## 当前检查点：S8.b旧档案转换（2026-10-26）

新增append-legacy.ts：声明的旧题/记忆/资产/事件/错因/证据/排期行身份转换，以及legacy-current和legacy-event不可变档案转换。复用原canonical投影纯函数；旧current档案使用自己捕获的材料/资产，不能补今日值；source原档案与投影矛盾拒绝。保留未知/部分历史、原始评分/时间/proof与FSRS数值。完整源ID集合可预留有序映射，保留SQL同sort_order/id及faults顺序；预留冲突不部分污染映射。

实际专项append-legacy4+append-identities7+append-json6=17/17 PASS；受纯函数提取影响的原migration-recovery30+原身份6=36/36 PASS（提取后、本次有序预留完善前）；npm run build及protocol boundaries PASS。SQL集成库开启foreign_keys，提交全部受测旧表行后foreign_key_check为空，旧current/event均与真实目标SQL投影逐字段完全一致。仅内部转换验证，不是实际owner目标追加。

尚未完成：其他旧元数据/会话/筛选/回收/归档键等完整整图映射、逐deck来源版本与provenance默认去重、媒体补偿/原子追加、typed API/UI；T39仍NOT_RUN，S8.b IN_PROGRESS。S8.c/S8.d及S9尚未完成。生产604/真实用户库未触碰；原Windows拖拽根因仍未确认，不改质量门禁。

最近完整核验远端67b7f68f35588e92dfb616615b41fda6e03b8fa9/tree1ca419cd5c8b28fa45e2481ea9b4d4c5346ee983（794文件），CI40254871348仅首次in_progress。当前提交自身SHA由Git/远端解析；不为回填自身SHA再空提交。保存后连续推进，不等待/轮询CI。

# v0.7.5 后续实施计划

S0–S7、S8.a开发准入已完成并有实际证据，继承不重做。S8.b整体IN_PROGRESS，scan/identity/selection内部服务已有专项和检查点；append-graph仅来源对象图收集已完成6项专项；native typed JSON转换原语已完成6+身份回归6项，完整旧表行/raw档案转换及目标复制/追加未实现。原工作包S8/S9和MIGRATION-ADR仍为约束，不自动生产激活606。

1. 按已明确确认的来源deck集合收集完整对象闭包；通过append-selection向用户列出真实依赖集，不自动导入未选对象、不静默删除外键、未知历史不填今日值。实际依赖包含memory.legacy_question_id、历史evidence.deck_id、跨集关系/偏好及归档复盘页所含已移动卡片。原语闭包重新核验固定scan，不信任可变预览标志。
2. 以append-identities操作命名域完整映射表列、typed JSON与媒体身份。旧current/event/cycle仍用现有函数派生并满足双向legacy投影；native全部已发布版本/单模式草稿/事件及知识快照/FSRS状态和策略/媒体宽度保留。检查关联和版本、草稿来源、循环、回收、会话、历史专属图片及单选选项身份，不以普通字符串替换正文。单次来源版本建立可追溯完整映射，不能用整库digest假装每deck版本。
3. 追加必须只创建独立新deck/对象，不改目标已有同名或同ID卡片，不跨库拼历史/重算FSRS。来源+deck+版本provenance重复默认提示跳过，用户强制新operationId可再追加一套独立对象；事务/媒体失败全补偿。保留目标全库恢复点和唯一owner/epoch/活动指针，不建立可同时写入的第二域。实施后按合成故障和真实重开验证，再接typed API/清晰影响预览/取消/确认UI。
4. S8.c目录迁移用SQLite一致WAL/媒体快照和唯一指针，旧目录保留停写；新位置不可达禁止退旧路径，中文/跨盘/权限未真验留S9 NOT_RUN。
5. S8.d整集/子树/卡片回收站与高风险永久删除最终整合，保留当前不可变历史保护；共享图片按完整引用闭包处理，不从旧入口绕过触发器。T38–T42完整准入后S9必要回归、Windows便携构建/同包人工/安全性能数据检查；不自动正式发布。

每个独立功能必要专项→完整源码/测试/配置/非敏感摘要保存→独立远端树核验→继续下一授权项；不等/轮询CI、不逐阶段问授权、不自动审批/合并/发布。历史方案细节保留Git和阶段ADR，当前文件只保留有效下一步。
