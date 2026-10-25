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
