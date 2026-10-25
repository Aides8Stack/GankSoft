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
