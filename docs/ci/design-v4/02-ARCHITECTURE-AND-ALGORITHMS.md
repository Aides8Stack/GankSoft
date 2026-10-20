# GankSoft v4.0 流水线架构、事件调度、去重与恢复算法

## A. 生命周期与计费边界

```text
Codex/Work: 需求 -> 修改代码 -> 当前环境必要测试 -> Commit/Push -> 更新交接 -> 立即退出
                                             |
                                             v
GitHub PR:  创建/更新 Draft PR -> pr-quality (只读、必要测试，不打包)
                                             |
                                       用户人工审核合并
                                             |
                                             v
GitHub develop: push -> release preflight -> quality Linux+Windows + security
                                              -> windows package/install/uninstall
                                              -> artifact SHA256 + metadata validation
                                              -> DRAFT release -> upload -> audit -> publish PRE-RELEASE
                                             |
                                             v
用户:      下载 RC 体验 -> 接受 / 提交问题 / 暂不合并 / 修复后新版本
                                             |
                  Stable: main 上的正式版本 -> 同包 Win10/11 人工验收 -> 人工批准 -> Stable
```

- Work 额度：Work 仅等待本地实际执行和远程保存，不等 PR CI/打包/Release。
- GitHub Actions：正常 PR 没有 Windows 安装包步骤，成本下降；在 develop 上仍要完整构建和发布 RC，GitHub 后台独立完成。
- Public 仓库标准 GitHub 托管 Runner 的运行分钟通常免费；Artifact 存储等资源仍受限制。

## B. 唯一事件归属（不得遗留旧 workflow）

| 事件 | 触发 | 是否跑 full quality | 是否生成安装器 | 是否 Release |
|---|---|---|---|---|
| feature Push，无 PR | 无自动重型任务 | 否 | 否 | 否 |
| feature Push，已有 PR | PR synchronize -> PR gate | 风险相关的必需全量回归 | 否 | 否 |
| PR create / reopen / ready_for_review | PR gate | 按风险 | 否 | 否 |
| PR 向 develop 合并 | develop push -> RC orchestration | **是** | **是** | **Pre-release 自动** |
| 纯文档 merge develop | preflight，快速跳过 RC | 否 | 否 | 否 |
| PR 向 main 合并 | 稳定基线集成/检查 | 视规则 | 否 | 否（Stable 人工） |
| 手动恢复漏发 | 管理员指定 SHA、鉴权 + 版本 + 来源 | 是/核验证据 | 是/验固定包 | 按恢复策略 |
| 仅更新 handoff 报告 | 快速文档校验 | 否 | 否 | 否 |

**注意：** 若对任意 `develop` 行为/基础设施改进都要求更新版本，那么连 CI 重构 PR 首次合入 develop 也应按版本策略产生新 RC。纯文字文档更新可明确声明为非产品改进而不发 RC；不能借此跳过实质代码变更。

## C. PR 快速门禁计算

1. 检索合并基准与 PR 改动文件；Diff 失败按高风险处理。
2. 将文件映射到多标签风险分类；文件归属未知按高风险。
3. 执行静态/类型/协议/业务相关测试；必要时合并全量领域回归，禁止原生模块和数据一致性测试被分类漏掉。
4. 检查每次改进已经升版本且锁文件同步，版本比目前 develop 新、未被历史 Release 使用。
5. 汇总 Job `pr-gate` 始终运行；FAIL、CANCELLED、证据缺失的必需测试都为失败；仅已证明不适用允许跳过。
6. PR 阶段 `permissions: contents: read`，无 Release Token，无原仓库写入；不可信 Fork 不执行高权限脚本。
7. 从非授权外部仓库提的 PR 不能被 `pr-gate` 放行到发布路径；真正合并权限由保护规则锁定。

## D. 避免“多个快速合并导致漏发 RC”的调度算法

**高优先级风险：** GitHub 同一 `concurrency.group` 并不保证排队无限延续：默认最多有一个运行中、一个待运行，后到事件可能替换旧待运行事件。因此，单纯 `develop-rc` + `cancel-in-progress:false` 并不能证明每个 merge 都获得一份 Release。

必须二选一，并真实测试：

**推荐算法：合并提交扫描 + Release 对账（可恢复队列）**

- `push develop` 只做一次可信的协调运行；按固定受控 `develop` 的第一父链/PR 合并记录，找到最后一个已经验真、已发布的 RC 高水位（引导时由人工设定一次受控基线）。
- 扫描高水位到最新 develop HEAD 之间的所有“用户批准合入且应用版本变化”的改进提交，按 Git 提交顺序逐个生成 `release-intent`，绑定：完整 SHA、SemVer、PR ID、变更类型、前置版本。
- 对每个 intent 判定：`published_verified`（完成，无需重复）、`draft_verified_recoverable`（核对后恢复）、`missing`（应构建发布）、`conflict`（阻断）。
- 对所有 missing 按顺序完成该 SHA 的完整测试、安全、Windows 构建、校验与发布。每个 SHA/版本一次，任何一项失败必须保留日志，不能悄悄标记已发布。
- 如果队列协调运行被 GitHub 合并覆盖，**最后一次运行仍必须扫描并补齐此前被跳过的所有 intent**。可增加安全的管理员手动 `reconcile` 入口，核对漏发并补救；手动入口按 GitHub 默认分支规则部署。
- 不允许在同一合并周期发布 `rc.2` 后又错误把 `rc.1` 设置为最新；RC `make_latest:false`。
- 并发/竞态使用唯一 `version + sha` 身份、发布前二次验 Tag、不可覆盖冲突；采用受信任的锁与幂等 API；不能只靠 `if: github.sha` 判定没有重复。
- 对最初引导版本必须显式设定`adoption baseline`，避免一次性回溯全部既有 Git 历史、产生大量旧 Release。

**备选算法：每 SHA 独立构建，发布串行校验**。若采用备选方案，允许不同 SHA 并行跑测试和构建，但必须有可信的发布序列锁和漏发检查；否则不得声称满足每次改进一个 Release。

## E. 自动发布安全事务

```text
FIXED_SHA -> VERSION_CHECK -> FULL_TEST_PASS -> SECURITY_PASS -> WINDOWS_PACKAGE_PASS
          -> SOURCE/ARTIFACT_HASH_PASS -> CREATE_DRAFT -> UPLOAD_ALL_FILES
          -> VERIFY_ASSETS -> PUBLISH_PRERELEASE -> VERIFY_TAG_AND_ASSETS -> LEDGER_COMPLETE
```

- Release 标签 `v${package.json.version}`；GitHub Release Asset 包含安装器、便携 ZIP、`SHA256SUMS.txt`、`source.json`、`build-metadata.json`、`TEST_REPORT` 摘要。
- 不要在 CI 中修改应用版本或向 `develop` 推送版本 Commit；版本应在 PR 合并前提交。
- 任何后半段失败：不得公开残缺 Release，保留草稿/错误状态供审计。
- Tag/Release 已存在：先核对同一 SHA/版本/哈希；同则允许幂等成功，不同则失败。不可移动 Tag 或用新包覆盖已有已发布 Asset。
- GitHub GITHUB_TOKEN 触发的普通 push/tag 事件可能不会触发新的 workflow；一个 Release 工作流必须显式完成完整阶段，不能依赖隐式链式事件。

## F. 安全与审计边界

1. Public 前：全历史密钥、用户数据、版权内容、工件/日志、协作者和第三方 GitHub Apps 审计；发现问题不公开。
2. PR：只读令牌、无 Secrets、不得运行 untrusted `pull_request_target` 代码。
3. develop：受保护分支，只有授权者审核合并，自动 RC 以真正 merge 到 develop 的可信 SHA 为唯一入口。
4. 发布：只有 release-rc 的独立 Job 拿 `contents:write`，Release 注明自动 RC，不是 Stable。
5. main：正式 Stable 人工验收与人工发布，不由 develop merge 直接发布。
6. GitHub 后台故障：任务状态为 PENDING/BLOCKED，Work 立即结束，下一轮核对当前 Actions，不反复重跑代码。

## G. 监测目标

- PR 快速质量检查：目标数分钟（不含 GitHub 服务端排队，非 SLA）。
- 自动 RC：质量 + 安全 + 构建完整运行，可较长，但不可让 Work 等待。
- 结果存储：各阶段报告要含 job `created_at`、`started_at`、`completed_at`，区分排队与实际执行。
- 公开仓库下仍应控制 Artifact 保留天数和大小；RC 发布后 Actions Artifact 可按政策清理，但不可误删正式 Release 资产。
