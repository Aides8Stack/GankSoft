## 当前检查点：S8.b旧档案转换（2026-10-26）

新增append-legacy.ts：声明的旧题/记忆/资产/事件/错因/证据/排期行身份转换，以及legacy-current和legacy-event不可变档案转换。复用原canonical投影纯函数；旧current档案使用自己捕获的材料/资产，不能补今日值；source原档案与投影矛盾拒绝。保留未知/部分历史、原始评分/时间/proof与FSRS数值。完整源ID集合可预留有序映射，保留SQL同sort_order/id及faults顺序；预留冲突不部分污染映射。

实际专项append-legacy4+append-identities7+append-json6=17/17 PASS；受纯函数提取影响的原migration-recovery30+原身份6=36/36 PASS（提取后、本次有序预留完善前）；npm run build及protocol boundaries PASS。SQL集成库开启foreign_keys，提交全部受测旧表行后foreign_key_check为空，旧current/event均与真实目标SQL投影逐字段完全一致。仅内部转换验证，不是实际owner目标追加。

尚未完成：其他旧元数据/会话/筛选/回收/归档键等完整整图映射、逐deck来源版本与provenance默认去重、媒体补偿/原子追加、typed API/UI；T39仍NOT_RUN，S8.b IN_PROGRESS。S8.c/S8.d及S9尚未完成。生产604/真实用户库未触碰；原Windows拖拽根因仍未确认，不改质量门禁。

最近完整核验远端67b7f68f35588e92dfb616615b41fda6e03b8fa9/tree1ca419cd5c8b28fa45e2481ea9b4d4c5346ee983（794文件），CI40254871348仅首次in_progress。当前提交自身SHA由Git/远端解析；不为回填自身SHA再空提交。保存后连续推进，不等待/轮询CI。

## S8.b typed JSON身份转换（当前检查点）

新增AppendJsonMap：通过既有typed DTO转换native发布版本、单模式草稿/未发布草稿、知识正文/顺序/关联/策略/回收、native复盘事件/会话、排期元数据和已完成归档页。CommonMark只改实际图片，保留正文/代码字面值及卡内局部optionId，每处宽度独立；保留评分、时间、原始证明hash及FSRS数值，不重放或重算。未完成导入会话暂停；仅原frozen scheduleHash仍匹配来源当前状态时重算新身份的CAS hash，旧冲突仍保留冲突。显式cycle独立映射，legacy cycle需原既有派生规则可证明，不能猜unknown。

append-json专项6+身份回归6=12/12 PASS，应用构建/边界PASS。覆盖真实原生复盘/未完成和完成会话、后续排期改变的旧冲突、图片30/80、代码字面值、缺失媒体/草稿来源拒绝、知识/回收、原始proof哈希与数值不变。该模块仍是内部转换原语，不写目标、没有完整旧表行/legacy raw档案转换、逐deck provenance、媒体补偿/原子追加/API/UI；T39整体未验收。下一步完成这些剩余项，不把native JSON转换当完整追加。

最近已核验edc5392e0fce1b1186688d9b7d651bf7e388d11d/tree4e2d1732eb48093baade3bd075c961fdee825b02（792文件），CI40253641685仅首次in_progress。S7/S8.a DONE（真实Windows证据已存），S8.b IN_PROGRESS，S9 NOT_STARTED；生产604及真实用户库未触碰。

## S8.b来源对象图收集（当前检查点）

新增append-graph.ts及6项专项、应用构建/边界PASS。它仅在固定scan的已明确确认闭包上收集所选集的原始表行/typed-JSON封套/媒体引用：历史证据、旧档案专属图片、作答/未绑定图片、三模式全部版本、现有与新卡草稿、知识/关联/策略/回收/会话/排期。保留复盘JSON及FSRS原字节，不重放事件/不重算。所选集范围graphDigest不受无关全局设置影响；不复制未选集图片、全局偏好/凭据/IPC操作状态；未知表或未知学习元数据前缀明确拒绝，不静默丢弃。源/候选完整指纹保持不变。

此步仅内部数据收集；没有向目标写入，没有完整JSON重映射、逐deck provenance去重、媒体补偿/原子追加及UI。下一步实现typed JSON与表字段的身份转换，并保留旧版本派生/历史原始证据/草稿来源/当前FSRS CAS语义，再做完整目标事务和故障验证。T39整体仍未验收。最近已核验远端6d7af6d23d05d2d17cddfa3b087f06353f4a9ced/tree41c0a9005e89c27a6ec865dde8409f1200bfaed1（790文件），CI40252266384首次in_progress不等待。

# 当前验证记录

全部数据为隔离合成夹具；生产604及真实用户库未触碰。测试未删除、跳过或放宽超时/断言。

| 范围 | 实际证据 |
| --- | --- |
| 本检查点依赖选择 | node --experimental-strip-types --test tests/append-selection-v075.test.ts：6/6 PASS；含真实完成复盘后移动归档页、旧记忆FK、历史deck、跨集知识/偏好、闭包循环/部分选择/固定快照/错误输入 |
| 本检查点构建/边界 | npm run build、node tools/protocol/check-boundaries.mjs PASS |
| 外库只读scan | tests/external-scan-v075.test.ts5/5 PASS：WAL/DB字节、全表媒体指纹、同名分页、604不猜模式、源变化/候选破坏/清理；be6a01e保存 |
| 身份绑定 | tests/append-identities-v075.test.ts6/6 PASS：稳定操作命名域、独立再导入、大小写文件不碰撞、旧版本/事件/cycle既有派生规则、媒体不完整拒绝；d59cfe2保存 |
| S8.a服务/API | full-restore20+full-restore-protocol4 PASS；7个真实子进程中断点、ENOSPC注入、响应丢失、旧owner拒写、候选损坏不回退、并发重复/重启回放、过期确认；迁移30+预检4相关回归PASS |
| S8.a协议/构建 | 协议21、边界/类型/导出139方法，应用/隔离构建、CI基础5 PASS |
| S8.a实际UI | Electron7恢复场景+原设置5回归PASS；实际reload后全部备份事实/媒体一致、旧库留存、control回执查询；errors/external空 |
| S8.a Windows | 0fd8f6595cfa1930ba543df72846587ece64318f/CI40249113081双平台/scope/pr-gate PASS，Windows恢复专项7 PASS；artifact12619689454及2张1366/720截图已下载校验并逐张查看中文/控件/布局PASS，见S8-RESTORE-VALIDATION.json |
| 待验收 | T39实际追加、ID/JSON完整图写入、provenance去重/强制再导入、T40迁移/T41回收/T42后续矩阵均未完成，不能由前述只读/原语测试代替 |
| Win10/11真实人工/断电/最终便携同包 | NOT_RUN；S9未开始，无Release/生产激活 |

旧40207324786 Windows完整编辑器列拖拽指示线超时FAIL的原因未确认；隔离适配拖拽/系统PNG/离线资源PASS，ERR_INTERNET_DISCONNECTED是离线控制预期。保留释放鼠标/截图前几何诊断，5秒/8像素/drop/顺序断言未变。后续1f6fee6/CI40247001997和0fd8f65/CI40249113081均成功，没有复现原故障；不得据此虚称根因已修复或随机故障。S0–S7已有有效业务/协议/编辑器/ASAR/44张Windows实看证据继承，历史精确记录在阶段JSON及已有Git提交。最新d59cfe2 CI40251179477仅首次in_progress，不等待/轮询。
