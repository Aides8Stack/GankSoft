# R8 — Windows 10/11 正式验收与便携 ZIP 交付候选：执行计划（PLAN）

状态：NOT_STARTED（仅规划；不得把此文件存在当做实现或验收通过）
设计基线：2026-10-28，最新源码/状态始终以远端 HEAD 和 R0-R8-STAGE-TRACKER.json 为准。

## 权威与准入

# GankSoft v0.7.6 — 阶段计划文档

> 文档补齐检查点：2026-10-28。此提交仅建立后续执行规范，不代表功能已实现或测试通过。
> 唯一工作分支：feature/v075-unified-learning-workspace；Draft PR #15 → develop。
> 权威依据：本包 README、05-R0-R8-STAGES-AND-GATES.md、04-BACKEND-E2E-TEST-MATRIX.md、03-VISUAL-FIXTURES-AND-ACCEPTANCE.md、06-CI-WINDOWS-RELEASE-GATES.md、冻结 OPEN-ME-v3.7.html，以及最新用户决策。
> 下一 Work 必须先核实远端 HEAD、AGENTS.md、STANDARDS.md、RECOVERY-NEXT.md 和现有源码/测试；下述步骤是计划，不可直接标 DONE。

**前置条件**：R7 必要 Gate 已通过且已明确所有未运行的 Windows 门禁；从受保护分支规则和当前发布流水线真实状态开始核实。未获用户发布授权时只能生成候选，不合并/发布。

## 本阶段目标
- 只生成 Windows x64 便携 ZIP，不引入 Inno/NSIS 安装器、setup.exe 或第二类下载包。
- Windows 10/11 使用同一个从固定完整源码 SHA 构建的便携包分别验收实际解压、首次启动、升级/再次启动、数据持久化与图片/编辑功能。
- CI、产物身份、SHA256、Win10/Win11 真机清单和人工批准必须可追溯；缺真实执行证据即 NOT_RUN/BLOCKED。

## 实施顺序与范围

### R8.1 同源构建与门禁核对

- 核实最新 PR#15/head、develop/main rulesets、需要的质量门禁及现有 deploy/RC workflow；不得绕过 required gate、批准或修改受保护分支。
- 版本取 package.json/配置实际值；保留 provenance：完整源 SHA、依赖锁哈希、workflow Run ID/attempt、构建元数据、ZIP SHA256。
- 不等待长 CI；记录当前 Run/Job 状态。CI 无法执行时保存真实阻断，不允许自称发布成功。

### R8.2 便携包格式验收

- 唯一候选文件 GankSoft-v{version}-win64-portable.zip，顶层固定 GankSoft/，内含 Windows x64 可执行文件及完整运行资源。
- 真实解压到短路径、80/100 字符目标路径、带中文/空格及合理长路径；验证完整文件哈希、最长路径和文件名/版本身份一致。
- ASAR/原生模块/静态资源的加载、无安装依赖直接运行、关闭重启和无旁路安装器验证；不上传额外 setup.exe。

### R8.3 Windows 10/11 同包 GUI 验收

- 在真实 Win10 和 Win11 分别用同一个 ZIP/完整 SHA 解压，记录 OS/构建号/架构/显示缩放、启动日志和真实截图；不能拿不同 ZIP 混签。
- 测试 100%、125%，必要 150% DPI；1500/1366/900 代表性宽度、中文字体/长路径、设置/回收站/备份、键盘焦点/弹窗、空态和实际滚动。
- 真实中文 IME 组合输入、物理剪贴板 PNG/图片粘贴、Milkdown/Crepe 表格鼠标拖拽/公式/撤销、Mind Elixir 自动布局（不可自由拖坐标）、图片恢复及资源管理。

### R8.4 数据与安全完整性

- 全新 Schema606 + 已存在合成606的两条轨道，执行卡片三模式、发布/复盘/FSRS、历史、图片引用、知识图谱/Markdown导入、备份/合并/恢复、目录迁移和正常重启。
- 临时写入失败/中断/回执未知/权限错误与恢复验证；源文件/用户数据库和原图片不得被错误删除、覆盖或泄露。
- 磁盘、路径、文件哈希和数据/图片逐项对照；故障时停止候选放行，不自动升 stable。

### R8.5 交付与人工签核

- 汇总独立 Win10/11 人工验收清单、CI Run/Jobs、包哈希、source manifest、完整解压核验、R7 视觉与回归引用。
- 候选允许上传已有既定构建渠道的 Artifact；如要求持久 Release，必须单独取得用户批准并沿现有审批/发布机制执行。
- 任何一端未签核或门禁失败继续候选/RC 状态，不能冒充正式 v0.7.6 发布。

## 必须守住的边界

- 只交付 win64 portable ZIP，绝不再恢复安装器构建。
- 不自动批准、合并 PR#15、修改 develop/main 或创建 Release；用户明确批准之前只能提交候选证据。
- 不把 Windows Runner 自动测试当作 Win10/Win11 的真人验收。
- 不修改 Schema606 或为了出包降低测试/视觉/可信审批门禁。

## 测试与证据原则

- 先确认现有 protocol/codec/服务接口和测试工具的真实名称，避免凭计划虚构可执行命令；优先使用仓库内版本化的最小合成夹具 tests/fixtures/ganksoft/，运行时 SQLite/活动租约不上传。
- 测试层次必须分别记录 VISUAL、UI_INTERACTION、IPC_API、BACKEND_INTEGRATION、PERSISTENCE_RESTART、NEGATIVE_SECURITY、REGRESSION；R8 另含 WINDOWS_REAL 和 PORTABLE_PACKAGE。实际测试命令/环境/退出码/次数及 SHA 必须记录在 TEST_REPORT.md。
- 未执行均为 NOT_RUN，失败保留 FAIL/阻断为 BLOCKED；有效的历史证据仅对未受影响项可注明继承，不得冒充在当前 SHA 上重跑。
- 每个稳定检查点 GitHub 连接器保存到原 PR#15，核实真实 HEAD/parent/tree，force=false、expected_sha，独立读回关键文件和证据；无需等待 CI，不合并或发布。

## 阶段退出 Gate

| 编号 | 必须产生的证据 |
| --- | --- |
| R8-01 Windows 包身份证明 | 单一完整源 SHA、版本、锁哈希、Run ID/attempt、SHA256SUMS、ZIP 内容/顶层目录与 EXE 身份一致。 |
| R8-02 无安装便携 | 仅 ZIP，Win10/11 确认直接解压运行、无 setup.exe、短路径/中文路径/长路径完整性与重启。 |
| R8-03 Win10 真实验收 | 三宽/缩放/中文字体、物理剪贴板、IME、表格、图谱、备份、历史与首次启动均实际执行并签核。 |
| R8-04 Win11 真实验收 | 与 Win10 同一个 ZIP，全套关键实际 GUI 与持久化/安全场景执行并签核。 |
| R8-05 CI/安全 | 现有仓库 required gates 和审批规则均得到真实证明；未满足即 BLOCKED。 |
| R8-06 候选/发布边界 | 候选 Artifact 可追溯；未经所有者合并/Release 授权不改变 main/develop 或发布正式版。 |

## 下一 Work 恢复入口

1. 核实 R7 完整报告和当前工作流/受保护分支，先生成同源 ZIP 和 Windows 实验清单；没有 Win10/Win11 实机能力时明确 NOT_RUN 并生成可执行的人工验收清单。
2. 验证输入/输出、测试夹具、截图和负向回滚，按实际成功结果逐项更新 PROGRESS/TEST_REPORT/ACCEPTANCE。
3. 达到所有门槛后向用户提交合并/发布决策清单；合并和 GitHub Release 必须由用户明确授权，不能由完成 R8 自动触发。
