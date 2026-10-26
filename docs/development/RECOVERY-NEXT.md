# 恢复入口：S8.b独立追加对象闭包/全面ID映射与事务

## S8.b 外库只读扫描检查点（2026-10-26）

新增scanExternalDatabase：外部SQLite仅readOnly打开，原生backup捕获提交WAL到新私有候选，源目录不写备份临时文件；媒体复制后逐表/行/媒体完整baseline按源→候选→源核对，期间变化拒绝并仅清本次目录。支持604/606、实际卡片模式/版本/草稿/事件/知识/排期/会话计数、按稳定deckId最多100项分页；同名deck独立保留，604不猜三模式。捕获完成后源变化不污染固定候选，候选篡改拒绝复核，关闭幂等。sourceGeneration明确仅protocol-epoch，snapshotDigest是整库快照而非每deck版本，未把它冒充永久DB身份/provenance去重。

专项tests/external-scan-v075.test.ts5/5 PASS（真实主DB/WAL字节及全baseline不变、同名独立分页、604/未决操作、源捕获期间变化、候选媒体破坏、关闭/不合法路径），应用构建/边界PASS。仅内部只读服务，没有公开追加UI或目标库写入；独立追加的全面ID映射/所选对象闭包/媒体与历史完整性/来源重复识别和事务补偿均未完成，T39仍NOT_RUN完整验收。下一步先对照现有不可变版本/legacy投影约束设计并实测追加计划，再实施目标事务，不能把不含历史的内容包当完整追加。

前序S8.a完整API/界面检查点0fd8f6595cfa1930ba543df72846587ece64318f已核验782文件一致，原Draft PR13未变；CI40249113081首次in_progress，不等待/轮询。新Windows恢复UI及2张中文图片仍待实际验收。诊断源1f6fee6 CI40247001997双平台/pr-gate PASS，列拖拽旧失败未复现，根因尚未确认，不虚称修复。生产604/真实用户数据未操作，S8 IN_PROGRESS，S9 NOT_STARTED。

唯一仓库/分支/PR：Aides8Stack/GankSoft、feature/v075-unified-learning-workspace、原Draft13→develop。继续当前工作区，不重新clone/init、新分支/PR、reset、强推、自动trusted审批/合并/发布。S7 DONE（Windows原34+修复10逐图复核证据有效），不重做S0–S7。所有真实Win10/11 IME/物理图片/断电/最终便携同包仍NOT_RUN，S9不能放行。

首个独立未实现：S8.b外库只读扫描与按deck完整关系的独立追加（T39）。原包明确全面source→dest身份映射，不跨库同卡历史拼接/FSRS重算；重复来源版本默认提示跳过，强制再追加用新的operationId。先核对已有schema/引用闭包、provenance和事务/媒体补偿，不重新设计已确定语义。其后目录迁移/回收站最终整合/T40–T42，S8完整准入后S9。

S8.a代码入口：electron/modules/storage-unified/restore-session.ts、migrations/coordinator.ts，shared/protocol/full-backup.ts是规范DTO；shared/storage保留兼容导出。前端UnifiedFullRestore挂在UnifiedSystemSettings，成功后reload旧页面状态。开发Electron宿主仅GANKSOFT_TEST_FULL_RESTORE=1使用新restore-session，606 control必须已激活，production main/openDatabase未启用606。恢复成功不等于自动生产迁移。新增专项tests/full-restore-protocol-v075.test.ts和tools/workspace-spike/restore-smoke.ts，原20项服务/7个真实进程退出证据继续有效。

接续核验当前源码提交的Windows storage-full-restore-ui-windows以及s8a-restore-1366/720图片：必须取得并实际逐张看中文与遮挡，不能凭文件生成PASS。不等待/循环查询CI，运行中继续独立S8.b。旧列拖拽5秒指示线故障未复现，保留现有几何诊断和风险，不提高超时/放宽8像素/drop/顺序断言。每个独立功能即保存全部源码、测试、配置和摘要，独立fetch核对全文件树；额度/连接不足先保存，上传仍被拒绝则完整Git备份并独立恢复验证。
