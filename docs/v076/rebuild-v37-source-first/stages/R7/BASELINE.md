# R7.1 基线与 R1 遗留核对

基线 ae6b338827d1e494bc3f6a9c7c745aae12f14239，干净检出；PR15 Draft → develop。Node24.22.1 / Electron44.9.1 / Linux；仅合成606数据。

| 链路 | 已核对实现与证据 |
| --- | --- |
| 正式启动 | package.json main → dist-electron/electron/main.js；electron/main.ts loadURL(gank-app://ui/index.html)；src/main.ts catalog.model=unified → UnifiedWorkspace.vue |
| 生产数据 | electron/main.ts prepareFreshUnified/createFullRestoreSession → gank:protocol；preload.cts 仅 gank.protocol；shared/protocol/client.ts typed client；真实 SQLite user_version606/integrity 检查由 b2Fixture 执行 |
| UI 挂载 | UnifiedWorkspace.vue 按页挂载 Home/DeckOverview/CardEditor/ReviewForm/Analytics/MindWorkspace/SystemSettings；ui-v076.css 引入 v37 样式；未见第二套侧栏实际挂载 |
| 图谱 | MindMapWorkspace.vue 使用 Mind Elixir 公开 init/layout；真实 .me-tpc 挂载，保留自动布局 |
| 可再生夹具 | tests/fixtures/ganksoft/b2.ts：两集、三节点、像素图、发布卡和真实历史；每轮独立 metadata，正常退出释放 writer.lock |
| 冻结原型 | docs/v075/reference/OPEN-ME-v3.7.html，SHA256 8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015，未修改 |

| R1 条目 | 分类 | 本轮结论 |
| --- | --- | --- |
| 单213px文字导航、顶栏、九项卡片集入口 | 已实现且本轮补证 | 正式Electron 900/1366/1500几何检查；无重复侧栏或横向溢出 |
| 卡片集跳转、列表查询/勾选隔离与设置返回 | 已实现且本轮补证 | 同一数据环境真实UI往返PASS |
| 草稿离页保存、发布版本保护、复盘暂停返回 | 已实现且本轮补证 | 草稿/发布/会话在新PID逐项精确读回PASS |
| 设置内卡片/卡片集/知识点回收站 | 已实现且本轮补证 | 主壳无独立回收入口，设置内三类可进入 |
| 公共CSS像素差异、全应用三宽和异常状态 | R7.3严格视觉 | NOT_RUN；本轮几何不等于严格视觉验收 |
| 确定产品缺陷 | 未发现 | 不为补验重构已完成模块 |

R0、R2–R6 tracker DONE继承；有效历史证据出处为各阶段 TEST_REPORT/ACCEPTANCE。R6 fec06b70b1c1cf54153e8b5b5031f5f090b5c985 的110领域/34正式Electron组、协议21/157方法及局部视觉；R5最终集成9组/媒体8组及字节保护未受修改，按原范围继承，不能充作R7全链路新证据。旧R1 shell.ts导航断言在图片资源新增前，R7专项采用当前九项完整顺序。R1保持IN_PROGRESS，R7整体IN_PROGRESS。
