# RC 所有者人工批准（替代外部验证服务方案）

策略：`OWNER_ENVIRONMENT_ATTESTATION_V1`。仅适用于 RC，Stable 原入口/人工同包验收不变。自动质量、安全、Windows打包、制品验证全部保留；只有最终发布等待批准。本文件是操作说明，不代表 Environment 已配置或 RC 已发布。

## 已确认的平台

2026-10-21 核实仓库 Public/default main；Environment API GET200、total_count=0。公开仓库支持 Required reviewers，但当前没有 `rc-publish-owner`。本方案使用 develop 自动 Run 内的原生环境审批，不依赖默认 main 中尚未部署的 workflow_dispatch；无需为本任务向 main 推送或开部署PR。

PR#8 旧HEAD a02a88e240c00b09b3f4fe3d7bc02dda280e66e8 的质量 Run39448956112四个Job成功；pr-trust Run39449063303要求所有者针对完整SHA独立审核。继承 G2 PASS，不重新审查。旧 RC39446565059 因缺失 bypass 机器证据在preflight失败；不能将重跑该旧Run当成已部署本修复。

## 先做一次设置（所有者手动，不由本任务执行）

仓库 **Settings → Environments → New environment**，名称必须为 `rc-publish-owner`：

1. **Required reviewers** 只选择 `Aides8Stack`（用户ID344626996），不要选择Team或加入其他账号。
2. **Prevent self-review** 保持不勾选。单所有者同时合并develop并审批发布，否则会无法自审；这是用户选择的单所有者授权策略，不冒充两人复核。
3. 关闭 **Allow administrators to bypass configured protection rules**。某些GET响应不暴露该开关，运行时代码不把缺失字段认作已关闭；仍强制读取真实owner approval历史，因此仅绕过Environment也不能获得发布授权。
4. **Deployment branches and tags → Selected branches and tags**，只添加 **branch develop**，不要添加main、Tag、通配符。不要只选Protected branches，因为没有规则时该选项可能放宽。
5. 无需添加任何Secret/PAT/App，不需要外部服务器。

未配置、reviewer不符、branch规则过宽、API不可用或没有实际批准，发布代码在任何Release写入前拒绝。工作流自动创建的同名空环境不等于已配置Required reviewers。

官方功能依据：https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments 。

## 每次在网页上批准

1. 所有者审核当前修复PR**完整SHA**，完成既有 pr-trust 独立授权；必需状态通过后由所有者决定是否合并develop。本任务不会合并。
2. **Actions → GankSoft develop build and owner-approved RC v4 → 对应Run**。等待quality双平台/security/windows-package/artifact-verify成功；构建自身不持Release写权限。
3. 打开 **artifact-verify → Summary**，核对：仓库/Run ID/attempt、协调SHA、每一个列明的RC版本/源码SHA/manifest摘要。`rc-verified-plan` Artifact包含 `verified-plan.json` 和 `approval-request.json`，`rc-packages`包含对应原始包。审批覆盖清单内逐项列明的RC；任一版本不想发就拒绝整个批次，不能把批准扩大至未来版本。
4. 在批准前，登录所有者账号打开 **Settings → Rules → Rulesets**，检查全部适用Ruleset：active、完整bypass列表为空、pr-gate/pr-trust为GitHub Actions来源、Strict、PR/解决线程、防强推、防删除。机器有效规则再次检查仍运行；隐藏bypass只能记为未验证，不能默认安全。必要时用所有者已有管理界面核对继承来源；不创建新管理员凭据。
5. 完成实时核验后，在本地PowerShell取得当前UTC Unix秒：

   ```powershell
   [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
   ```

6. 回到该Run，点击 **Review deployments → rc-publish-owner**。把artifact-verify Summary提供的整条批准文本粘贴到 **Comment**，仅把 `CHECKED_AT_UNIX_SECONDS` 替换为刚取得的数字。其余摘要/固定声明不要改。

   ```text
   RC-APPROVE <本次64位请求摘要> <刚核验后的UTC Unix秒> CHECKED-LIVE-RULESETS-NO-BYPASS-REQUIRED-CHECKS-STRICT-PR-NO-FORCE-NO-DELETE
   ```

7. 选择 **Approve and deploy**；不要用管理员强制绕过。不同意则 **Reject**。

这段Comment明确声明：所有者刚刚核验完整实时保护配置，并授权该摘要绑定的所有列明版本。程序读取GitHub审批历史中的实际批准账号ID/login、环境ID和整段文本。只输入“同意/Ship it”不会发布。

## 实现与安全边界

- `protection.mjs`：分离可见有效保护检查和严格完整bypass验证。`validateProtection`/`requireReleaseProtection`继续拒绝缺失/null/非空/错误类型。构建模式仅在字段**省略**时输出`BUILD_ONLY_BYPASS_UNVERIFIED`，不输出发布授权；可见非空bypass、损坏结构或API错误仍拒绝。
- `queue.mjs`：仅命令入口按显式RC人工策略选择build-only；版本递增、first-parent合并授权、历史对账不变。严格函数默认调用方式保留；历史撤回记录的main严格保护校验不放宽，若将来遇到此独立阻塞仍需另行核实，不能借RC人工审批跳过撤回证据。
- `verify-all.mjs`：原双平台报告、安全、Windows包、来源及哈希门禁不变，验证后生成审批请求和网页Summary。请求绑定仓库/develop、完整coordinator与每个source SHA、版本、锁/制品清单、Run及attempt；请求最长24小时。
- `owner-rc.mjs`：独立人工授权实现。发布前核实当前GitHub Run及该attempt全部六个必需Job成功、环境设置及实际owner审批，重新检查本地包和请求摘要。授权回执明确写 `humanProtectionVerification: OWNER_ATTESTED`、`machineBypassVerification: NOT_VERIFIED`，并保留可见机器检查结果。审批时间是owner在Comment里声明的核验时间；GitHub review-history API无独立审批时间戳，不能伪装成平台签发时间。
- `release.mjs`：原发布事务/制品校验/冲突/撤回Tag墓碑/幂等账本复用。RC命令入口不再允许未配置人工策略的自动发布。创建Draft、每次上传和最终公开PATCH前执行授权守卫；Stable调用保持原默认行为。`release-receipts/owner-authorization.json`记录绑定请求和授权；原ledger.json增加授权回执。
- 工作流：构建Run独立进行，等待审批不阻塞新构建；发布Job用同一并发组串行。GitHub队列可能替换较早pending Job，既有first-parent对账仍会保留未发版本，不能强推或删Tag“解决”。所有者必须审核每次Run的完整清单。
- 审批15分钟有效，未来时间、请求之前时间、错误SHA/attempt/摘要/环境、外人批准、拒绝、失败/缺失CI均拒绝。重跑attempt变化需要新请求和新批准；相同运行重放只能幂等核验同包，已占用版本的不同构建包拒绝覆盖。
- 配置不变无法被人工审批持续证明。每次写入前重新读可见规则与批准，仍存在核验到写入间的时间窗口；隐藏bypass在批准后变化不能由只读Token可靠发现。这是所有者接受的明确权衡，绝不等价于持续机器实时完整验证。

## 失败与恢复

审批超时或批准文本错误：不发布。不要强制重跑旧审批；重新运行相关流程生成新Run/attempt请求并重新核验批准。当前默认main若未部署develop-rc手动入口，网页不会有可用reconcile按钮；不能据此擅改main。可由后续获批的develop合并触发正常路径；需要手动部署时必须另建main PR。

上传中断或15分钟内未完成：保留Draft和已有Tag，不自动删除/重建/覆盖。原制品同包恢复仍受既有身份/账本规则约束；跨Run/attempt的旧包、已过期批准不能沿用。如恢复触发Draft身份冲突，交还所有者按既有授权恢复机制处理；本次不弱化这些检查，也不承诺任意重新打包能覆盖旧版。

环境功能将来因仓库私有化/套餐而不可用：本实现保持BLOCKED，不能移除环境门禁；再为受保护默认main上的owner-only workflow_dispatch创建独立可审核PR。本轮公开仓库已确认原生功能可用，因此未额外部署/实现第二入口。

## 本轮验证与限制

Linux Node24.19.0/npm11.9.0：owner专项24/24、全部pipeline144/144、CRLF独立副本owner+严格保护58/58，均无跳过；版本规则0.7.4-rc.3及源码/工作流守卫通过。原120测试保留。本轮所有发布测试使用隔离mock API/临时文件，未创建真实Release/Tag。真实Environment设置、owner审批API字段与权限、等待/批准/拒绝平台行为、新CI、Windows构建/实机均待验证。
