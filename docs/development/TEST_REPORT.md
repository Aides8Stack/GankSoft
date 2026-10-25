## 34张Windows截图逐图审阅与修复

已真实核实075069628dbf1d21c83732cbf0108f0916e3fea3 / CI40203150728四个Job全PASS，原PR13仍Draft。下载Windows artifact12603046107并核验ZIP SHA256；34张图片均逐张查看，对照OPEN-ME-v3.7及设计规范。中文全部可读；24张未见操作遮挡，其余发现三处实际缺陷：单选圆点与正文脱离、练习复选框与标签脱离、大纲工具栏遮住标题/窄屏目录首行。逐图文件hash与原始发现见docs/v075/S7-VISUAL-REVIEW.json，不能把旧图改标全PASS。

最小修复仅为radio/checkbox宽度和内联排版、按实际换行工具栏高度给大纲正文/目录留位。构建/隔离构建、CI基础5和复验专项4场景/10图PASS；Space切换单选/复选、方向键评分、底部保存按钮滚动可达、首个目录/标题无遮挡、键盘中文tooltip均真实操作。10张本地修复图也逐张查看，布局已修复；Linux缺CJK字体，修复后的Windows图像尚待新CI获取，不冒充Windows复验完成。专项已加入原Windows质量入口，无删测试/放宽断言/新流程。

首个未完成：保存当前全部修复源码与测试后，取得新Windows报告s7f-recheck/10图逐张复核。其余24张未变画面与已通过业务/协议/ASAR继承。当前S7仍IN_PROGRESS，S8/S9未开始；原Gate满足后自动连续推进，不需要用户审图，不等待/轮询CI。

# S7.f 验证摘要

使用合成隔离606数据，生产604未变。当前视觉/名称补丁基于已保存dff733d7a6eb02937643f4368a7180d6a8da2139；原始日志、数据库和截图不进入源码。

| 范围 | 实际结果 |
| --- | --- |
| 基线CI | Run40202042436 / dff733d7a6eb02937643f4368a7180d6a8da2139，两平台/Scope/pr-gate全PASS |
| 业务相关回归 | tests/knowledge-layers-v075.test.ts + unified-knowledge-v075 + knowledge-markdown-store-v075 + knowledge-markdown-media-v075：27/27（新增大树4） |
| 协议 | check:protocol PASS21，边界/类型/导出135方法 |
| 窗口 | 单元3/3；Windows真实正常/最大化/还原/重启/移除屏幕/损坏配置4场景PASS（CI40200339283、40201510884） |
| 1×1桌面故障 | 已本地复现screen.workArea=1×1；无效尺寸回退后原失败knowledge-filter4/4 PASS，无force点击或放宽断言 |
| 当前完整Linux ASAR | PASS13组107项，完成标记7fd3555e-878d-4645-b351-e561100a212a，无删减/跳过 |
| 原知识Electron | PASS10，真实拖拽/撤销/正文/失败回执/重启/MD/图片/大纲 |
| 大树Electron | PASS7；2134节点、初始50roots、分层分页/定位/只读正文/冲突/全树CAS保全，含未保存模型搜索保全、1366/720与中文焦点提示 |
| 工作台/设置 | 工作台17、设置5有效PASS；原始历史证据单元3，CI基础5 |
| 最后构建 | npm run build、build:editor-spike PASS，协议边界PASS；新增视觉CI编排基础测试5/5 |
| 最后视觉专项 | tools/workspace-spike/visual-smoke.ts PASS17状态/34采集，真实三模式作答/揭示与导航，图谱根名称断言PASS，errors/external空 |
| 图片实际审阅 | Windows设置1366/720与大树/tooltip1366/720已看，中文可读、全屏/控件边界PASS；Linux其余17状态已看布局但缺中文字体，完整中文视觉BLOCKED，待新Windows图片逐图审阅 |
| Windows10/11人工及最终便携同包 | NOT_RUN；未Release、未生产激活 |

继承S0–S7.e的业务/编辑器/图片/交换等有效证据，不以本轮少量修复重跑全量。构建与共享资源Electron严格串行。截图产出不等于视觉通过，当前S7 Gate未完成；恢复步骤见RECOVERY-NEXT.md。
