# P0 正式 UI 基础

原型哈希8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015已核对。正式链路electron/main.ts→src/main.ts→UnifiedWorkspace.vue。提取原型绿色/灰阶token、8px按钮/11px面板、字体留白，按后续决定保留68px图标栏。复用原有导航保护，不切回604。


## 2026-10-27 完整复刻纠偏

补足顶栏面包屑、本集可见二级导航、导入导出入口；保留68px窄图标栏。校准原型容器、颜色、按钮、图标与响应断点。 按 full-fidelity-v3.7 规范执行。

## 2026-10-27 原版左栏恢复（第一轮 P0–P2）

基线 77c00a28d5368988afffa86a296bcad39bc096b7 + 本轮工作树。正式 UnifiedWorkspace 使用 213px 完整文字目录，品牌/学习总览/文件夹/卡片集名称与卡数/选中态/设置，删除重复功能图标列。新增 UnifiedCatalogBranch 按 folderId/cursor 读取真实 API，初层文件夹展开、深层按需读取，支持目录分页和错误重试。顶栏与集二级导航保留，首页不再显示空51px子导航。嵌套目录选择独立保存准确路径。

PASS：npm ci（381包、锁文件未改）；npm run build；正式生产 ui-v076.ts P0 三宽（1500/1366/900），逐宽 213px/不溢出/空白606；dashboard+workspace业务8/8。新增端到端 left-rail-v076.ts 覆盖真实目录写入/取消/草稿保护/进程重启，最终回执待后续检查点。Windows真实视觉与人工 NOT_RUN，P0 IN_PROGRESS。原型哈希保持冻结值。

## 本轮检查点：真实目录和首页复验

前序远端 f9b210ea5db0541daa3772abd9c28b908cd56524（与本地 efed918 的完整树相同）已读回导航源码。按冻结原型真实截图恢复首页51px空导航带，并补回右上专注模式（默认关闭）和本地用户设置入口；上一个检查点关于移除空带的决定被本次同屏核对纠正。

正式 left-rail-v076.ts：PASS 5场景，UI新建文件夹及嵌套卡片集→真实workspace.catalog.save/catalog，折叠/展开及精确路径/选中态；取消未保存目录不写数据；编辑器经侧栏返回保存真实草稿；三宽文字目录；退出并启动新Electron后目录、卡数、草稿仍在。确认对话框决策使用测试注入，非Windows原生对话框人工验收。此前模态背景拦截导致的错误测试动作已改为真实可操作的取消按钮；headless原生confirm不返回，按已有smoke方式注入确认决策。未修改产品确认流程或断言。

正式 ui-v076.ts P2：PASS 12场景（含P1空白/合成首页三宽、恢复真实会话及P2场景）；原型overview/deck/cards/cardDetail三宽12张采集PASS；build PASS；check:protocol PASS（21项/148方法）。原型颜色/左栏213px/品牌/标题正文边界与新截图已逐图检查；真实数字、空态、文件夹与导入/管理入口为业务映射，未复制演示数字。Windows视觉/Win10/11人工 NOT_RUN，阶段仍IN_PROGRESS。
