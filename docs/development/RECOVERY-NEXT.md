# 恢复入口：S8.b外库独立追加；并补验S8.a Windows恢复图像

## S8.a 预览/确认API与实际界面（2026-10-26）

已接通完整恢复的4个typed方法（open/cancel/confirm/status）和设置页的备份摘要、取消、独立全库替换确认、旧版转换确认及上次操作查询。专用restore-session仅对已有隔离606 control显式启用；确认方法不写旧业务DB的pending/成功回执，使用control持久确认hash/操作回执。确认后退役旧owner、按同control重开新连接并重建host，清空旧学习缓存后真实重载UI；响应丢失只能查询回执，不能自动覆盖重试。取消或过期确认不改变活动库，confirm完整payload/hash/请求ID/epoch绑定，重复并发与重启后回放不重复切换。增加保守剩余空间预检；own生成文件用r+ fsync兼容Windows写句柄要求。生产604/旧恢复入口未变。

验证：服务20+API4=24/24 PASS；协议21/边界/类型/导出139方法PASS，应用与隔离构建PASS，CI基础5/5；实际Electron恢复UI7场景PASS（文件取消、损坏拒绝、只读预览/确认隔离、离开清理、720布局、成功后真实reload+全表媒体事实一致+旧库保留、重载后操作查询），errors/external为空；原设置UI5回归PASS。新1366/720两张截图已实际看过，布局未见遮挡；Linux无CJK字体，不能宣称新恢复界面中文视觉PASS，须从新Windows CI取得两图复核。已接入原Windows质量链，无新工作流/超时上调/断言删减。

诊断提交1f6fee6的CI40247001997实际scope/Windows/Ubuntu/pr-gate全PASS；它没有复现旧40207324786的列拖拽失败，故只记本次回归通过、根因仍未确认，不虚称修复或随机故障。源服务检查点626ae46ac575fc395c970647f23bf1f7a08fa079已独立核验777文件，CI40247748859首次in_progress不等待。当前S8.a集成已本地闭环，Windows恢复UI/中文视觉待验，S8整体IN_PROGRESS，S9 NOT_STARTED；下一独立项S8.b外库只读扫描/独立deck追加规划，不跨库合并历史/FSRS。当前提交完整源码、测试、配置必须一起保存，不能仅保存文档。

唯一仓库/分支/PR：Aides8Stack/GankSoft、feature/v075-unified-learning-workspace、原Draft13→develop。继续当前工作区，不重新clone/init、新分支/PR、reset、强推、自动trusted审批/合并/发布。S7 DONE（Windows原34+修复10逐图复核证据有效），不重做S0–S7。所有真实Win10/11 IME/物理图片/断电/最终便携同包仍NOT_RUN，S9不能放行。

首个独立未实现：S8.b外库只读扫描与按deck完整关系的独立追加（T39）。原包明确全面source→dest身份映射，不跨库同卡历史拼接/FSRS重算；重复来源版本默认提示跳过，强制再追加用新的operationId。先核对已有schema/引用闭包、provenance和事务/媒体补偿，不重新设计已确定语义。其后目录迁移/回收站最终整合/T40–T42，S8完整准入后S9。

S8.a代码入口：electron/modules/storage-unified/restore-session.ts、migrations/coordinator.ts，shared/protocol/full-backup.ts是规范DTO；shared/storage保留兼容导出。前端UnifiedFullRestore挂在UnifiedSystemSettings，成功后reload旧页面状态。开发Electron宿主仅GANKSOFT_TEST_FULL_RESTORE=1使用新restore-session，606 control必须已激活，production main/openDatabase未启用606。恢复成功不等于自动生产迁移。新增专项tests/full-restore-protocol-v075.test.ts和tools/workspace-spike/restore-smoke.ts，原20项服务/7个真实进程退出证据继续有效。

接续核验当前源码提交的Windows storage-full-restore-ui-windows以及s8a-restore-1366/720图片：必须取得并实际逐张看中文与遮挡，不能凭文件生成PASS。不等待/循环查询CI，运行中继续独立S8.b。旧列拖拽5秒指示线故障未复现，保留现有几何诊断和风险，不提高超时/放宽8像素/drop/顺序断言。每个独立功能即保存全部源码、测试、配置和摘要，独立fetch核对全文件树；额度/连接不足先保存，上传仍被拒绝则完整Git备份并独立恢复验证。
