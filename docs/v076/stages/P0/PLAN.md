# P0 正式 UI 基础

原型哈希8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015已核对。正式链路electron/main.ts→src/main.ts→UnifiedWorkspace.vue。提取原型绿色/灰阶token、8px按钮/11px面板、字体留白，按后续决定保留68px图标栏。复用原有导航保护，不切回604。


## 2026-10-27 完整复刻纠偏

补足顶栏面包屑、本集可见二级导航、导入导出入口；保留68px窄图标栏。校准原型容器、颜色、按钮、图标与响应断点。 按 full-fidelity-v3.7 规范执行。

## 2026-10-27 原版左栏恢复（第一轮 P0–P2）

基线 77c00a28d5368988afffa86a296bcad39bc096b7 + 本轮工作树。正式 UnifiedWorkspace 使用 213px 完整文字目录，品牌/学习总览/文件夹/卡片集名称与卡数/选中态/设置，删除重复功能图标列。新增 UnifiedCatalogBranch 按 folderId/cursor 读取真实 API，初层文件夹展开、深层按需读取，支持目录分页和错误重试。顶栏与集二级导航保留，首页不再显示空51px子导航。嵌套目录选择独立保存准确路径。

PASS：npm ci（381包、锁文件未改）；npm run build；正式生产 ui-v076.ts P0 三宽（1500/1366/900），逐宽 213px/不溢出/空白606；dashboard+workspace业务8/8。新增端到端 left-rail-v076.ts 覆盖真实目录写入/取消/草稿保护/进程重启，最终回执待后续检查点。Windows真实视觉与人工 NOT_RUN，P0 IN_PROGRESS。原型哈希保持冻结值。
