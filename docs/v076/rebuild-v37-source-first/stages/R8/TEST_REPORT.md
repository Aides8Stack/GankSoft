# R8 — Windows 10/11 正式验收与便携 ZIP 交付候选：测试报告

**当前状态：NOT_RUN（仅补齐报告模板，尚未执行该阶段）**

## 测试基线

- 被测源码 HEAD：NOT_RUN；下一 Work 应记录完整 Git SHA 和具体 working tree。
- OS/Node/Electron/Schema606/夹具版本与配置：NOT_RUN，开始测试后填写实际值。
- 测试命令、退出码、通过/失败数量、截图/manifest 哈希：NOT_RUN，不预填虚构数据。
- B1/B2/B3 和 R0–R5 的历史 PASS 只能在代码/环境未影响时注明继承来源，不算本报告新执行。

## 阶段专项测试清单

| 编号 | 必测事项 | 当前结果 | 证据位置/命令 |
| --- | --- | --- | --- |
| R8-01 Windows 包身份证明 | 单一完整源 SHA、版本、锁哈希、Run ID/attempt、SHA256SUMS、ZIP 内容/顶层目录与 EXE 身份一致。 | NOT_RUN | 待执行后填写 |
| R8-02 无安装便携 | 仅 ZIP，Win10/11 确认直接解压运行、无 setup.exe、短路径/中文路径/长路径完整性与重启。 | NOT_RUN | 待执行后填写 |
| R8-03 Win10 真实验收 | 三宽/缩放/中文字体、物理剪贴板、IME、表格、图谱、备份、历史与首次启动均实际执行并签核。 | NOT_RUN | 待执行后填写 |
| R8-04 Win11 真实验收 | 与 Win10 同一个 ZIP，全套关键实际 GUI 与持久化/安全场景执行并签核。 | NOT_RUN | 待执行后填写 |
| R8-05 CI/安全 | 现有仓库 required gates 和审批规则均得到真实证明；未满足即 BLOCKED。 | NOT_RUN | 待执行后填写 |
| R8-06 候选/发布边界 | 候选 Artifact 可追溯；未经所有者合并/Release 授权不改变 main/develop 或发布正式版。 | NOT_RUN | 待执行后填写 |

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
