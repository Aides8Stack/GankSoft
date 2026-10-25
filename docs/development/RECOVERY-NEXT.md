## 2026-10-26 恢复：Windows列拖拽门禁未解决

已核实9b1b16e3d0a68da6b091d022313639bb17b4a00c完整776文件保存；本地07a7c80树相等且无WIP。CI40207324786：Ubuntu/scope PASS，Windows/pr-gate FAIL。Windows121210985278的Artifact12604447465已下载校验。失败仅完整编辑器列拖拽指示线5秒等待；隔离适配拖拽、系统PNG及离线资源均PASS，ERR_INTERNET_DISCONNECTED是离线控制预期结果。不能将此记为随机故障或离线资源失败。相同1008×681长页面Linux实际鼠标专项PASS但未复现Windows根因；增加释放鼠标/截图前的目标、指示线、父元素和滚动坐标诊断，原5秒/8像素/drop/顺序断言保持。故障仍FAIL待Windows证据，不声称已修复。S7已有视觉准入证据有效；当前编辑器回归风险仍开放，S9不准放行。保存后不等CI，继续独立S8.a受控恢复。

# S7 DONE，恢复入口：S8.a 受控恢复切换

仓库Aides8Stack/GankSoft，唯一分支feature/v075-unified-learning-workspace，原Draft PR13→develop。继续原工作区，不重新克隆/初始化/新分支/PR，不强推、自动trusted审批/合并/发布。

S7准入已真实完成。0750696/CI40203150728的34张Windows原图全部逐张查看，发现radio、checkbox和大纲遮挡三处问题，最小修复保存581e6a7f594def19fa8fc00393d7ddd989551076/tree c089e7fc453dbf3f7f088ca23325b01f646714c6，与本地cca77f3完整树核验一致。CI40205235936两平台/scope/pr-gate全PASS；修复后Windows artifact12603867444的10张受影响图也逐张查看并PASS。不是凭截图生成成功放行。原图34和新图10的哈希/逐项结论见docs/v075/S7-VISUAL-REVIEW.json；原始FAIL事实保留，24张未变画面继承。

Space单选/复选、方向键评分、保存按钮滚动可达、动态工具栏换行留位、首个目录/标题点击、中文focus tooltip等Windows专项4场景PASS。继承仍有效的业务/协议/编辑器/图片/知识/工作台/ASAR证据，不重跑S0–S7。T33–T37已满足原S7 Gate。Windows Runner不等于Win10/11人工IME/物理图片/断电与最终便携同包，这些S9项仍NOT_RUN。

S8.a已完成独立的只读完整备份预检模块：previewFullBackup先捕获私有、512MB上限的ZIP副本，再复用stageBackup/全表媒体baseline校验，返回604/606摘要、稳定副本指纹和可复核候选；支持关闭/释放、候选被篡改拒绝、失败仅清理本次临时目录。604不推测统一三模式或升级活动库；原备份替换不改变已捕获快照。共享DTO在shared/storage/full-backup.ts，专项tests/full-backup-preview-v075.test.ts真实4/4 PASS，npm run build和边界PASS。没有接通公开恢复按钮或实际切换活动库，不能把预检当全流程恢复完成。

首个未完成：S8.a受控恢复切换（尚未实现）。已读原S8工作包和MIGRATION-ADR，已只读审计backup/stageBackup、baseline全表媒体指纹、写入租约/epoch/唯一active.json协调器及旧604恢复入口。复用底层一致快照/校验，不直接放开旧入口对606的拒绝，不创建可同时写入的第二套控制域。先预检/预览、当前完整恢复点、候选校验，再按唯一指针提交与恢复；失败/响应丢失不能重试覆盖。其后独立外库deck追加（全面ID映射，不合并历史或FSRS）、目录迁移和回收站T38–T42，再S9。详细计划在PLAN.md，S8子项与未完成T38–T42在docs/v075/S8-ACCEPTANCE.json。S8 IN_PROGRESS，S9 NOT_STARTED；不把已有stageBackup当完整S8已完成。

生产schema604不自动启用606；开发仍仅合成隔离606。每个独立功能立即保存源码/测试/配置和必要摘要，正常API以核实远端tree/parent、expected_sha、force=false保存并独立fetch核验，不等CI、不在检查点后结束连续授权。当前提交自身SHA由Git/PR实时解析，不为回填自身SHA追加空洞提交。只上传已检查非敏感开发内容；若上传受阻保留全部WIP及Git历史备份并独立恢复验证。

用户提示额度仅余22%，本轮在独立预检模块完成验证后优先保存所有源码/测试与恢复证据；下一次从受控切换开始，不重复S7或已通过预检专项。当前提交CI保存后首次记录，不等待或轮询。
