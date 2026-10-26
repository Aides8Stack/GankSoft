## S8.b typed JSON身份转换（当前检查点）

新增AppendJsonMap：通过既有typed DTO转换native发布版本、单模式草稿/未发布草稿、知识正文/顺序/关联/策略/回收、native复盘事件/会话、排期元数据和已完成归档页。CommonMark只改实际图片，保留正文/代码字面值及卡内局部optionId，每处宽度独立；保留评分、时间、原始证明hash及FSRS数值，不重放或重算。未完成导入会话暂停；仅原frozen scheduleHash仍匹配来源当前状态时重算新身份的CAS hash，旧冲突仍保留冲突。显式cycle独立映射，legacy cycle需原既有派生规则可证明，不能猜unknown。

append-json专项6+身份回归6=12/12 PASS，应用构建/边界PASS。覆盖真实原生复盘/未完成和完成会话、后续排期改变的旧冲突、图片30/80、代码字面值、缺失媒体/草稿来源拒绝、知识/回收、原始proof哈希与数值不变。该模块仍是内部转换原语，不写目标、没有完整旧表行/legacy raw档案转换、逐deck provenance、媒体补偿/原子追加/API/UI；T39整体未验收。下一步完成这些剩余项，不把native JSON转换当完整追加。

最近已核验edc5392e0fce1b1186688d9b7d651bf7e388d11d/tree4e2d1732eb48093baade3bd075c961fdee825b02（792文件），CI40253641685仅首次in_progress。S7/S8.a DONE（真实Windows证据已存），S8.b IN_PROGRESS，S9 NOT_STARTED；生产604及真实用户库未触碰。

## S8.b来源对象图收集（当前检查点）

新增append-graph.ts及6项专项、应用构建/边界PASS。它仅在固定scan的已明确确认闭包上收集所选集的原始表行/typed-JSON封套/媒体引用：历史证据、旧档案专属图片、作答/未绑定图片、三模式全部版本、现有与新卡草稿、知识/关联/策略/回收/会话/排期。保留复盘JSON及FSRS原字节，不重放事件/不重算。所选集范围graphDigest不受无关全局设置影响；不复制未选集图片、全局偏好/凭据/IPC操作状态；未知表或未知学习元数据前缀明确拒绝，不静默丢弃。源/候选完整指纹保持不变。

此步仅内部数据收集；没有向目标写入，没有完整JSON重映射、逐deck provenance去重、媒体补偿/原子追加及UI。下一步实现typed JSON与表字段的身份转换，并保留旧版本派生/历史原始证据/草稿来源/当前FSRS CAS语义，再做完整目标事务和故障验证。T39整体仍未验收。最近已核验远端6d7af6d23d05d2d17cddfa3b087f06353f4a9ced/tree41c0a9005e89c27a6ec865dde8409f1200bfaed1（790文件），CI40252266384首次in_progress不等待。

# v0.7.5 当前进度

S0–S7继承有效成果，S7 DONE。S8.a完整恢复的owner服务、typed API、预览/独立确认/取消/操作查询、同control重开及页面真实reload已完成；源0fd8f6595cfa1930ba543df72846587ece64318f/CI40249113081双平台及pr-gate PASS，Windows7场景及1366/720中文图逐张实看PASS。完整证据docs/v075/S8-RESTORE-VALIDATION.json。真实Win10/11人工/断电/最终便携同包保留S9 NOT_RUN。

S8.b IN_PROGRESS：只读外库快照和分页清单5项、身份绑定6项、依赖选择规划6项分别PASS。选择规划明确旧记忆→原题、历史证据归属、跨集知识关系/偏好、实际完成复盘后移动产生的归档页依赖；只返回必须一并确认的来源集，不自动追加、不丢FK、不关联目标同名对象。最终确认必须从固定scan重新核验闭包，不能相信可变的预览标志。尚未实现完整对象图/JSON字段重映射、per-deck provenance去重、目标复制/媒体补偿/原子追加及UI；T39整体未验收。S8.c目录迁移、S8.d最终回收站及T40–T42后续未完成，S9 NOT_STARTED。

最新已核验远端d59cfe23105e2e4a97e73564f4696b5cbf664a4a（788文件/tree81d840d2a39940a4d4f271093d802aeda9bf5c40），CI40251179477首次in_progress，不等待。当前依赖规划源码/测试与记录待本检查点整体保存。旧Windows列拖拽40207324786的根因未确认；后续诊断源1f6fee6/CI40247001997及恢复集成0fd8f65/CI40249113081双平台成功，原5秒/8像素/drop/重排断言保留，不虚称因果修复。历史详细记录保留已有Git提交和阶段验收文件。
