# 04 — 真实前端与后端全链路验收矩阵

> 用户明确要求：**测试不仅测 UI，还必须测试对应后端功能完整**。视觉 PASS != 业务 PASS。真实 Electron → `window.gank.protocol`/preload → typed registry/gateway → 现有领域服务 → 隔离 Schema606 SQLite/FSRS/媒体 → 退出重启验证。测试数据为合成临时库，不使用私人学习数据。

## 必备测试层和标记
- `VISUAL`：原型同数据/同尺寸/同状态 DOM、CSS、截图与人审。
- `UI_INTERACTION`：由真实用户可见入口触发（不能仅调用内部测试函数），包括键盘/焦点/弹窗/错误/空态。
- `IPC_API`：证实实际 protocol 方法的参数、回执、边界、错误码与权限。
- `BACKEND_INTEGRATION`：实际服务、SQLite事务、FSRS、媒体、读写及聚合结果符合契约。
- `PERSISTENCE_RESTART`：关停进程，重启同数据目录，再次由 UI/API读取确认。
- `NEGATIVE_SECURITY`：取消、冲突、重复操作、错误回滚、跨集隔离和非法输入。
- `REGRESSION`：受影响相关原测试保持原强度；大规模/CI门禁按计划，不删断言。
- `WINDOWS_REAL`：真实 Windows 生产 Electron/EXE 及必要人工行为，不用 Linux 或 HTML demo 冒充。

所有类别记录 `PASS/FAIL/BLOCKED/NOT_RUN`，关键项不 PASS 不得将该阶段写 DONE；若只测试部分功能，则在场景级记录通过，而不是整个模块 PASS。

## 模块级必测清单

| R阶段/页面 | 从真实 UI 发起 | 真实业务结果 / 持久化断言 | 错误与边界 |
|---|---|---|---|
| R1 左侧目录/顶栏 | 新建文件夹、嵌套卡片集、选中、折叠、导航、切换页签、专注模式 | `workspace.catalog` 及保存接口真实目录、数量/高亮/路径；重启后保持；草稿离开保存、复盘离开暂停 | 取消无写入；文件夹分页、深层展开、非法路径、并发选择 |
| R2 学习总览 | 查看4摘要、创建/导入卡片集、点击续学、最近记录 | 真实 `workspace.dashboard`、card counts/due sessions/近记录；会话正确恢复并可重新打开 | 首次空606、无历史/未评分、跨文件夹数据、学习时区、分页 |
| R2 卡片集概览 | 本集计划、四快捷、统计和最近卡片 | 本集隔离聚合、卡片摘要、到期数真实 FSRS、后端读数与页面一致 | 演示掌握度不得直接写死；待复盘0/已暂停/空集 |
| R3 卡片列表/详情 | 搜索、类型/状态/知识点筛选、排序、分页、勾选、全选、批量学习/导出/删除、详情/回退 | 真实 card.listSummary/card详情、ID选择稳定、按集隔离、事务/历史/图片引用正确，回退保留选择 | 页间选择语义、重复删除、无权/无记录、恢复失败回滚 |
| R4 三类型编辑器 | 新建/自动保存、题干答案解析、选项、切换类型、发布、Markdown、LaTeX、粘贴/图片、知识点关联 | draft API/版本控制/发布/媒体暂存与引用/知识多对多；关闭重启后内容、图片和草稿无损 | 切换类型确认/清草稿、CAS冲突、粘贴延迟焦点变化、原生表格拖拽、中文IME、撤销、发布失败 |
| R4 复盘 | 会话开始、暂停/继续、提交答案、揭示、自评/思路/错因、下一张、退出后恢复 | learning event、每次答案/思路/评分/用时/时间戳、真实 FSRS Again/Hard/Good/Easy 排期及重启 | 答错强制 Again、重复提交幂等、离开自动暂停、同一队列题不重复、三卡模式 |
| R4 学习分析 | KPI、折线、筛选、明细、知识点分组和历史查看 | 使用真实复盘历史只读聚合并直接核对 SQLite/服务预期值，所有卡片模式历史保留 | 不把自评当掌握度、不含客观正确率时如实空态、时区/边界 |
| R5 知识图谱/MD | 新增子/同级、普通节点移动层级/顺序、删除恢复、搜索、全屏、画布平移、MD大纲、导入预览/导出 | 真实知识树结构/内容/位置与多对多、Markdown版本、重新启动后同树；导入前差异、局部导出范围 | 根节点拖动整图暂缓；错层/循环/重名/缺父/历史快照/失败撤销/资源 |
| R6 设置/回收站/备份 | 系统设置入口、调度参数、单卡例外、回收站删除恢复、备份导入导出、目录迁移 | 真正存储配置、必要 FSRS 保持既有排期、恢复文件/关联媒体、快照/事务/重启一致 | 回收站在设置体系内、危险操作二次确认；失败不丢库；S8.b 不能复活 |
| R7 全量回归 | 跨页面连续典型学习旅程 | 事件、卡片、图谱、备份、媒体、分析在同临时库跨页面一致，使用旧已验证 gate | 旧workspace 17 场景、Crepe/拖拽、Windows宽度1484/1500 等已知风险 |
| R8 Windows/便携 | Windows 10/11 同源 EXE/ZIP 真机操作 | 真机新606和已有合成606、安装/便携启动、重启、导入恢复、媒体、输入法与版式，构建溯源 SHA | 100/125/150%缩放、中文路径、超长路径、失败不发布 |

## 每个 test case 的证据模板
```yaml
case_id: R4-REVIEW-WRONG-ANSWER-AGAIN
tested_git_sha: <full sha>
entry: electron/main.ts -> src/main.ts -> UnifiedWorkspace.vue
environment: {os: Linux|Windows, electron: '...', schema: 606}
fixture: isolated-606-<seed>
ui_action: <steps/click sequence>
protocol_call: <verified from registry.ts>
expected_business_effect: <event + scheduler state>
actual_db_or_service_observation: <assertion and identifiers sanitized>
restart_observation: <read after full process restart>
negative_path: <cancel / failed request / duplicate>
run_command: <literal>
exit_code: <integer>
assertions: <N/N>
VISUAL: PASS|FAIL|BLOCKED|NOT_RUN
UI_INTERACTION: PASS|FAIL|BLOCKED|NOT_RUN
IPC_API: PASS|FAIL|BLOCKED|NOT_RUN
BACKEND_INTEGRATION: PASS|FAIL|BLOCKED|NOT_RUN
PERSISTENCE_RESTART: PASS|FAIL|BLOCKED|NOT_RUN
NEGATIVE_SECURITY: PASS|FAIL|BLOCKED|NOT_RUN
REGRESSION: PASS|FAIL|BLOCKED|NOT_RUN
WINDOWS_REAL: PASS|FAIL|BLOCKED|NOT_RUN
```

## 避免假通过
仅 mock 响应、DOM button click、API 单独单测、CI状态绿色或 DB 表存在，不足以证明端到端。至少核心路径由真实 UI 经真实 IPC 到临时 SQLite 并在重启后回读。对不适用项给出理由，不允许捏造执行结果。以前有有效测试证据可继承未受改动部分，公共导航/调用链受影响则必须补真实回归；禁止 `skip`、吞异常、放宽宽度/拖拽断言。
