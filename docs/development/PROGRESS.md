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

# v0.7.5 当前进度

S0–S6及S7.a–e继承有效成果；S7.f实现及专项已完成，S7整体IN_PROGRESS（完整中文视觉准入未完成）；S8/S9 NOT_STARTED。

已保存并独立核验dff733d7a6eb02937643f4368a7180d6a8da2139/tree123e8fc9522b76683fe2e6e0785625275daf9a1e，CI40202042436两平台及pr-gate真实PASS。已实现设置/历史证据/焦点、原生窗口恢复、大树roots/children/路径按需加载、CAS完整结构保护和键盘tooltip。修复无头1×1 workArea造成的ASAR导航故障；完整Linux ASAR13组107项真实PASS。大树/Markdown业务27、协议21/135、大树UI7、原知识UI10、工作台17、设置5通过。

本检查点新增17状态×1366/720视觉采集34张、图谱根显示实际卡片集名的最小修复和断言；重建/采集PASS，errors/external空。Windows原生窗口4场景和设置/大树图片已有真实证据；完整17状态中文视觉尚需新Windows Artifact逐图审阅，当前Linux无CJK字体，不能虚报通过。

首个未完成及连续S8→S9条件见RECOVERY-NEXT.md。生产604保持不自动激活606；Win10/11人工及最终便携同包NOT_RUN。未新建分支/PR、强推、自动审批/合并/发布。
