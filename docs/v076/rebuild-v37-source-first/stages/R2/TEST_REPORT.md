# R2 验收与恢复 — IN_PROGRESS

起点：c4ba11802b9fe8fc84ca0789fa11d673c093ae87。首个远端增量：bf334b0de8350b8001627ac573bb7fc1dfa9914a，已独立读回。最终提交通过本文件Git历史解析，原分支 / Draft PR #15，不进入R3。

实现：UnifiedHome.vue、UnifiedDeckOverview.vue、UnifiedWorkspace.vue、ui-v076.css、v37/pages/overview.css。按冻结overview()/deckHome()迁移四指标、左右分栏、本集计划、四快捷、最近学习/卡片及概况；数据来自既有catalog/dashboard/analytics与typed IPC。支持嵌套集、分页读取、目录管理、真会话续学、无会话的新学习入口、空库/空集/未学习与可见错误重试；读取时清空旧指标、隔离过期响应。修复同页点击学习总览不刷新摘要/卡片集、首页嵌套路径丢失，以及错误时误报“待评估”。未改Schema606/FSRS/草稿保护；保留R1文字目录、设置内三类回收站。

| 验证 | 结果 | 证据 |
| --- | --- | --- |
| npm run build | PASS | 最终生产工作树；vue-tsc / Electron TS / Vite，既有chunk-size提示未改阈值 |
| node --experimental-strip-types --test --test-concurrency=1 tests/dashboard-v076.test.ts tests/unified-workspace-v075.test.ts tests/unified-analytics-catalog-v075.test.ts | PASS，13/13 | tests-summary.json；未改后端，此后仅UI增量 |
| R2_EVIDENCE=evidence-final node --experimental-strip-types tools/validation/r2/overview.ts | PASS，12/12 | evidence-final/manifest.json；真实production606，含5/242/53/18、86/24/28、切集、四入口、续学思路、R1八导航/内嵌回收站、最近记录、空集、删除错误/重试、新Electron进程读回、未学QA、独立空库 |
| 两页双版本三宽＋空库三宽 | 采集PASS，15 PNG | evidence-final；DPR1、同Electron与已核hash中文字体；截图不是视觉PASS |
| python tools/validation/r2/compare.py docs/v076/rebuild-v37-source-first/stages/R2/evidence-final | DIFFERENCES_RECORDED | diff.json，未设置宽松阈值冒充一致 |
| Windows / 全量跨页 / 最终严格视觉 | NOT_RUN | 留给R7/R8，不冒充本轮结果 |

视觉复核：已查看1500总览双轨、900本集双轨。三宽主区域宽度和213px侧栏一致；总览1500/1366分栏大小一致，页面垂直偏移约2px；900总览总高少约52.1px，主要是服务路径说明与原型主题描述换行差异。本集各宽度约2px偏移、概况高约10px差。原型列表文字居中、生产偏左；原型彩色/分模式图标与生产统一图标不同。原型76%演示掌握度/50与16示例分类不能用于真实业务，生产显示累计事件、近30天平均自评、今日完成、客观正确率；这是明确的业务适配，不能宣称数据/视觉完全一致。原型目录固定顺序/说明/演示徽标与服务排序/真实总数不同。最近条目仅投影真实同一批card元数据到原函数数组，DOM/CSS与函数未改；不存在空库原型分支，不伪造其空态截图。

R2保持IN_PROGRESS：功能与本轮专项通过，视觉仍有上述差异，未将阶段Gate改成PASS。下一Work从本文件、evidence-final/diff.json及overview.css继续R2差异收尾，先复用现有证据，仅重跑受影响项；不默认进入R3。无需重做R0/R1或重建索引/52状态映射。

早期失败状态、断言和截图哈希已保存于earlier-failures.json；旧PNG字节完整归档在本地earlier-evidence.zip（尚未上传）（SHA256 12896bad67ff1e5b1b4312da8ffa8509575098949e6494ab43b4d5da6bcc44ab）：含选择器错误、遗漏控制存储的测试缓存启动失败、旧样式和同页刷新失败截图；原失败状态保留。最后一次空库清理因未完成会话受到真实删除保护而被拒，随后改为独立空库验证，未绕过/削弱生产保护。公开归档仅移除本地路径/调试端点，未上传原始启动日志。测试缓存只在scratch，包含合成数据库，禁止提交。

当前15张有效PNG、快照和diff已提交33a68a3711050e64b4708ff9e7fcc24d2cfa3164；早期大归档上传未完成，未声称已交付其字节。本地归档未删除；失败状态与截图哈希另存远端。

安全交付：仅原创源码/测试工具、合成截图/脱敏元数据、报告/恢复记录。无数据库/凭据/依赖/构建产物；最终远端SHA、tree与关键文件须独立读回。CLI缺认证，使用已授权GitHub连接器base tree＋真实父提交＋force=false/expected_sha，未绕过审批。正常远端保存成功时不另交付完整bundle；若最终上传被拒则立即按用户流程bundle/ZIP并验证恢复。
