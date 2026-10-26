## S8.b typed JSON身份转换（当前检查点）

新增AppendJsonMap：通过既有typed DTO转换native发布版本、单模式草稿/未发布草稿、知识正文/顺序/关联/策略/回收、native复盘事件/会话、排期元数据和已完成归档页。CommonMark只改实际图片，保留正文/代码字面值及卡内局部optionId，每处宽度独立；保留评分、时间、原始证明hash及FSRS数值，不重放或重算。未完成导入会话暂停；仅原frozen scheduleHash仍匹配来源当前状态时重算新身份的CAS hash，旧冲突仍保留冲突。显式cycle独立映射，legacy cycle需原既有派生规则可证明，不能猜unknown。

append-json专项6+身份回归6=12/12 PASS，应用构建/边界PASS。覆盖真实原生复盘/未完成和完成会话、后续排期改变的旧冲突、图片30/80、代码字面值、缺失媒体/草稿来源拒绝、知识/回收、原始proof哈希与数值不变。该模块仍是内部转换原语，不写目标、没有完整旧表行/legacy raw档案转换、逐deck provenance、媒体补偿/原子追加/API/UI；T39整体未验收。下一步完成这些剩余项，不把native JSON转换当完整追加。

最近已核验edc5392e0fce1b1186688d9b7d651bf7e388d11d/tree4e2d1732eb48093baade3bd075c961fdee825b02（792文件），CI40253641685仅首次in_progress。S7/S8.a DONE（真实Windows证据已存），S8.b IN_PROGRESS，S9 NOT_STARTED；生产604及真实用户库未触碰。

## S8.b来源对象图收集（当前检查点）

新增append-graph.ts及6项专项、应用构建/边界PASS。它仅在固定scan的已明确确认闭包上收集所选集的原始表行/typed-JSON封套/媒体引用：历史证据、旧档案专属图片、作答/未绑定图片、三模式全部版本、现有与新卡草稿、知识/关联/策略/回收/会话/排期。保留复盘JSON及FSRS原字节，不重放事件/不重算。所选集范围graphDigest不受无关全局设置影响；不复制未选集图片、全局偏好/凭据/IPC操作状态；未知表或未知学习元数据前缀明确拒绝，不静默丢弃。源/候选完整指纹保持不变。

此步仅内部数据收集；没有向目标写入，没有完整JSON重映射、逐deck provenance去重、媒体补偿/原子追加及UI。下一步实现typed JSON与表字段的身份转换，并保留旧版本派生/历史原始证据/草稿来源/当前FSRS CAS语义，再做完整目标事务和故障验证。T39整体仍未验收。最近已核验远端6d7af6d23d05d2d17cddfa3b087f06353f4a9ced/tree41c0a9005e89c27a6ec865dde8409f1200bfaed1（790文件），CI40252266384首次in_progress不等待。

# GankSoft v0.7.5 交接

唯一仓库Aides8Stack/GankSoft、分支feature/v075-unified-learning-workspace、原Draft PR13→develop。继续现有工作区，不clone/init/reset/新分支/新PR，不强推、自动trusted审批/合并/发布。生产schema604不自动启用606，代码只通过已有隔离合成606 control验证，不操作真实用户库。AGENTS.md、STANDARDS.md及原工作包仍适用。

当前S7 DONE，S8.a DONE（0fd8f65/CI40249113081、Windows7场景和实看2图，见S8-RESTORE-VALIDATION.json），S8.b IN_PROGRESS，S9 NOT_STARTED。下一入口见RECOVERY-NEXT.md：已完成scan/身份绑定/依赖规划；尚无完整目标追加。依赖规划6项覆盖真实复盘完成→移动→归档页的跨集约束，不能静默丢历史或自动导入未选集。

源码检查点d59cfe23105e2e4a97e73564f4696b5cbf664a4a/tree81d840d2a39940a4d4f271093d802aeda9bf5c40与本地23092fe等树，788文件完全一致，CI40251179477首次运行中。当前新增append-selection.ts/专项6已构建/边界验证并待整体保存。Git API保存以实际最新远端tree/parent为基、expected_sha和force=false；上传前仅审本次diff敏感信息，逐项确认源码/测试/配置/必要摘要，独立fetch对全部路径/模式/blob和内容比对。当前提交自身SHA由Git/PR解析，禁止为回填自身SHA无限提交。

完整恢复成功后旧owner退休，不能继续用旧DB写成功回执；必须关旧连接再按同control重开/重建host。RESTORE_COMMITTED是已提交而非回滚，控制目录status可核对原操作，不自动重复覆盖。活动指针唯一；旧数据目录保留拒写；新目录失联/损坏不能退回旧库。外库追加独立新deck及全面身份映射，不跨库拼历史或重算FSRS。强制重复追加用新operationId。Windows人工及最终同包NOT_RUN，旧列拖拽根因仍开放，详见TEST_REPORT.md。

每个独立功能及时保存源码与测试，不等待/轮询CI，保存后继续授权阶段。额度/连接不足立即停新增并保存；正常上传仍被拒绝时保留全部WIP+Git历史完整备份并独立恢复验证。旧恢复ZIP早于本轮源代码，不可声称包含新成果。历史详细交接在Git既有提交，阶段JSON验收文件未删。
