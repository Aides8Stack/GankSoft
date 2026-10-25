## 34张Windows截图逐图审阅与修复

已真实核实075069628dbf1d21c83732cbf0108f0916e3fea3 / CI40203150728四个Job全PASS，原PR13仍Draft。下载Windows artifact12603046107并核验ZIP SHA256；34张图片均逐张查看，对照OPEN-ME-v3.7及设计规范。中文全部可读；24张未见操作遮挡，其余发现三处实际缺陷：单选圆点与正文脱离、练习复选框与标签脱离、大纲工具栏遮住标题/窄屏目录首行。逐图文件hash与原始发现见docs/v075/S7-VISUAL-REVIEW.json，不能把旧图改标全PASS。

最小修复仅为radio/checkbox宽度和内联排版、按实际换行工具栏高度给大纲正文/目录留位。构建/隔离构建、CI基础5和复验专项4场景/10图PASS；Space切换单选/复选、方向键评分、底部保存按钮滚动可达、首个目录/标题无遮挡、键盘中文tooltip均真实操作。10张本地修复图也逐张查看，布局已修复；Linux缺CJK字体，修复后的Windows图像尚待新CI获取，不冒充Windows复验完成。专项已加入原Windows质量入口，无删测试/放宽断言/新流程。

首个未完成：保存当前全部修复源码与测试后，取得新Windows报告s7f-recheck/10图逐张复核。其余24张未变画面与已通过业务/协议/ASAR继承。当前S7仍IN_PROGRESS，S8/S9未开始；原Gate满足后自动连续推进，不需要用户审图，不等待/轮询CI。

# v0.7.5 当前进度

S0–S6及S7.a–e继承有效成果；S7.f实现及专项已完成，S7整体IN_PROGRESS（完整中文视觉准入未完成）；S8/S9 NOT_STARTED。

已保存并独立核验dff733d7a6eb02937643f4368a7180d6a8da2139/tree123e8fc9522b76683fe2e6e0785625275daf9a1e，CI40202042436两平台及pr-gate真实PASS。已实现设置/历史证据/焦点、原生窗口恢复、大树roots/children/路径按需加载、CAS完整结构保护和键盘tooltip。修复无头1×1 workArea造成的ASAR导航故障；完整Linux ASAR13组107项真实PASS。大树/Markdown业务27、协议21/135、大树UI7、原知识UI10、工作台17、设置5通过。

本检查点新增17状态×1366/720视觉采集34张、图谱根显示实际卡片集名的最小修复和断言；重建/采集PASS，errors/external空。Windows原生窗口4场景和设置/大树图片已有真实证据；完整17状态中文视觉尚需新Windows Artifact逐图审阅，当前Linux无CJK字体，不能虚报通过。

首个未完成及连续S8→S9条件见RECOVERY-NEXT.md。生产604保持不自动激活606；Win10/11人工及最终便携同包NOT_RUN。未新建分支/PR、强推、自动审批/合并/发布。
