# GankSoft CI/CD v4.0 — 直接复制给 Codex / ChatGPT Work 的主执行指令

> **任务性质：实施指令，而非已经完成的代码。** 本包是设计、操作与验收协议；Codex 必须以实时仓库事实为准。不得把本包中的预期状态写成 PASS。
>
> **核心目标：Work 完成代码和其环境可执行的必要测试后，提交并交接，立即退出。用户审核 PR 并手动合并到 develop 后，GitHub Actions 自动完成全量测试、安全检查、Windows 构建、安装/卸载验证与新版本 RC GitHub Release。** 全过程不要求 Work 在场。Stable 正式版保持人工门禁。

## 0. 仓库、用户决定及禁止事项

- 仓库：`Aides8Stack/GankSoft`；集成分支 `develop`；稳定分支 `main`；建议独立基础设施分支 `infra/pipeline-v4`（存在则核实，不得重置）。
- 此次核查时：仓库为 **Private**，默认分支 `main`，`develop` 为 `c8db715d33265bdf8e2edd05f0f14a35b97de8ac`，应用版本 `0.7.3`；以上均仅作历史线索，实施前必须再次核对真实 HEAD。
- 既有 Draft PR #2（`feature/unified-image-recovery` → `develop`）是图片模块，不能覆盖或重建；Draft PR #3（`chore/ci-efficiency` → `develop`）是早期流水线优化，已执行成功但仍未合并。新方案须分析与 PR #3 的重叠，说明替代路径，未经授权不得自动关闭 PR。
- 技术：Node.js >=24、Vue 3、TypeScript、Electron、Vite、`node:sqlite`。现存 `npm run ci:quality`、`tools/ci/windows-package.ps1`、`npm run release:verify`、`.github/workflows/quality.yml`，尽量复用，不重复造轮子。
- 用户明确授权的预期**自动动作**仅限：用户本人审核并合并至受保护的 `develop` 之后，由 GitHub 在全部门禁通过时**自动创建新版本 Windows RC Pre-release**。这不等于允许 Codex 自动合并、切换 Public、发布 Stable、覆盖旧 Release。
- 仓库未来可公开，但**公开操作必须独立授权、公开前安全审计必须通过**。不允许未授权的人 Push、合并、发布原仓库；公开 Fork/提交外部 PR 在平台层面可能无法绝对禁止，但不得获得写入、合并、发布权限。
- 允许淘汰拖累设计的旧 CI/协议，但必须保留最新系统的完整性、测试覆盖和历史记录；严禁弱化门禁、删除断言、跳过真实失败。

**禁止**：自动修改 `main`/`develop`、自动合并、擅自发布 Stable、将仓库设为 Public、强推/重置/改写 Git 历史、删除恢复分支/PR/Release、无授权添加高权限 Token、使用 `pull_request_target` 执行不可信代码、把 Linux 测试冒充 Windows 10/11 人工签核。

## 1. 先审计，再改造

先检索并读取 `AGENTS.md`、`docs/development/STANDARDS.md`、`TASK.json`、`PLAN.md`、`PROGRESS.md`、`HANDOFF.md`、`TEST_REPORT.md`、`.github/workflows/quality.yml`、`package.json`、`package-lock.json`、`tools/ci/*`、`tools/validation/release-gate.mjs`、所有脚本调用链。

核对远程与本地分支/HEAD/工作树、实际版本、当前 CI 与 PR、现有 Release/Tags、GitHub 执行额度与权限、branch protection、环境和 Ruleset 可用性。核对文件存在性，不得使用记忆推断。对于只在 GitHub 网页设置才能配置的项写入 `MANUAL_CONFIGURATION.md` 并明确真实状态，不可宣称已经配置。

根据已有 `task:init` 规范初始化本任务，归档旧任务交接文件，创建独立任务状态。优先从已核实且干净的 `develop` 创建 `infra/pipeline-v4`；不得覆盖 PR #3 或图片分支。将详细审计放入 `docs/ci/ARCHITECTURE.md` 与 `docs/ci/MIGRATION.md`，提交第一个检查点。

## 2. 唯一事件归属：彻底杜绝 Push + PR 重复完整流水线

实现以下**唯一调度矩阵**；审计并关闭旧 `.github/workflows/quality.yml` 的重复触发（可以删除、替代或改造，必须先验证变更后没有残存监听器）：

| 事件 | 应执行的流水线 | 不允许发生 |
| --- | --- | --- |
| `feature/**`、`infra/**` 的普通 Push | 不执行自动完整构建；已有 Draft PR 则由其 `synchronize` 驱动检查 | 额外的 Push full quality 或 Windows 打包 |
| `pull_request` → `develop`/`main` | 一套 PR 质量门禁（适用的测试、版本验证），不创建安装包 | PR Job 依赖 `windows-package` 才能通过 |
| `develop` 经用户审核合并的新 Commit Push | **一次独立的、合并后 RC 流水线**：完整测试 → 安全检查 → Windows 构建/安装验证 → **自动 RC Release** | 与旧 Push 监听器并行的另一套相同 CI |
| 仅文档更改 | 快速校验；若无应用/发布版本更新，不创建 RC | 文档变更触发无意义的 Windows 安装器 |
| `main` 变更 | 按维护规则执行集成检查；Stable **不自动公开** | 直接发布 Stable |
| 手动完整检查/候选构建 | 独立入口，固定被测 SHA | 启动与当前代码无关的旧流水线 |

PR 和合并后集成验证是两个**不同阶段**，不是“重复事件”：PR 先验证拟议代码；合并后用真实 `develop` HEAD 做可信来源的发布前验证。不得为了追求零重复而省略正式发行前验证。

PR workflow 仅监听 `pull_request`，不要同时监听 feature Push；`develop-rc.yml` 仅监听受保护分支 `develop` 的 Push；不得监听 tag push 又自行创建 tag 造成循环。使用并发键：`<workflow-name>-<PR-number>`（PR）、`develop-rc-<branch>`（RC），`cancel-in-progress` 对过时 PR 可开；**正式 RC 在完成发布事务前不应被新 Push 任意取消**：按 develop SHA 排队串行、显式幂等去重，或采用经论证的安全串行队列，处理连续合并的情形。不得因为最新 Commit 出现而自动丢弃用户要求“每次改进一个版本”的已合入版本。Release/Stable 不与 PR 共用并发组。

不可信 PR 使用只读 `contents: read`、不提供 Secret、无写入权限；禁止从 fork 运行带发布令牌的构建脚本。识别同仓库授权分支、权限和 PR metadata；若不满足授权策略，给出安全、可解释的失败/跳过，不让未经授权的代码进入受信任发布路径。仓库 Branch Ruleset / Protection 才是真正限制合并和直推的关键，不能只依赖 actor 字符串。

## 3. PR 必需状态门禁：快而不漏

编写 `.github/workflows/pr-quality.yml`（实际命名以仓库规范为准），设置稳定且始终报告结果的 `pr-gate` 汇总 Job。普通 PR 跑轻量静态、类型、协议、受影响测试和构建检查；数据/迁移、复盘、图片原生依赖、备份、公共协议、安全/CI 相关高风险变更，合并前执行该领域完整回归。**PR 禁止自动生成 Inno Setup 安装器、便携 Windows ZIP 或 Release。**

使用确定性的 diff 分类器：`DOCS_ONLY`、`UI`、`BUSINESS`、`DATA_CRITICAL`、`PROTOCOL_CRITICAL`、`MEDIA_CRITICAL`、`REVIEW_CRITICAL`、`CI_SECURITY_CRITICAL`，多类别合并；未知差异保守全量。文档快速检查不得使 GitHub Required Check 永久 Pending；一个必需测试 FAIL/BLOCKED 时 `pr-gate` 必须 FAIL，不得跳过门禁。不要把超时默默当成功；显式标记 CI Pending 与 FAIL。

为 PR 添加“版本号检查”门禁：每项真实改进/bugfix/基础设施行为更改，必须在 PR 中更新 `package.json.version` 和 `package-lock.json`，而且不同于 develop 当前版本、未与既有 Tag/Release 冲突。纯文档变更允许不升级，但不能触发新 RC。并行 PR 争用同一版本号时必须在合并前刷新 develop 并重新 bump，通过 up-to-date 检查；不得发布两个不同 SHA 对应同一个版本号。

## 4. 版本算法：每次改进一个新版本，不由 CI 静默改写代码

以 `package.json.version` 为**唯一应用版本源**，锁文件/安装器/应用 About/发布 Tag/Release 名称必须一致。版本使用合法 SemVer；RC 使用如 `0.7.4-rc.1`、`0.7.4-rc.2`；Tag 为 `v${version}`。

举例（只是说明，实际需先查已有 Tag）：
- 基线 `0.7.3`；下一项改进合并为 `0.7.4-rc.1` → 自动 GitHub Pre-release `v0.7.4-rc.1`。
- 再一次改进为 `0.7.4-rc.2` → 发布 `v0.7.4-rc.2`，不覆盖上一个 RC。
- 正式 `0.7.4` 应在受控 `main` 源码上有一致的 `package.json.version`，重新对该**正式产物**完成必要验证与 Win10/11 人工验收后人工批准发布，不能仅给 RC 二进制改名冒充 Stable。
- 下个正式周期从 `0.7.5-rc.1` 或根据实际 SemVer 意义选用 minor/major；必须大于对应已发布版本，并永不重用被撤回的 Tag。

提供 `npm run version:check`、`npm run version:bump`（或匹配现有工程的独立工具），按项目实际约束安全更新版本与 lock；可复用 `npm version <version> --no-git-tag-version`，且必须核对变更文件。**Work/Codex 在业务 PR 提交前 bump；CI 只校验版本，不允许 CI 在 develop 推送新的版本 Commit**，避免受保护分支/`GITHUB_TOKEN` 不触发工作流/无限提交循环问题。

`develop-rc` 在启动时解析固定提交 SHA 的版本，核对 SemVer、对应 Tag/Release 未被其他 SHA 使用，并核对与 develop 基线版本关系。重复触发同一 SHA+version 应安全幂等：如果对应 Release 已公开且全部 SHA、产物校验一致则记录已完成；存在冲突则硬失败，不得覆盖。若中途失败留下 Draft，只能校验后恢复，不能直接覆盖外部内容。版号递增、不可变 Tag、发行序列与可追溯性均写入验收。

## 5. 自动 RC 发布：用户合并后，GitHub 独立完成

实现 `.github/workflows/develop-rc.yml`，仅接受 `push` 到 `develop`（以及显式的管理员恢复入口，后者必须验证相同的授权及 SHA）。

依赖图：

1. `preflight`：确认 `github.repository`、固定 `github.sha` 正是 develop 上的提交；验证受保护分支策略、已合并且获授权的 PR 来源/提交，禁止未经审批的直推获得自动发布；验证是不是纯文档变更、版本是否变化且唯一；检查旧工作流冲突。
2. `quality-linux` 和 `quality-windows`：`npm ci`、既有 `npm run ci:quality` / 专项必要回归，保留完整测试覆盖；失败立刻阻断后续发布。
3. `security`：基于该 SHA 进行 secrets、依赖许可/漏洞、工作流权限、Electron、供应链审计；严重结果 FAIL，报告须脱敏。公开前历史安全审计另设一次性门禁，不得由“本次未发现”替代。
4. `windows-package`：只有质量及安全审计全部 PASS 时才进入；在 Windows Runner 上复用既有构建工具，生成安装器与便携 ZIP，针对**实际安装包**完成安装、启动、卸载和来源一致性验证，输出测试证据。
5. `artifact-verify`：验证单次提交的来源 SHA、锁文件 SHA256、version、构建元数据、安装器与 ZIP SHA256SUMS、验收结果。把制品绑定到真正构建的源 SHA；禁止下载 `latest` 或模糊匹配产物冒用。
6. `release-rc`：独立受信任 Job，最小 `contents: write`（其他 Job 只读）；**自动创建新的 GitHub Draft Release**，上传并再次核验所有 Assets、来源信息、SHA256SUMS、变更说明；完整准备好后**自动发布为 Pre-release**（`prerelease=true`、`make_latest=false`），不需要用户再手动审核 RC，也不能发布为 Stable。任何失败只保留报告或私有 Draft，禁止创建部分公开的损坏 Release。
7. `report`：上传日志、标记状态与发布地址。记录最新 Release URL、Commit SHA、版本号、构建运行 ID 和安装包校验值。

必须真正实现“合并后自动发布”，而不是把发布要求只写在 Markdown 中。不得依赖需要人手触发的 `workflow_dispatch` 作为 RC 的唯一启动机制。`GITHUB_TOKEN` 创建的 Tag/Release 通常不会再触发额外 Push workflow；主流程应在**同一受控运行内完成**所需门禁，不依赖不可预测的链式自动触发。

为了防止连续多次合并造成漏发版本，**默认不允许 `cancel-in-progress: true` 直接取消正在构建/发布的 RC**。必须设计串行处理/排队、显式幂等与出错后人工恢复机制；如果 GitHub 原生队列不能保证严格 FIFO，必须额外用可信版本清单/调度日志检测缺失 SHA 并补发，不能声称取消即完成。

与日常 PR 不同：这里完整测试和 Windows 构建可以运行较久，但由 GitHub 后台执行，**不占用继续等待的 Work 会话**。

## 6. Stable、撤回和 Release 管理

正式 Stable **不得在 develop 合并后自动发布**。先将批准的候选版本提升至 `main`，在 `main` 上使用正式 SemVer（非 `-rc`），重新构建/验证与版本一致的二进制，再按原有 `npm run release:verify` 规则校验 Win10/11 同包人工验收。人工 signoff 必须是合法真实证据，不得伪造 `win10-actual.json`/`win11-actual.json`。

通过人工放行（例如 GitHub `release-production` Environment；必须核对套餐和仓库可见性支持）后，方可正式 Stable Release。若只有用户一人审批，不能启用阻止自审导致无人可以批准；如缺乏受支持的环境审批机制，应使用明确单独的人工发布触发、仓库权限校验和严格门禁，并说明局限。

增加管理操作：建立 Draft、人工发布 Stable、撤回错误 Release、修改展示名称/说明、创建修复新版本、查询 SHA/文件哈希、发布审计日志。已发布的 Tag 和二进制不得静默变更；优先使用 Release Immutability；撤回需要管理员明确确认。不能自动删除历史 Release 或 Release Tag。

GitHub `workflow_dispatch` 工作流需存在于默认分支（现为 `main`）才能从 UI 正常手动运行。设计两阶段部署：先让 develop Push 的 RC 工作流在 develop 验证；Stable 手动工作流经过用户批准再进入 main。**不得为显示按钮而绕过主分支权限保护**。

## 7. 未来公开仓库的安全与权限

现阶段仍为 Private。先进行所有可访问 refs 的历史密钥/个人数据库/题目图片版权/构建产物及 Actions 日志审计。发现任何高风险敏感数据应 FAIL，执行脱敏报告、必要的密钥轮换，并等待用户确认历史清理；不得自动公开或强推清洗历史。

公开后标准 GitHub 托管 Runner 通常可免费使用，但不能据此保证无存储或其他收费；主目标仍是正确调度。配置分支保护/权限，让只有明确授权维护者可 Push/合并原仓库，正式发布 Job 才获得写入权；外部用户可能 Fork/提交 PR，但不得进入受信任的自动发布路径。PR 阶段无 Secret、无 release token，禁用不可信来源的发布；审核 GitHub Apps 的写权限。

GitHub 设置的每项手工步骤记录实际完成状态；若权限不足，应报告 `NEEDS_USER_ACTION` 而不能捏造设置成功。

## 8. Work 退出状态机：开发任务不等待 PR、CI、安装包、Release

定义独立状态：

- `IMPLEMENTATION_DONE`、`LOCAL_TEST_PASS`、`REMOTE_CHECKPOINT_VERIFIED`、`HANDOFF_SAVED`：Work 开发结束条件；
- `PR_PENDING`、`CI_PENDING`、`CI_PASS`、`CI_FAIL`、`BUILD_PENDING`、`BUILD_PASS`、`RC_RELEASED`、`STABLE_APPROVAL_PENDING`：GitHub 后台/后续阶段；
- `NOT_RUN`、`BLOCKED`、`FAIL`：未执行、不具备条件或失败的验收状态。

Work 退出条件（必须全部满足）：

```text
implementation_complete
AND all_required_locally_executable_tests_pass
AND commit_and_push_verified_at_remote
AND handoff_files_saved_and_verified
```

在达到上式后，Work **立即交接退出**，不要等待 PR Checks、Actions 完成、Windows 安装/卸载、RC 自动发布或 Stable 手动审批；不要为了查询状态持续轮询。可以同步创建或更新 Draft PR，若 PR 操作临时失败只记录可恢复步骤、不要无限重试。用户尚未合并 develop 时，不可宣称自动 RC 发布已启动。

Work 的“测试完成”专指本轮当前环境中要求且实际可执行的测试；远程 Windows Runner/人工验收另行记录，不能声称全部平台 PASS。CI 失败时由下一次用户发出“检查 CI 并继续”才检查、修复并再次提交；Work 在本轮不能以 `CI_PENDING` 为理由无限挂起。

更新 `TASK.json`、`PROGRESS.md`、`HANDOFF.md`、`TEST_REPORT.md`，必要时更新 `PLAN.md`。记录准确的分支、Commit、测试、未测试场景、PR URL、待审核动作、可能的 CI 编号/链接和恢复指令；新 Commit 不能把自身 SHA 写入自身，不能因此无限追加文档提交。

## 9. 分阶段执行，每阶段真实验收

**P0 基线与冲突审计**：现状、PR #2/#3 影响、开发分支、授权及安全风险；提交检查点。

**P1 版本治理**：SemVer 单一来源、package-lock、PR 版本检查、并行 PR 冲突与回归测试；提交检查点。

**P2 PR CI 去重与快速门禁**：新 pr-quality、分类器、pr-gate、旧 quality.yml 退役；验证 Push+PR 不重复、PR 无打包；提交检查点。

**P3 合并后的可信 RC 流水线**：develop push 入口、固定 SHA、质量+安全门禁、失败阻断、构建与完整 ZIP/EXE 验证；提交检查点。

**P4 自动 Release 控制**：Draft→上传→核对→Pre-release，幂等、Tag 不冲突、重复/失败恢复、连续合并不漏版；提交检查点。

**P5 Stable 与公开前审计**：人工验收、环境/权限设置文档、Stable 人工发布、撤回策略、公开前安全审计；提交检查点。

**P6 实际 GitHub 验证**：先模拟/本地测试，再用单独测试用 PR 和用户授权的 develop 合并做真实端到端触发；不得为验证而擅自合并。若当前无合并授权，记录 `NOT_RUN/NEEDS_USER_ACTION`，并停在可交接状态。

详细测试必须按 `04-ACCEPTANCE-TESTS.md`。不得通过删测试、弱化断言或删除历史解决问题。实时 Actions 结果未返回时保留 `PENDING`，不阻塞 Work。

## 10. 输出与交付

输出：

1. 实际修改的工作流与脚本、变更范围和追踪表；
2. 去重事件矩阵、版本算法、自动 RC Release 执行链与安全边界；
3. 完整本地测试结果及不能运行的场景；
4. 完整的发布、人工审核、版本回滚、撤回说明；
5. 本次任务交接/恢复文档；
6. 可审核的 Draft PR，目标 `develop`（不自动合并）；
7. GitHub 配置中仍需用户手动点击的步骤；
8. CI/Release 只有真实结果才标记通过。

**最后一步必须是：远程提交与交接保存完成，输出简明交接摘要，马上结束 Work。本轮不轮询、不等待 CI。**
