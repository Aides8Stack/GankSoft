## 检查点 B：迁移 UI 等待真实提交/重载（2026-10-26）

A已远端完整保存061e5f397d65af5be2b3fb756361cbbb79272d8b，tree c58615474ef44b0534185e2882346316f0658376与本地完全一致；CI40316509135首次in_progress，不等待。

实际下载并阅读Windows40290339566/Job121463867365/Artifact12637610223。原日志只有前三场景及900秒spawnSync ETIMEDOUT。本地追加定点开始/结束诊断复现：确认click已返回，而“学习总览”是设置页仍存在的常驻h1，waitFor立即完成，读到旧活动目录并进入清理；这是测试等待竞态，不能将按钮点击完成当迁移提交完成。改为在click之前注册domcontentloaded等待（15秒，继承既有restore/append同类模式），再断言新活动目录、原数据和真实进程重启。初次及重启都明确设置viewport，避免offscreen自动化窗口坐标不一致。

本地真实Electron5场景PASS（选择取消、中文窄屏预览、候选取消、确认迁移/唯一活动目录/源保留、完整进程重启后持久回执）。保留全部旧断言、900秒门禁和Windows质量步骤，新增逐场景JSON及操作诊断。Windows新修复结果尚未验证；仅证明本地竞态已复现并修复，不能声称已获得Windows根因全部证据或Windows通过。

额外A补验：保留的全部append/external-scan专项59/59 PASS；CI基础5/5 PASS。S8.b仍CANCELLED_BY_OWNER。继续C：仅设置中迁移，补齐当前目录/空间展示与跨盘、容量/恢复失败矩阵；无首次启动要求。

# 当前执行状态：S8 范围调整 / 检查点 A（2026-10-26）

此节覆盖下文历史任务和旧退出条款。原分支 feature/v075-unified-learning-workspace / Draft PR13→develop；恢复基线048fad4afeff3644dac21a15500679a4de4873c8。

- S8.b = CANCELLED_BY_OWNER，不能记 DONE/PASS，也不作为后续准入条件。所有内部实现/协议/原测试及旧UI文件保留。生产设置移除组件、状态和入口；兼容前端 facade 不发请求；公共网关在处理平台/回执/epoch前统一 FEATURE_DISABLED。606 storage session 不导入/初始化追加控制器；只有 tests/fixtures/isolated-append-session.ts 显式注入内部控制器，生产无环境/IPC启用开关。
- Windows质量步骤改为 owner 要求的真实生产隔离验收；原 append-smoke.ts 全文保留，属于已取消的旧生产UI验收，不以继续开放功能让它通过。旧前端实现另存 append-client-preserved.txt，内部服务专项继续执行。
- A实际证据：隔离3 + 内部协议3 + owner8 + 完整恢复API4 + 目录迁移API3 = 21/21 PASS；真实Electron隔离2场景PASS；应用/隔离构建PASS；协议21/边界/类型/149定义导出PASS。禁止请求前后临时库/媒体/控制文件全部hash一致。
- S8.c = IN_PROGRESS，仅设置中主动更改数据存储位置；无首次启动选择/额外检查。已有实现不重写，待Windows超时根因和剩余故障/跨盘验收。
- S8.d = NOT_STARTED，按现有回收站服务补齐；S9 = NOT_STARTED，Win10/11真实人工/最终便携同包NOT_RUN。
- 已实际读取CI40290339566 Windows Job121463867365及Artifact12637610223：Ubuntu PASS，Windows/pr-gate FAIL；迁移UI输出取消选择/中文窄屏/候选取消后900秒spawnSync超时，根因待定位。原始日志仅本地分析不提交。

下一步 B 定位迁移UI停滞并最小修复；再C补齐S8.c、D回收整合、E最终验收。检查点不终止连续任务，不等待/轮询CI；不审批/合并/发布，不触碰生产604或真实用户库。当前保存SHA由Git/远端解析，避免自身SHA循环提交。

---

## 2026-10-26：S8.b typed API/UI 本地检查点（保存后继续）

基于 de74098290df17b8ce0a94d6a166d64c84c843af，原分支/PR13未改变。新增 append-session.ts 复用现有606 storage session所有者、锁与重开；六个typed方法覆盖只读来源/分页、显式依赖/去重预览、确认、取消、持久状态查询。原请求ID/epoch/确认hash绑定；响应丢失使用原请求或持久控制回执，不在退役DB写回执。统一设置新增独立追加面板；未知结果保留原确认并锁定退出，恢复与追加互斥。生产604及真实用户库未启用/未操作。

本地实际：append-protocol3 + append-owner8 + restore-protocol4 = 15/15 PASS；协议21/145方法边界/类型/导出 PASS；应用及隔离构建 PASS；追加Electron8、完整恢复Electron7 PASS；CI基础设施5 PASS。新增Windows追加UI质量步骤，Windows新代码/人工/最终同包仍NOT_RUN。T39整体暂不标PASS，S8.b IN_PROGRESS。

CI40285070838首次核实：scope/Ubuntu成功，Windows运行中，不等待/轮询。前序40282663401实际日志：editor-launcher-selftest-windows/table-mouse-drag失败，列拖y指示线5000ms超时、data-show=false；target右边935.5，line右侧935.5，最后可信dragover790/280。根因未确认，不声称修复；未改断言或超时。后续需必要Windows证据及异常UI回归，再完成T39准入；后续S8.c活动目录迁移、S8.d回收整合、S9未完成。

保存仅源码/合成测试/必要配置/非敏感摘要，不含原始日志/用户库/令牌。当前提交SHA从Git解析，不循环回填。继续开发，不因提交成功结束。

## S8.b原子追加实现方式（2026-10-26，当前实施）

复用已有受控切换：从当前owner制作完整固定私有快照，在候选SQLite事务中只INSERT新身份对象/provenance/回执；逐表验证原行及媒体全部不变，再通过现有写租约/epoch/唯一active.json提交点发布候选。恢复点、提交前失败、指针后响应丢失及进程恢复复用已验证的coordinator；不向活动附件目录逐张发布文件，也不建立第二套活动指针。产品保持独立追加，不跨库拼历史/重算FSRS；确认绑定来源、目标整库digest/epoch/revision和确切追加范围。零可追加项只返回预览，不触发切换。私有候选失败/取消清理，不覆盖活动数据；生产604不启用606。所需验证：真实owner追加/逐表原事实不变、默认去重/强制独立复制、stale确认、SQL/媒体失败、指针前后及响应丢失和进程中断。

## S8.b逐集来源版本/去重规划检查点（2026-10-26）

append-provenance.ts已实现逐deck事实/关系/媒体版本及typed provenance记录。来源身份是原deck ID+已验证事实版本，不把protocol epoch伪称永久数据库ID；来源epoch/整库snapshot另保留追溯证据。版本不受确认集合扩大、无关集/全局设置或epoch更新影响；选中集真实事实变化则更新。默认重复跳过现存目标副本；若新集依赖被跳过的副本，明确blocked，不能接到可能已编辑的目标对象；显式forceIndependent才计划完整独立复制。已永久不存在的目标副本不掩盖可导入源数据；损坏provenance拒绝。

专项4/4 PASS，含真实606原生复盘/新卡草稿和owner revision更新对其他deck版本不造成影响；npm run build、protocol boundaries PASS。当前只完成版本/记录构造/校验/去重规划，尚未在实际append事务写provenance，不代表T39 DONE。首个未完成：实际owner原子追加、恢复点、事务/媒体补偿、响应丢失与进程中断恢复，再接typed API/UI。原S8.c/S8.d/S9待续。

最近完整远端0d78f7a04333d5699bc677f50eed2edfb9cab31b/treec9480600c938e3155a2cba4a456208b0f6ebc6ba（800文件）已独立核验；CI40281733232仅首次in_progress，不等待/轮询。当前提交自身SHA从Git/原分支解析。源码、测试与恢复状态整体保存后继续。

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
