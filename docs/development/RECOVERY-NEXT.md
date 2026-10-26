## 本次中断紧急保存（2026-10-26，停止后结束）

已按用户最新指令停止新增开发与非必要测试。本地有效源码检查点7767ddea700f409745ce2522ba33f3368fbd403d/tree6ae7ea7523c37fca6bb10565db8b4131866af634包含新增append-service.ts、shared/protocol/external-append.ts及append-service-v075.test.ts；8项实际owner专项及构建/边界已通过。中断时这些新增源码和测试尚未更新远端ref；本检查点与恢复文档一起保存，不只上传文档。保存完成以原分支实际HEAD、完整树比对和最终回执为准，不为回填自身SHA循环提交。

已实际核实CI40282663401（来源8ccc570e9f03295326ff92d2b26b52436fd2f834）：Windows Quality Job121439498895 FAILURE，失败步骤npm run ci:quality；Ubuntu Quality121439499111 SUCCESS；scope121439446216 SUCCESS；pr-gate121442259917 FAILURE。本次仅紧急保存，未读取失败日志/Artifact或定位具体原因，不认定为旧拖拽故障或随机失败。上文历史首次in_progress已被此实际失败状态取代，不能宣称Windows通过。

下一恢复步骤：先核对本地/原PR最新SHA与未提交/未推送成果，再读取上述Windows实际失败Job及相关Artifact，只做必要最小修复，不提高超时或降低门禁。然后继续S8.b typed API和统一界面的来源选择、依赖/重复预览、确认/取消/状态查询与真实Electron验收。append-service实际owner追加、四个进程退出恢复、原事实/媒体保留、响应丢失/幂等性已经验证，不重复开发。S7/S8.a DONE；S8.b IN_PROGRESS/T39整体未验收；S8.c/S8.d/S9未完成；真实Win10/11及最终便携同包NOT_RUN。生产604与真实用户库未操作。

本轮保存完成后立即结束，不等待CI、不继续开发。上传仅原创源码/typed DTO/合成测试/必要配置与非敏感摘要，原Draft PR #13→develop保留，不新分支/PR、不强推、不自动审核/合并/发布。若保存受阻须完整Git备份并独立恢复验证，不得遗漏未推送源码和测试。

## S8.b实际owner原子追加检查点（2026-10-26）

append-service.ts已实现原子独立追加：在完整目标固定快照的私有候选中用SQLite事务只INSERT重映射对象/provenance/操作回执；逐表原行分组计数证明已有事实未变（含无主键旧会话），原媒体/结构hash不变。复用既有coordinator恢复点、租约、epoch和唯一活动指针提交；活动目录不逐张发布媒体，不建立第二套指针。确认绑定目标完整digest/epoch/revision、来源与选中范围；取消/失败清理私有候选。指针后响应丢失从持久控制状态及候选回执读取；并发同确认共用结果，提交中不可取消。零可追加项不切换。生产604不启用606。

实际tests/append-service-v075.test.ts8/8 PASS：同ID碰撞的604来源独立追加、606原生历史/草稿/FSRS不重放或重算、逐表旧事实/媒体不变、默认跳过/强制新副本、并发/重开/响应丢失、取消/篡改/过期确认、SQL及缺图失败、4个真实process.exit（候选事务中/冻结/指针前prepared/指针后）。相关provenance4/map3本轮已PASS，owner7+其相关合计14项曾整体PASS；随后补原生606第8项单套PASS。npm run build、protocol boundaries PASS。未接typed API/UI，T39整体仍NOT_RUN；Windows本专项尚未取得，不虚报Windows/人工通过。

首个未完成：将追加服务接入现有已激活606 storage session的typed API，统一设置界面的来源选择/依赖及重复预览/确认/取消/状态查询，完成协议与真实Electron验收。后续S8.c目录迁移、S8.d回收整合及T38–T42，再S9；保存检查点后连续推进。

最近完整远端8ccc570e9f03295326ff92d2b26b52436fd2f834/tree489daa919debb19ef43a5dd73e1c68e8ae47a218（802文件）已独立核验；CI40282663401首次in_progress，不等待/轮询。当前提交自身SHA由Git/原分支解析。

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

## 紧急保存回执与下一恢复点（2026-10-26）

按用户本轮要求暂停开发，仅保存。执行环境恢复后已重新核验：原分支feature/v075-unified-learning-workspace、原Draft PR #13→develop；源码检查点be2d83e104bdd13732cc906dcf031613d0ea8373，tree5181959b5f2ffdee63d773ed0a24ea521af73751，与本地64b37e79c2a87aedbaa1eb8d80e37e42b65cdfca全部796个文件的路径、模式及blob内容一致。核验时工作区干净，没有尚未上传的源码、测试或必要配置；中断后未产生新功能源码。本次只更新保存回执和恢复记录，不能将文档提交误称为新增功能完成。

状态：S7 DONE；S8.a DONE；S8.b IN_PROGRESS；T39完整追加NOT_RUN；S8.c/S8.d及S9未完成。下一次从完整整图映射剩余项开始：旧元数据/会话/筛选/回收/归档键，逐deck来源版本与provenance默认去重，再实施原子目标追加、媒体补偿、typed API/UI及故障验证。append-legacy.ts的受支持旧表/不可变档案转换已完成，不重复实现；不得将未实施的整图转换或追加事务标DONE。后续按S8准入再推进S9，生产604和真实用户数据库未操作。

继承已通过的17项旧档案/身份/native JSON专项、相关迁移回归、构建及边界证据；本次紧急保存未重跑业务测试。CI40256988173对应上述源码检查点，上次首次观察queued；本次未等待、未轮询、未把旧状态当最新结论。Windows列拖拽旧故障根因仍未确认，真实Win10/11人工及最终便携同包NOT_RUN。

恢复时先检查git status、当前分支/HEAD和原PR最新HEAD，再读本文件、TASK.json、PLAN.md、PROGRESS.md、HANDOFF.md、TEST_REPORT.md及S8-ACCEPTANCE.json。API保存的远端commit元数据与本地不同但树一致，不reset或强推解决；保留全部有效本地提交。当前文档保存提交的自身SHA从Git/原分支解析，不为回填自身SHA循环提交。只上传经检查的源码/测试/配置/必要非敏感摘要，不包含原始CI日志、用户库、令牌或无关文件；不新分支/PR、不自动审核/合并/发布。

## 当前检查点：S8.b旧档案转换（2026-10-26）

新增append-legacy.ts：声明的旧题/记忆/资产/事件/错因/证据/排期行身份转换，以及legacy-current和legacy-event不可变档案转换。复用原canonical投影纯函数；旧current档案使用自己捕获的材料/资产，不能补今日值；source原档案与投影矛盾拒绝。保留未知/部分历史、原始评分/时间/proof与FSRS数值。完整源ID集合可预留有序映射，保留SQL同sort_order/id及faults顺序；预留冲突不部分污染映射。

实际专项append-legacy4+append-identities7+append-json6=17/17 PASS；受纯函数提取影响的原migration-recovery30+原身份6=36/36 PASS（提取后、本次有序预留完善前）；npm run build及protocol boundaries PASS。SQL集成库开启foreign_keys，提交全部受测旧表行后foreign_key_check为空，旧current/event均与真实目标SQL投影逐字段完全一致。仅内部转换验证，不是实际owner目标追加。

尚未完成：其他旧元数据/会话/筛选/回收/归档键等完整整图映射、逐deck来源版本与provenance默认去重、媒体补偿/原子追加、typed API/UI；T39仍NOT_RUN，S8.b IN_PROGRESS。S8.c/S8.d及S9尚未完成。生产604/真实用户库未触碰；原Windows拖拽根因仍未确认，不改质量门禁。

最近完整核验远端67b7f68f35588e92dfb616615b41fda6e03b8fa9/tree1ca419cd5c8b28fa45e2481ea9b4d4c5346ee983（794文件），CI40254871348仅首次in_progress。当前提交自身SHA由Git/远端解析；不为回填自身SHA再空提交。保存后连续推进，不等待/轮询CI。

# 恢复入口：S8.b完整整图映射、provenance及原子追加

继续Aides8Stack/GankSoft当前工作区、原分支feature/v075-unified-learning-workspace、Draft PR13→develop；不clone/init/reset/新分支或PR/强推/自动trusted审批/合并/发布。生产604不自动启用606，只在现有隔离合成owner控制域开发；真实用户库未操作。

S7 DONE；S8.a完整恢复开发准入DONE。0fd8f6595cfa1930ba543df72846587ece64318f/CI40249113081双平台/pr-gate PASS，Windows恢复UI7场景与1366/720中文图已真实逐图复核PASS，见docs/v075/S8-RESTORE-VALIDATION.json。恢复服务20/API4、协议21/139、UI7/设置5等继承，不重复全量。真实Win10/11、物理断电/最终便携同包仍S9 NOT_RUN。

S8.b已完成独立的只读scan5项、身份绑定6项和依赖选择6项：
- external-scan.ts捕获外部SQLite/WAL/媒体到私有固定候选，源→候选→源全baseline相等；分页deck摘要，同名不合并。sourceGeneration只是protocol-epoch，不伪称永久身份；snapshotDigest整库而非每deck版本。
- append-identities.ts按operationId隔离稳定UUID，native版本独立映射；旧current/event/cycle必须基于重映射后的旧事实经原函数派生，媒体缺失/冲突拒绝，不改不可变校验。
- append-selection.ts只读规划旧记忆→原题、历史证据归属、跨集关系/偏好、实际归档页面依赖；返回requiredDecks供明确预览/选取，不自动复制未选集、不丢FK或挂到目标同名对象。最终requireClosedAppendSelection从scan重新生成计划，不信任客户端预览标志。

来源图收集已本地完成6项/构建/边界：append-graph.ts在固定scan上读取已确认的所选集表行/JSON/媒体引用，未知表/学习前缀拒绝；保持原始历史与FSRS状态、不读写目标。graphDigest是选择范围摘要，尚不是逐deck provenance。append-json.ts的native版本/草稿/知识/回收/事件/会话及排期元数据typed转换已完成6+身份6=12项、构建/边界PASS；保留原始proof hash和FSRS数值，实际图片用CommonMark映射，局部optionId保留。未完成会话暂停，仅原排期CAS有效时绑定新hash，旧冲突不消失。首个未完成：完整旧表行/历史raw JSON及派生档案转换，生成每deck稳定来源版本及全面映射；随后实施独立新deck目标原子追加、重复默认跳过/用户强制新operationId、失败事务与媒体补偿、原数据不变/不跨库拼历史或FSRS重算的验证和typed API/UI。上述原语不代表T39已完成。后续S8.c活动目录迁移、S8.d回收站最终整合及T40–T42，S8整体准入后S9。

已核验源检查点d59cfe23105e2e4a97e73564f4696b5cbf664a4a/tree81d840d2a39940a4d4f271093d802aeda9bf5c40（本地23092fe等树），788文件一致，CI40251179477仅历史首次状态，当前最近已核验6d7af6d23d05d2d17cddfa3b087f06353f4a9ced（790文件/tree41c0a9005e89c27a6ec865dde8409f1200bfaed1），CI40252266384首次in_progress不等待。来源图收集已保存edc5392e0fce1b1186688d9b7d651bf7e388d11d（792文件/tree4e2d1732eb48093baade3bd075c961fdee825b02），CI40253641685首次in_progress。当前JSON转换源码/测试及恢复状态整体保存；当前提交自身SHA用Git/PR解析，不为回填自身SHA再做空洞提交。Git API保留最新tree/parent、expected_sha、force=false，独立fetch核对全部文件。额度/连接不足优先保存全部代码/测试/WIP和恢复记录；上传仍被拒绝则完整Git备份并独立恢复验证。

旧Windows列拖拽40207324786根因仍未确认，后续两个Windows质量Run通过仅实测回归结果；保留5秒/8像素/drop/重排断言及几何诊断，不虚称因果修复。详细测试看TEST_REPORT.md，阶段状态看TASK.json与S8-ACCEPTANCE.json，原设计/历史证据在既有Git和阶段文件。
