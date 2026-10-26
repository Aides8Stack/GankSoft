# 恢复入口：S8.b完整对象图、JSON重映射及原子独立追加

继续Aides8Stack/GankSoft当前工作区、原分支feature/v075-unified-learning-workspace、Draft PR13→develop；不clone/init/reset/新分支或PR/强推/自动trusted审批/合并/发布。生产604不自动启用606，只在现有隔离合成owner控制域开发；真实用户库未操作。

S7 DONE；S8.a完整恢复开发准入DONE。0fd8f6595cfa1930ba543df72846587ece64318f/CI40249113081双平台/pr-gate PASS，Windows恢复UI7场景与1366/720中文图已真实逐图复核PASS，见docs/v075/S8-RESTORE-VALIDATION.json。恢复服务20/API4、协议21/139、UI7/设置5等继承，不重复全量。真实Win10/11、物理断电/最终便携同包仍S9 NOT_RUN。

S8.b已完成独立的只读scan5项、身份绑定6项和依赖选择6项：
- external-scan.ts捕获外部SQLite/WAL/媒体到私有固定候选，源→候选→源全baseline相等；分页deck摘要，同名不合并。sourceGeneration只是protocol-epoch，不伪称永久身份；snapshotDigest整库而非每deck版本。
- append-identities.ts按operationId隔离稳定UUID，native版本独立映射；旧current/event/cycle必须基于重映射后的旧事实经原函数派生，媒体缺失/冲突拒绝，不改不可变校验。
- append-selection.ts只读规划旧记忆→原题、历史证据归属、跨集关系/偏好、实际归档页面依赖；返回requiredDecks供明确预览/选取，不自动复制未选集、不丢FK或挂到目标同名对象。最终requireClosedAppendSelection从scan重新生成计划，不信任客户端预览标志。

首个未完成：收集已确认选择的完整表行/JSON对象/媒体闭包，派生旧身份、重映射native档案/草稿/事件快照/排期/知识/回收/会话/图片元数据，生成每deck稳定来源版本及全面映射；随后实施独立新deck目标原子追加、重复默认跳过/用户强制新operationId、失败事务与媒体补偿、原数据不变/不跨库拼历史或FSRS重算的验证和typed API/UI。上述原语不代表T39已完成。后续S8.c活动目录迁移、S8.d回收站最终整合及T40–T42，S8整体准入后S9。

已核验源检查点d59cfe23105e2e4a97e73564f4696b5cbf664a4a/tree81d840d2a39940a4d4f271093d802aeda9bf5c40（本地23092fe等树），788文件一致，CI40251179477首次in_progress不等待。当前依赖规划源码/测试及恢复状态整体保存；当前提交自身SHA用Git/PR解析，不为回填自身SHA再做空洞提交。Git API保留最新tree/parent、expected_sha、force=false，独立fetch核对全部文件。额度/连接不足优先保存全部代码/测试/WIP和恢复记录；上传仍被拒绝则完整Git备份并独立恢复验证。

旧Windows列拖拽40207324786根因仍未确认，后续两个Windows质量Run通过仅实测回归结果；保留5秒/8像素/drop/重排断言及几何诊断，不虚称因果修复。详细测试看TEST_REPORT.md，阶段状态看TASK.json与S8-ACCEPTANCE.json，原设计/历史证据在既有Git和阶段文件。
