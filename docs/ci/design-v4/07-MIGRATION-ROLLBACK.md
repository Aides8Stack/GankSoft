# 从旧 quality.yml 迁移到新流水线的安全路线

## 当前已观察到的冲突

- `develop` 上只有 `.github/workflows/quality.yml`，同时监听 `push`（develop、feature、infra）和 `pull_request`；同一次开发提交可能重复启动两份完整检查，并在每份后执行 `windows-package`。
- Draft PR #3 已提交初级优化，消除一部分重复 Push、针对文档改动跳过重型任务，但仍将 Windows 打包接在 PR 完整质量后，不满足此次需求。
- Draft PR #2 含图片模块实现，与基础设施任务隔离。
- `main` 仍是默认分支；不能以 `workflow_dispatch` 为唯一触发源，否则工作流未部署到 main 时手动按钮可能不可用。

## 迁移步骤

1. **冻结事实**：备份/记录现有 `quality.yml` 的 Git Blob SHA、develop SHA、旧 Job 名称和 Required Checks 配置。
2. **新分支实施**：`infra/pipeline-v4` 从 develop 创建，先实现 version gate 与 pr-quality，确保 release 实现尚不具备写入/触发权限。
3. **停止重叠**：迁移 PR 里**同时**删除/停用旧 `quality.yml` 的 feature push/PR 重型监听器，避免合并后双跑。检查所有 `.github/workflows`，不可只看文件名。
4. **质量门禁迁移**：如果现存 Required Check 引用旧 `quality (windows-latest)`、`windows-package`，用户应先在设置中规划换成稳定 `pr-gate`，并通过真实 PR 验证，不得跳过保护规则或造成永久 Pending。
5. **RC 安全演练**：在受信任受控的分支/沙盒中验证 preflight、质量、安全、Windows、Tag 冲突、完整性和 Draft 事务；需要用户批准后才能在 develop 做真实合并触发演练。
6. **用户审核新 PR**：新 v4 PR 取代旧 PR #3 功能；获得用户同意后方可关闭旧 PR #3。严禁独自合并两份竞态工作流 PR。
7. **合并 v4 到 develop**：用户亲自执行，验证自动 RC 是否按照新的版本号启动。Work 绝对不要等这条流水线结束。
8. **Stable 控制上线**：用户以后把同一来源可信的 release-control 工作流推广至默认 `main`，启用手动 Stable 入口和发布环境。
9. **公开仓库**：另行安全审计、取得用户明确确认后才执行 Public；不可反过来先公开再审计。

## 失败处理

- 工作流 YAML 语法或环境依赖失败：记录真实 job/step，修复基础设施 PR；不可在旧 Workflow 上无限重跑并宣称解决。
- Release 只完成 Draft：保留草稿与关联 SHA/产物回执，修复后按幂等流程继续，不能清除后隐瞒失败。
- develop 意外出现新版本但 Release 缺失：基于 Git 和发布高水位执行对账补发；不得乱选最新包替代缺失版。
- 版本碰撞：阻止发布，提交新的合法版本 PR；不得重用 Tag 或 Force Push。
- 全量测试缺陷：修复后同 SHA 的 CI 结果可能需要重新运行，报告 run_attempt 与准确来源，不把旧 PASS 迁移到不相同的代码。
- 公共服务故障：与本地 Work 完成状态独立；GitHub 恢复后从真实结果继续，不要求 Work 在线守候。

## 回滚原则

- 回滚发生在基础设施**新 PR 合并之前**：只修补该 PR，develop/main 原样保留，无需破坏性操作。
- 合并之后发现 v4 调度问题：准备新的回滚修复 PR，获得用户人工批准合并；优先 revert 单独基础设施改动而非 reset/force push。
- 已发布 RC：不得用回滚偷改 Tag/附件，明确发布撤回或创建新的修复版本。
- 只有版本与来源相符的工件才能重新发布；若历史不完整先阻断发布。
