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
