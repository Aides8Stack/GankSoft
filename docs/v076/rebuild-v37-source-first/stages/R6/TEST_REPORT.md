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
