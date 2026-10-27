# R3 — IN_PROGRESS

起点 c7a88c343e390a774a2e8ada8208020c6446d2d4；首个源码保存27d5080bfe69079eb7a3145e2979eed5adfc72e4已独立读回。原分支 / Draft PR #15。本轮仅R3，最终检查点按本文件Git历史及远端读回解析。

完成：冻结cardsScreen/cardDetailScreen/filterScreen结构与局部CSS；七列表格、分页、标题/类型搜索、明确标注的已加载排序、选择和详情返回；三模式当前内容/来源/知识点/真实历史与趋势、编辑和失败重读；条件组合/知识点确认取消/随机/时间/清除/每集条件恢复/队列预览；真实批量导出取消与落盘、移动、删除及原型式确认弹层。未改Schema606/FSRS/卡片内容协议，沿用媒体、草稿、历史、typed IPC；设置回收站的恢复工具栏保留原布局及守卫。

| 本轮验证 | 结果 | 证据 |
| --- | --- | --- |
| npm run build | PASS | 最终生产源码；类型/前后台编译，chunk提示保留 |
| node --experimental-strip-types --test --test-concurrency=1 tests/unified-workspace-v075.test.ts tests/unified-card-lifecycle-v075.test.ts tests/unified-history-evidence-v075.test.ts | PASS 14/14 | 分页/搜索边界、真实混合生命周期/历史/FSRS、历史证据；后端未改，不重复跑 |
| tools/validation/r3/pages.ts | PASS 8组 | evidence-delivery/interaction-main.json：30→60分页、详情返回选择、搜索类型/空态、组合筛选恢复/切集、保留未完成会话的真实删除失败、取消、真实导出/移动/删除、回收站/新进程持久化 |
| tools/validation/r3/extra.ts | PASS 5组 | evidence-delivery/interaction-extra.json：三模式正文、历史证据/编辑返回、确定性随机、空队列、已删除详情错误/重试/返回 |
| tools/validation/r3/recycle-smoke.ts | PASS 1组 | 设置内卡片/卡片集/知识点；恢复选择/按钮/布局与安全返回。恢复后端语义由上面生命周期测试覆盖 |
| R3_CAPTURE_ONLY=1 R3_EVIDENCE=evidence-delivery node --experimental-strip-types tools/validation/r3/pages.ts | PASS（仅采集） | 九张正式PNG/三宽计算快照；不冒充重跑功能用例 |
| python tools/validation/r3/compare.py | PASS 9组 | 三宽213px目录/无全局横溢出/标题y与高度、列表工具栏、详情指标、筛选面板与网格对应原型高度一致 |
| tools/validation/r3/study-smoke.ts | BLOCKED | 补充“混合三类型选择→精确三卡会话→返回保留选择”用例在Electron启动前SIGTRAP/inspector socket hang up；标准参数、隔离profile及npm runner均失败，已停止重试，不能标PASS |
| Windows/全量跨页 | NOT_RUN | 留R7/R8 |

当前R3布局已核查900列表、1366详情、1500筛选，并复核三页全宽几何；原型头部/工具栏高度恢复一致。修复了旧input/select的8px上边距、label/field-label多余边距和form阻止margin折叠导致的空白，以及标题/知识说明同行、详情旧边距覆盖。生产分页30/60行、真实正文会产生滚动条，相对原型少量演示数据产生15px可用宽度及1500居中7.5px差，不补假数据或固定高度。详情无历史时显示真空态；不复刻固定演示分数/曲线/知识掌握度。保留复盘续学入口会增加列表上方一行，属于已有真实业务功能。

接口边界明确：列表服务只支持标题/类型/身份游标，不伪造知识点全库搜索或全局排序；排序控件仅作用于已加载元数据并写明。知识点/状态/日期/表现/排序复用真实学习队列；该接口无mode参数，模式只过滤本次<=100候选并明确提示，不承诺按类型补齐全库结果。90天预设接口未支持，使用已有自定义日期，不硬传不支持值。以上可解释业务适配不等于新建后端能力。

R3仍IN_PROGRESS，原因是必要的选中混合学习UI补验尚BLOCKED，未宣布完整Gate通过。下一Work从study-smoke.ts和本报告继续：先恢复可稳定启动的正式Electron，仅补该用例及任何新发现真实失败；复用R0/R2缓存与本轮有效14领域/14UI/9截图，不重新审计/建夹具/跑无关全量。未进入R4。

失败证据：failures.json保留原生确认自动化失败、错误loading选择器/编辑返回文字选择器，以及旧回收站smoke启动失败；已修正者关联实际后续PASS。study-smoke.json保留当前启动阻塞；不上传原始系统路径/调试端点日志。早期PNG留本地，当前九PNG为有效交付；不上传历史大ZIP、数据库、导出临时ZIP、依赖或构建目录。

安全交付：源码、工具、合成截图、脱敏报告逐项审核；普通原分支API父链/base tree/force=false+expected_sha保存，提交后独立读回。无新分支/PR、强推、trust审批、合并或Release；保存后结束。
