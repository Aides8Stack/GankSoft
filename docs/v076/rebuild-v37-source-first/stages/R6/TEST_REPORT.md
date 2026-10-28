# R6 — 设置、回收站、备份与全局交互：测试报告

**当前状态：NOT_RUN（仅补齐报告模板，尚未执行该阶段）**

## 测试基线

- 被测源码 HEAD：NOT_RUN；下一 Work 应记录完整 Git SHA 和具体 working tree。
- OS/Node/Electron/Schema606/夹具版本与配置：NOT_RUN，开始测试后填写实际值。
- 测试命令、退出码、通过/失败数量、截图/manifest 哈希：NOT_RUN，不预填虚构数据。
- B1/B2/B3 和 R0–R5 的历史 PASS 只能在代码/环境未影响时注明继承来源，不算本报告新执行。

## 阶段专项测试清单

| 编号 | 必测事项 | 当前结果 | 证据位置/命令 |
| --- | --- | --- | --- |
| R6-01 设置内入口 | settingsScreen/回收站位于设置体系，导航焦点/空态/危险操作确认与原型对应，三宽无溢出。 | NOT_RUN | 待执行后填写 |
| R6-02 调度参数 | 全局/单卡例外、默认到期计划保护、主动重算预览与实际服务/FSRS 数据一致。 | NOT_RUN | 待执行后填写 |
| R6-03 回收恢复 | 卡片/知识子树实际删除恢复、同名/缺父/关联安全及取消不写、失败回滚。 | NOT_RUN | 待执行后填写 |
| R6-04 备份恢复 | 完整备份与整库恢复、独立合并导入，图片/历史/关联逐项校验，新进程一致。 | NOT_RUN | 待执行后填写 |
| R6-05 目录迁移 | 原数据校验、失败不切换、成功后新进程从新目录读回；中文/长路径专项可衔接 R8。 | NOT_RUN | 待执行后填写 |
| R6-06 相关回归 | 正式 UI→IPC→Schema606；旧配置、卡片/FSRS、图谱/编辑数据保持，受影响三宽截图/DOM/CSS。 | NOT_RUN | 待执行后填写 |

## 跨层 Gate

| Gate | 结果 | 备注 |
| --- | --- | --- |
| VISUAL | NOT_RUN | 需区分阶段适用性；GitHub 计划文档保存不等于产品 Gate 通过 |
| UI_INTERACTION | NOT_RUN | 需区分阶段适用性；GitHub 计划文档保存不等于产品 Gate 通过 |
| IPC_API | NOT_RUN | 需区分阶段适用性；GitHub 计划文档保存不等于产品 Gate 通过 |
| BACKEND_INTEGRATION | NOT_RUN | 需区分阶段适用性；GitHub 计划文档保存不等于产品 Gate 通过 |
| PERSISTENCE_RESTART | NOT_RUN | 需区分阶段适用性；GitHub 计划文档保存不等于产品 Gate 通过 |
| NEGATIVE_SECURITY | NOT_RUN | 需区分阶段适用性；GitHub 计划文档保存不等于产品 Gate 通过 |
| REGRESSION | NOT_RUN | 需区分阶段适用性；GitHub 计划文档保存不等于产品 Gate 通过 |
| WINDOWS_REAL | NOT_RUN | 需区分阶段适用性；GitHub 计划文档保存不等于产品 Gate 通过 |
| PORTABLE_PACKAGE | NOT_RUN | 需区分阶段适用性；GitHub 计划文档保存不等于产品 Gate 通过 |
| GITHUB_REMOTE_SAVE | NOT_RUN | 需区分阶段适用性；GitHub 计划文档保存不等于产品 Gate 通过 |

## 失败及保留

- 本阶段当前无新增测试执行，也无新增测试失败。未来出现 FAIL/BLOCKED 必须保存原始证据、原因、被测 commit/环境、是否重跑及真实最终结果。
- 不通过删除断言、静默跳过、改变测试数据期望或用 Linux/HTML 截图取代 Windows 实测来制造 PASS。
- 合成数据可通过 GitHub 版本化 tests/fixtures/ganksoft/ 最小生成器重建；仅临时 SQLite/本地锁不得提交。

## 完成后填写

- 实际最终源码 SHA / Run IDs / 真实运行命令与退出码。
- 执行的测试矩阵、场景数、恢复/重启/负向证据、截图/DOM/CSS、文件完整性哈希。
- 所有 FAIL/BLOCKED/NOT_RUN 的处理结论及由谁在何环境执行后续验证。

## 本轮 R6.1 实测（2026-10-28）

源码基线 dd64f033d469dec42c1bb688ffcaa113517ad6d6 + R6.1 工作树；Linux、Node24.22.1、Electron44.9.1、Schema606、小型b2可再生夹具、NotoSansCJKsc。

- npm run build：退出0 PASS。
- R6_ATTEMPT=2 node --experimental-strip-types tools/validation/r6/settings.ts：退出0，4组 PASS；9分类/焦点、真实路径和恢复能力、内部回收空态、返回保留、未保存调度取消/放弃、900/1366/1500三宽6 PNG+DOM/CSS。
- attempt0：测试选择器把主导航按钮与设置section同名误匹配；修为region。attempt1：当前无头Electron原生confirm触发窗口关闭；改用仅测试的确认答案adapter，实际组件事件/guard及IPC不替换。原失败JSON和截图保留，不能冒称Windows原生确认通过。
- Windows/中文IME/物理剪贴板 NOT_RUN，归R8。R6整体验收及原型对照继续，尚未PASS。

## R6.2 实测

基线3fe9d7aefe74db5832ce740542f5e887bff33879 + 调度工作树，环境同R6.1。
- npm run build：退出0 PASS，checks/build-r6-2.log。
- node --experimental-strip-types --test --test-concurrency=1 tests/unified-review-v075.test.ts：退出0，14/14 PASS，checks/schedule-domain.log，包含0–100客观/主观映射、失败回滚、并发、原历史、重算stale/幂等/到期保护。
- R6_ATTEMPT=4 node --experimental-strip-types tools/validation/r6/schedule.ts：退出0，5组+三宽3截图/DOM PASS，schedule/attempt-4.json；含非空历史/关联/发布内容、旧排期、单卡/全局、取消、确认、撤销、新PID。
- attempt0夹具尝试重新打开已存在复盘页，被正确拒绝；改为已有workspace.sessions/get/change完成该页。attempt1/2误把settings保存的原生关联当不存在的表，测试初始化失败；纠正为真实settings前缀。旧失败全部保留。attempt3功能5组PASS，attempt4补真实关联精确保护与三宽。撤销应递增调度revision并记审计，验证原FSRS字段和due精确恢复，不要求抹掉审计。
