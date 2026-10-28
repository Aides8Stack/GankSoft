# R7 — 全应用集成、跨页回归与严格视觉验收：测试报告

**当前状态：NOT_RUN（仅补齐报告模板，尚未执行该阶段）**

## 测试基线

- 被测源码 HEAD：NOT_RUN；下一 Work 应记录完整 Git SHA 和具体 working tree。
- OS/Node/Electron/Schema606/夹具版本与配置：NOT_RUN，开始测试后填写实际值。
- 测试命令、退出码、通过/失败数量、截图/manifest 哈希：NOT_RUN，不预填虚构数据。
- B1/B2/B3 和 R0–R5 的历史 PASS 只能在代码/环境未影响时注明继承来源，不算本报告新执行。

## 阶段专项测试清单

| 编号 | 必测事项 | 当前结果 | 证据位置/命令 |
| --- | --- | --- | --- |
| R7-01 R1 遗留关闭 | 文字侧栏、顶栏、目录和设置入口/导航保护真实 E2E、三宽对照通过，不保留未结高优先差异。 | NOT_RUN | 待执行后填写 |
| R7-02 主流程闭环 | 编辑/复盘/统计/知识树/Markdown交换/图片/设置/备份跨页真实 UI→IPC→606→新进程读回。 | NOT_RUN | 待执行后填写 |
| R7-03 安全回归 | CAS、幂等、未知回执、取消零写、回滚、图片引用和 FSRS/已发布/历史不退化。 | NOT_RUN | 待执行后填写 |
| R7-04 原型视觉 | 主页面典型和异常状态三宽精确对应，截图/DOM/CSS/布局量测/差异结论完整。 | NOT_RUN | 待执行后填写 |
| R7-05 全量与性能 | 受影响回归+长期17场景、按计划全量测试、性能及资源上限实际记录；阻断项有责任与复验。 | NOT_RUN | 待执行后填写 |
| R7-06 差异终局 | BLOCKER/MAJOR 清零；MINOR 经用户明确批准；Windows 实机及便携 ZIP 保留 R8，不虚报。 | NOT_RUN | 待执行后填写 |

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
