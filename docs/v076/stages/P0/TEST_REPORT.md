# P0 测试

基线c2548f84ed2afe55f4157c71b821ab34dae599a3加P0工作树；Linux / Node24.22.1 / Electron44.9.1。

- npm ci --no-audit --no-fund：PASS exit0，381包，锁文件未改。
- npm run build：PASS exit0。
- node --experimental-strip-types tools/validation/ui-v076.ts P0：PASS exit0；正式主进程空白606，1500/1366/900三宽，无横向溢出、68px导航、8px按钮、无页面错误。
- Linux截图仅辅助，环境无中文字体，不作为中文视觉证据。Windows中文、Win10/11人工：NOT_RUN。


## 2026-10-27 完整复刻纠偏

本轮 Linux / Node24.22.1 / Electron44.9.1：npm test 509/509 PASS（补近期卡片摘要前）；随后18项关联含原失败S1.b PASS；check:protocol 21项/147方法 PASS；build PASS；生产UI P2 12场景 PASS，21张实际1500/1366/900 PNG已验证尺寸；原型12张三宽截图PASS。旧workspace回归最终回执见下次补记，不把部分场景冒称整套通过。Windows正式视觉/Win10/11人工 NOT_RUN。

## 2026-10-27 原版左栏恢复（第一轮 P0–P2）

基线 77c00a28d5368988afffa86a296bcad39bc096b7 + 本轮工作树。正式 UnifiedWorkspace 使用 213px 完整文字目录，品牌/学习总览/文件夹/卡片集名称与卡数/选中态/设置，删除重复功能图标列。新增 UnifiedCatalogBranch 按 folderId/cursor 读取真实 API，初层文件夹展开、深层按需读取，支持目录分页和错误重试。顶栏与集二级导航保留，首页不再显示空51px子导航。嵌套目录选择独立保存准确路径。

PASS：npm ci（381包、锁文件未改）；npm run build；正式生产 ui-v076.ts P0 三宽（1500/1366/900），逐宽 213px/不溢出/空白606；dashboard+workspace业务8/8。新增端到端 left-rail-v076.ts 覆盖真实目录写入/取消/草稿保护/进程重启，最终回执待后续检查点。Windows真实视觉与人工 NOT_RUN，P0 IN_PROGRESS。原型哈希保持冻结值。
