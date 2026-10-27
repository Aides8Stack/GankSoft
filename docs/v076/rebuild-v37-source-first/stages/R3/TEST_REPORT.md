# 2026-10-28 R3 最终补验 — DONE

基线 c43d796019200ca79f262c81fc8ab3653e9b1de7；仅R3，未进入R4。用户已授权缺失缓存时一次性重建隔离合成夹具。原缓存不存在，复用createR0Fixture，仅增加可选固定时间参数（默认行为不变），242卡真实606夹具生成一次；UUID仍由真实后端分配，fixture.json记录实际ID，不承诺跨次重建字节或UUID相同。

本轮PASS：生产build（本地缺构建产物，依赖复用未重装）；prepare-fixture元数据/卡片ID/类型/数据库完整性核验；正式Electron三种类型选中学习、exactCardIds仅三卡会话、首卡类型、返回列表保留三个勾选；退出Electron后以只读SQLite连接核验持久化会话ids长度3/去重3/精确集合、entry ID、各卡所属集及question/qa/direct类型，PRAGMA user_version=606。study-smoke.json为本次实际PASS，旧启动/缓存阻塞见保留的study-smoke-recovery.json和Git历史。

复现（仓库根目录，Node24+与现有依赖）：
```bash
npm run build
node --experimental-strip-types tools/validation/r3/prepare-fixture.ts
node --experimental-strip-types tools/validation/r3/study-smoke.ts
```
prepare-fixture复用既有R0生成工具及冻结配置at=2026-10-28T04:00:00.000Z；有缓存时仅恢复缓存，不重复生成。正常生成及恢复均使用tmp下gank-r0-matched隔离目录。数据库由owned606控制目录active.json指向synthetic606-control606/target；首次额外SQLite校验误指向source目录而失败，已修正为真实target并完整复验上述唯一用例PASS。未改正式源码、Schema606、FSRS或协议。

继承14项业务、14组Electron及9组视觉证据；不重跑旧测试、不拍新截图、不上传数据库缓存。R3无新增阻断，标DONE；R7/R8继续负责Windows及全量验收。源码、重建工具、最小元数据与报告进入原分支/PR15。下一阶段入口R4，本轮明确不执行；不等待CI、不合并、不发布。当前检查点完整SHA以远端独立读回为准。

---

# 2026-10-28 R3 最小补验 — IN_PROGRESS

恢复基线 `a6b6f48bbeffa20b33e315daa989cc249e9a8692`，原分支 / Draft PR #15。仅R3；未进入R4。

- 本轮正式补验 BLOCKED：`node --experimental-strip-types tools/validation/r3/study-smoke.ts` 退出1，顶层读取 `validation-results/r2-seed-v2/fixture.json` 报ENOENT，尚未执行electron.launch。可访问的工作区、临时目录及root目录未找到该缓存或gank-r0-matched合成数据库。用户明确禁止重建夹具，因此停止，不访问真实用户库。
- 启动专项诊断两次PASS：Node 24.22.1、Electron 44.9.1、playwright-core；最小临时Electron应用复用pages.ts/extra.ts四个headless参数，分别无profile和独立profile，均完成launch、firstWindow及h1读取。仅证明当前最小Electron进程和调试连接可用；不等于正式应用启动或三卡会话PASS，旧SIGTRAP根因仍NOT_DETERMINED。没有证据支持修改正式源码或现有启动器。
- 继承基线已有build、14领域测试、14组Electron及9组布局证据；本轮未重跑、未重拍。旧study-smoke.json和失败证据保持原样；本轮另存study-smoke-recovery.json。
- 只读核对workspaceSessionSummaries：exactCardIds在SQLite study_sessions.payload.ids上检查长度和集合范围；正式UI选择/实际会话/返回选择及Schema606一致性尚未执行，不能据此标PASS。
- 下一步必须先恢复原合成缓存（fixture.json及匹配的root数据库，确认仅测试数据），再复用原脚本补唯一用例。若缓存确已不可恢复，须先调整“不重建夹具”限制；禁止对空目录自动启动生产测试并冒充原夹具。保留R7/R8 Windows/全量验收责任。

已读取仓库强制规范；AUDIT.md属于旧infra/development-pipeline任务，不作为本轮状态。仅保存本轮诊断/验收/恢复记录，无产品、协议、Schema606/FSRS、依赖锁或测试断言变更。本检查点SHA由Git历史和远端读回解析；不等CI、不合并、不发布，保存后结束。

---

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
