# 恢复入口：S8.b选中deck闭包/JSON身份映射及原子独立追加

## S8.a开发准入DONE；S8.b身份绑定（2026-10-26）

已取得0fd8f65/CI40249113081的Windows artifact12619689454，ZIP sha256核实，实际恢复专项7场景PASS且errors/external空，双平台/scope/pr-gate全PASS。1366、720两张恢复预览图已实际逐张查看，中文/摘要/确认复选框/恢复与取消按钮清晰且无遮挡、窄屏未横溢；证据与图像hash见S8-RESTORE-VALIDATION.json。S8.a自动化开发准入DONE/T38 PASS；不是截图生成成功即放行。Win10/11人工、真实断电与最终便携同包仍S9 NOT_RUN；S8整体IN_PROGRESS。

S8.b新增AppendIdentityMap：操作隔离的稳定UUID映射、显式类型域、反向冲突检查、独立文件命名（大小写不同源文件不在Windows相撞）、固定重试/强制独立再导入。旧current/event/cycle继续通过既有currentLegacyContent/legacyEvent/stableId生成派生身份，不用随机UUID替代，完整媒体映射缺失会拒绝，不更改不可变校验/触发器。6项专项、构建与边界PASS；测试使用完整604副本内的可回滚重映射读场景，FK保持开启，不虚称已完成追加事务。此模块只绑定ID、不复制/提交对象；完整选中deck图、JSON身份字段映射、来源去重和目标原子追加仍未实现。

前序外库只读扫描be6a01e8275b7e9558e0fb1a057e8823a236b737已独立核验785文件，CI40249928827首次queued不等待。下一入口仍S8.b完整对象闭包及原子独立追加，严禁跨库历史/FSRS合并或将无历史内容包当整库追加。旧40207324786列拖拽根因尚未确认，两次后续Windows质量通过仅继承实测结果，不冒充根因修复。生产604及真实用户数据未触碰。

唯一仓库/分支/PR：Aides8Stack/GankSoft、feature/v075-unified-learning-workspace、原Draft13→develop。继续当前工作区，不重新clone/init、新分支/PR、reset、强推、自动trusted审批/合并/发布。S7 DONE（Windows原34+修复10逐图复核证据有效），不重做S0–S7。所有真实Win10/11 IME/物理图片/断电/最终便携同包仍NOT_RUN，S9不能放行。

首个独立未实现：S8.b外库只读扫描与按deck完整关系的独立追加（T39）。原包明确全面source→dest身份映射，不跨库同卡历史拼接/FSRS重算；重复来源版本默认提示跳过，强制再追加用新的operationId。先核对已有schema/引用闭包、provenance和事务/媒体补偿，不重新设计已确定语义。其后目录迁移/回收站最终整合/T40–T42，S8完整准入后S9。

S8.a代码入口：electron/modules/storage-unified/restore-session.ts、migrations/coordinator.ts，shared/protocol/full-backup.ts是规范DTO；shared/storage保留兼容导出。前端UnifiedFullRestore挂在UnifiedSystemSettings，成功后reload旧页面状态。开发Electron宿主仅GANKSOFT_TEST_FULL_RESTORE=1使用新restore-session，606 control必须已激活，production main/openDatabase未启用606。恢复成功不等于自动生产迁移。新增专项tests/full-restore-protocol-v075.test.ts和tools/workspace-spike/restore-smoke.ts，原20项服务/7个真实进程退出证据继续有效。

S8.a原0fd8f65/CI40249113081已取得Windows恢复专项与2图真实复核PASS，见S8-RESTORE-VALIDATION.json；当前已完成结果直接继承，不重复。继续S8.b，不等待/循环查询新CI。旧列拖拽5秒指示线故障未复现，保留现有几何诊断和风险，不提高超时/放宽8像素/drop/顺序断言。每个独立功能即保存全部源码、测试、配置和摘要，独立fetch核对全文件树；额度/连接不足先保存，上传仍被拒绝则完整Git备份并独立恢复验证。
