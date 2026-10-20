# Work/Codex 结束与下一轮恢复规范

## 一、完成开发后要做的事（不等待 GitHub）

1. 当前阶段代码修改已经完成且正确记录。
2. 实际执行当前 Work 环境可运行的必要测试，若 FAIL 应修复或交接明确未完成；不得假称全量 Windows 人工验收已通过。
3. 检查 diff、移除非源码产物和敏感信息、提交并 Push；远程 HEAD 必须实际读回验证。
4. 更新 `TASK.json`、`PROGRESS.md`、`HANDOFF.md`、`TEST_REPORT.md` 和必要的 `PLAN.md`。记录真实被测 SHA、命令、PASS/FAIL/NOT_RUN、下一步、PR URL；一次性保存为远程检查点。
5. 可以创建/更新 Draft PR，但不等待它的 Checks；PR 暂不可创建时记录链接生成步骤即可，不要无限重试。
6. 用短总结告知用户本地测试与提交状态，以及 PR/CI/构建/Release 分别是否已触发、是否待核实。
7. **立刻结束 Work。** 无需等待 GitHub Runner、Actions、PR checks 或 Windows 发布。

### Work 的退出判定

```text
local_work_done = implementation_complete
               && all_required_locally_executable_tests_pass
               && push_and_remote_sha_verified
               && handoff_files_verified
```

远程 CI 为 Pending 时允许 local_work_done = true；但不允许将 CI 标成 PASS。若无法 Push 远程，则是 `REMOTE_NOT_VERIFIED`，明确保存的只有本地，不能声称可恢复远程检查点。

## 二、首次执行 Codex 主指令

```
请读取附件 ZIP 中的 01-Codex-MAIN-INSTRUCTION.md，并按文件顺序实施。
保持 GankSoft 图片模块 PR #2 独立，审计已有工作流 PR #3 的冲突。
严格分阶段修改、分阶段测试、分阶段 Commit 和 Push。
优先完成 P0 -> P1 -> P2，再依次完成剩余阶段。
任何阶段本地必要测试和远程保存完成后，如果继续推进会因为 CI 等待而占用 Work，立即交接退出，不等待 CI。
未经我明确授权，不合并 PR、不更改仓库为 Public、不发布 Stable、不修改 main/develop。
```

## 三、以后说“检查 CI 并继续”时给 Work

```
继续 GankSoft 流水线 v4.0。请从 GitHub 真实状态恢复，而不是从旧对话猜进度。
检查 Aides8Stack/GankSoft 的 infra/pipeline-v4（如果实际分支已不同，按远程交接文件查找），读取 AGENTS/STANDARDS/TASK/PROGRESS/HANDOFF/TEST_REPORT。
核对最新 HEAD、已有 PR、Actions 检查、Release 和产物校验值。
只处理第一个未完成或证据失效的阶段，不要重做已验证任务。
发现 CI 失败就读取失败 Job 日志并最小修复，完成必要本地回归、Commit、Push、交接后退出。
不要长时间轮询或等待 Windows 构建，不自动合并或发布 Stable。
```

## 四、交接报告样例（每次必须使用真实值替换）

```text
Task: Pipeline v4 / P2 PR Quality
Branch: infra/pipeline-v4
HEAD: <verified full SHA>
Implementation: DONE / IN_PROGRESS
Local tests: <commands> PASS | FAIL | NOT_RUN
Remote push: VERIFIED / BLOCKED
Draft PR: <link if created>
PR CI: PENDING / PASS / FAIL / NOT_RUN
Develop merge: NOT_DONE (user action required)
Develop post-merge RC: NOT_TRIGGERED (until actual merge)
Windows Candidate: NOT_RUN
GitHub RC release: NOT_RELEASED
Public visibility: PRIVATE (until explicit authorization)
Stable/Windows10-11 manual: NOT_RUN
Next: <single concrete action>
```

**特别强调**：用户若仅要求 Work 完成开发并自动触发 GitHub 后台发布，这并不意味着 Work 有权限合并 PR。合并到 develop 始终由用户手动完成；自动 RC 发布从这个合并事件开始。
