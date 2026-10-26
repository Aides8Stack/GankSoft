## S8.a开发准入DONE；S8.b身份绑定（2026-10-26）

已取得0fd8f65/CI40249113081的Windows artifact12619689454，ZIP sha256核实，实际恢复专项7场景PASS且errors/external空，双平台/scope/pr-gate全PASS。1366、720两张恢复预览图已实际逐张查看，中文/摘要/确认复选框/恢复与取消按钮清晰且无遮挡、窄屏未横溢；证据与图像hash见S8-RESTORE-VALIDATION.json。S8.a自动化开发准入DONE/T38 PASS；不是截图生成成功即放行。Win10/11人工、真实断电与最终便携同包仍S9 NOT_RUN；S8整体IN_PROGRESS。

S8.b新增AppendIdentityMap：操作隔离的稳定UUID映射、显式类型域、反向冲突检查、独立文件命名（大小写不同源文件不在Windows相撞）、固定重试/强制独立再导入。旧current/event/cycle继续通过既有currentLegacyContent/legacyEvent/stableId生成派生身份，不用随机UUID替代，完整媒体映射缺失会拒绝，不更改不可变校验/触发器。6项专项、构建与边界PASS；测试使用完整604副本内的可回滚重映射读场景，FK保持开启，不虚称已完成追加事务。此模块只绑定ID、不复制/提交对象；完整选中deck图、JSON身份字段映射、来源去重和目标原子追加仍未实现。

前序外库只读扫描be6a01e8275b7e9558e0fb1a057e8823a236b737已独立核验785文件，CI40249928827首次queued不等待。下一入口仍S8.b完整对象闭包及原子独立追加，严禁跨库历史/FSRS合并或将无历史内容包当整库追加。旧40207324786列拖拽根因尚未确认，两次后续Windows质量通过仅继承实测结果，不冒充根因修复。生产604及真实用户数据未触碰。

## S8.b 外库只读扫描检查点（2026-10-26）

新增scanExternalDatabase：外部SQLite仅readOnly打开，原生backup捕获提交WAL到新私有候选，源目录不写备份临时文件；媒体复制后逐表/行/媒体完整baseline按源→候选→源核对，期间变化拒绝并仅清本次目录。支持604/606、实际卡片模式/版本/草稿/事件/知识/排期/会话计数、按稳定deckId最多100项分页；同名deck独立保留，604不猜三模式。捕获完成后源变化不污染固定候选，候选篡改拒绝复核，关闭幂等。sourceGeneration明确仅protocol-epoch，snapshotDigest是整库快照而非每deck版本，未把它冒充永久DB身份/provenance去重。

专项tests/external-scan-v075.test.ts5/5 PASS（真实主DB/WAL字节及全baseline不变、同名独立分页、604/未决操作、源捕获期间变化、候选媒体破坏、关闭/不合法路径），应用构建/边界PASS。仅内部只读服务，没有公开追加UI或目标库写入；独立追加的全面ID映射/所选对象闭包/媒体与历史完整性/来源重复识别和事务补偿均未完成，T39仍NOT_RUN完整验收。下一步先对照现有不可变版本/legacy投影约束设计并实测追加计划，再实施目标事务，不能把不含历史的内容包当完整追加。

前序S8.a完整API/界面检查点0fd8f6595cfa1930ba543df72846587ece64318f已核验782文件一致，原Draft PR13未变；CI40249113081首次in_progress，不等待/轮询。新Windows恢复UI及2张中文图片仍待实际验收。诊断源1f6fee6 CI40247001997双平台/pr-gate PASS，列拖拽旧失败未复现，根因尚未确认，不虚称修复。生产604/真实用户数据未操作，S8 IN_PROGRESS，S9 NOT_STARTED。

## S8.a 预览/确认API与实际界面（2026-10-26）

已接通完整恢复的4个typed方法（open/cancel/confirm/status）和设置页的备份摘要、取消、独立全库替换确认、旧版转换确认及上次操作查询。专用restore-session仅对已有隔离606 control显式启用；确认方法不写旧业务DB的pending/成功回执，使用control持久确认hash/操作回执。确认后退役旧owner、按同control重开新连接并重建host，清空旧学习缓存后真实重载UI；响应丢失只能查询回执，不能自动覆盖重试。取消或过期确认不改变活动库，confirm完整payload/hash/请求ID/epoch绑定，重复并发与重启后回放不重复切换。增加保守剩余空间预检；own生成文件用r+ fsync兼容Windows写句柄要求。生产604/旧恢复入口未变。

验证：服务20+API4=24/24 PASS；协议21/边界/类型/导出139方法PASS，应用与隔离构建PASS，CI基础5/5；实际Electron恢复UI7场景PASS（文件取消、损坏拒绝、只读预览/确认隔离、离开清理、720布局、成功后真实reload+全表媒体事实一致+旧库保留、重载后操作查询），errors/external为空；原设置UI5回归PASS。新1366/720两张截图已实际看过，布局未见遮挡；Linux无CJK字体，不能宣称新恢复界面中文视觉PASS，须从新Windows CI取得两图复核。已接入原Windows质量链，无新工作流/超时上调/断言删减。

诊断提交1f6fee6的CI40247001997实际scope/Windows/Ubuntu/pr-gate全PASS；它没有复现旧40207324786的列拖拽失败，故只记本次回归通过、根因仍未确认，不虚称修复或随机故障。源服务检查点626ae46ac575fc395c970647f23bf1f7a08fa079已独立核验777文件，CI40247748859首次in_progress不等待。当前S8.a集成已本地闭环，Windows恢复UI/中文视觉待验，S8整体IN_PROGRESS，S9 NOT_STARTED；下一独立项S8.b外库只读扫描/独立deck追加规划，不跨库合并历史/FSRS。当前提交完整源码、测试、配置必须一起保存，不能仅保存文档。

## S8.a 受控恢复服务检查点（2026-10-26）

已实现同一owner/control租约内的完整恢复服务：确认绑定preview/hash/epoch/revision/全库替换及604转换；冻结旧连接与SQLite写锁，先制作并复验当前全库恢复点，再stage候选/媒体/历史、落盘并以唯一active.json提交。新generation不创建第二控制域，旧目录保留拒写，新epoch拒绝旧窗口。操作回执位于control而非被替换的DB；提交前失败原库保持不变，提交后响应丢失只返回已提交状态，不覆盖重试；新目录损坏/缺失禁止回退。604转换只在已授权隔离606 owner候选进行，生产604和旧公开恢复入口未改。

tests/full-restore-v075.test.ts20/20 PASS（7个真实子进程中断点、提交前ENOSPC注入、响应丢失、当前恢复点重建比对、全表/媒体事实一致、连续恢复和旧回执、候选媒体破坏）；原迁移30+备份预检4相关回归PASS，npm run build/协议边界PASS。首次回归暴露未激活目录的错误码顺序变化，已修正后原断言全部通过。未删除/跳过/放宽测试。Windows本轮尚未复验，真实Win10/11仍NOT_RUN。

首个未完成：S8.a公开typed API/预览与确认UI/成功后重开连接/状态查询与取消。服务已实现不代表T38全流程DONE。随后T39外库独立追加、T40目录迁移、T41回收站、T42全阶段故障验收；S8 IN_PROGRESS，S9 NOT_STARTED。Windows列拖拽仍FAIL待诊断；诊断检查点1f6fee6f7786cf59025316070c337193914e5f27已完整取回比对，首次查询无Run，不等待。本提交自身SHA/CI从Git和GitHub实时解析。

## 2026-10-26 恢复：Windows列拖拽门禁未解决

已核实9b1b16e3d0a68da6b091d022313639bb17b4a00c完整776文件保存；本地07a7c80树相等且无WIP。CI40207324786：Ubuntu/scope PASS，Windows/pr-gate FAIL。Windows121210985278的Artifact12604447465已下载校验。失败仅完整编辑器列拖拽指示线5秒等待；隔离适配拖拽、系统PNG及离线资源均PASS，ERR_INTERNET_DISCONNECTED是离线控制预期结果。不能将此记为随机故障或离线资源失败。相同1008×681长页面Linux实际鼠标专项PASS但未复现Windows根因；增加释放鼠标/截图前的目标、指示线、父元素和滚动坐标诊断，原5秒/8像素/drop/顺序断言保持。故障仍FAIL待Windows证据，不声称已修复。S7已有视觉准入证据有效；当前编辑器回归风险仍开放，S9不准放行。保存后不等CI，继续独立S8.a受控恢复。

## S8.a 预检检查点

S7 DONE且无需用户人工审图。S8已完成只读完整备份预检模块、共享摘要DTO与4个专项，构建/协议边界PASS；源码/测试必须完整保存。覆盖私有ZIP副本、604/606全表/媒体一致、旧事实不伪造、原/活动库不改、损坏拒绝和临时目录清理。实际受控恢复切换/外库独立追加/路径迁移/回收站最终整合仍未完成，S8整体IN_PROGRESS，S9 NOT_STARTED。下一入口是租约/epoch/唯一指针协调恢复，不能直接放开旧604入口的606拒绝。详情S8-ACCEPTANCE.json与RECOVERY-NEXT.md。用户提示余量22%，当前优先保存完整源码、测试和必要记录。

## S7正式准入与S8连续推进

S7 DONE：Windows原34图逐张审阅，3处真实缺陷最小修复；581e6a7f594def19fa8fc00393d7ddd989551076/CI40205235936全PASS，Windows artifact12603867444修复后10图逐张复核PASS。专项4场景含真实键盘、滚动和遮挡检查。逐图哈希/历史FAIL/修复PASS见S7-VISUAL-REVIEW.json。其余有效测试继承，无重跑/删减/放宽门禁。S8.a开始，S9未开始；真实Win10/11人工及最终同包仍NOT_RUN。当前唯一恢复入口见RECOVERY-NEXT.md，旧段为历史事实，不再代表当前阶段。

## 34张Windows截图逐图审阅与修复

已真实核实075069628dbf1d21c83732cbf0108f0916e3fea3 / CI40203150728四个Job全PASS，原PR13仍Draft。下载Windows artifact12603046107并核验ZIP SHA256；34张图片均逐张查看，对照OPEN-ME-v3.7及设计规范。中文全部可读；24张未见操作遮挡，其余发现三处实际缺陷：单选圆点与正文脱离、练习复选框与标签脱离、大纲工具栏遮住标题/窄屏目录首行。逐图文件hash与原始发现见docs/v075/S7-VISUAL-REVIEW.json，不能把旧图改标全PASS。

最小修复仅为radio/checkbox宽度和内联排版、按实际换行工具栏高度给大纲正文/目录留位。构建/隔离构建、CI基础5和复验专项4场景/10图PASS；Space切换单选/复选、方向键评分、底部保存按钮滚动可达、首个目录/标题无遮挡、键盘中文tooltip均真实操作。10张本地修复图也逐张查看，布局已修复；Linux缺CJK字体，修复后的Windows图像尚待新CI获取，不冒充Windows复验完成。专项已加入原Windows质量入口，无删测试/放宽断言/新流程。

首个未完成：保存当前全部修复源码与测试后，取得新Windows报告s7f-recheck/10图逐张复核。其余24张未变画面与已通过业务/协议/ASAR继承。当前S7仍IN_PROGRESS，S8/S9未开始；原Gate满足后自动连续推进，不需要用户审图，不等待/轮询CI。

# 当前交接

唯一仓库Aides8Stack/GankSoft，分支feature/v075-unified-learning-workspace，原Draft PR13→develop。当前S7整体IN_PROGRESS，S8/S9 NOT_STARTED；恢复直接读RECOVERY-NEXT.md/TASK.json。S0–S7.e不重复。

dff733d7a6eb02937643f4368a7180d6a8da2139源码/测试/配置已核验完整树相等，CI40202042436全PASS。本地新增最后的34张主要页面宽窄采集专项及实际卡片集名称修复已构建/专项验证，必须与恢复文档一起完整保存，不能只提交文档。当前提交自身SHA从Git/PR实时解析。

首个未完成是新Windows Artifact的17状态/34截图实际中文视觉审阅；Linux无CJK字体，只能查布局，不能标全视觉PASS。Windows原生窗口4、设置5、大树7已真验；完整Linux ASAR13/107、相关业务27、协议21/135、知识UI10、工作台17有效通过。最后专项errors/external空。图片产出前S7 Gate仍未满足；不等待/轮询CI、不跨Gate先做S8危险写操作。准入后自动继续S8/S9，不逐阶段问授权。

正常API保存保留最新远端tree/parent、expected_sha、force=false；独立fetch比较全部文件/模式/代码树。本地/API元数据父链可不同，不reset/强推。仅上传已检查非敏感原创源码、测试、必要配置/文档/摘要；不上传用户库/令牌/私人文件/原始敏感日志。失败保留全部成果，仍被拒则完整备份并独立恢复验证。

生产604不自动启用606；Win10/11人工IME/物理图片和最终便携同包NOT_RUN，S9不能凭Linux/Runner伪造放行。不自动trusted审批、合并或发布。完整旧记录保留Git历史及此前已交付恢复包。
