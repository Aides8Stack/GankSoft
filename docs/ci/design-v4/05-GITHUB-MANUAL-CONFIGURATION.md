# GitHub 网页端需要用户审核的设置与发布前安全检查

以下事项**不能仅通过本 ZIP 文件自动生效**。Codex 应核对哪些配置实际可用，并输出 `DONE / NEEDS_USER_ACTION / NOT_RUN`。

## A. 流水线上线先后顺序

1. 在 Private 的真实 develop 基线上开发并验证新 workflow，先审计当前的 PR #3，避免两个 CI 改造 PR 相互竞争。
2. PR #3 如应被替代，先写清楚差异并等待用户决定；未经授权不自动关闭它。
3. 用户审核并手动合并 v4 基础设施 PR 到 develop；此时 develop 的新 `push` 流水线才能开始工作。合并前必须确认本次基础设施改进已正确更新应用版本，否则意外触发版本门禁失败。
4. 先在受控环境使用测试版本验证“合并 -> 自动运行 -> 自动 RC Release”一次；不要误将测试打包宣称为 Stable。
5. 需要 `workflow_dispatch` 的管理入口，须将已批准工作流放入默认分支 `main` 后才能在 Actions UI 中正常使用；该动作也要由用户批准，不允许 Codex 自动更新 main。
6. 公开仓库前必须完成全历史、个人数据与依赖版权审计，再由用户单独点击 Make public。

## B. GitHub Actions / General

- Actions 仅允许经过审核、来源可信的 Actions；第三方 Action 尽量 pin 到完整不可变 SHA。
- 默认 `GITHUB_TOKEN` 权限设置为只读；只有需要建立 GitHub Release 的独立 Job 用 `contents: write`。
- 检查 Fork pull request 的 workflow 权限，不向来自外部的 PR 提供 Secrets/可写 Token。
- 在公开前审计所有 Actions、Secrets、Artifacts、旧 ZIP 和日志；明确什么内容将被公开。

## C. Branch Protection / Rulesets

- 对 `develop` 和 `main` 设置 require pull request、稳定 required status checks、禁止 force push/deletion。
- `develop` 由维护者本人**手动审核并合并**；不设置自动合并。单人维护场景不要启用要求非自己的独立审批人数而导致无法自行合并。
- 外部没有写权限的用户不能修改或合并原仓库；Fork/外部 PR 在公开仓库可能仍存在，不应承诺彻底禁止他们创建 PR。
- 限制敏感 Tag/Release 的编辑和写入，校验允许操作的 GitHub App 与 Token 范围。
- 仓库免费计划、可见性和 Ruleset 功能取决于 GitHub 实际限制，不能猜测所有可选开关都可用。

## D. Environments

- RC 自动发布不增加额外人工审核（用户已在合并 PR 时完成授权）；但强制质量、安全和包校验。
- 可考虑发布 Job 使用 `rc-publish` 环境，受控分支限定 develop，无额外人工审批。
- Stable 使用 `release-production` 环境，要求人工 reviewer 或独立人工触发，避免自动发布。
- 如果只有 Aides8Stack 一人，开启 Prevent self-review 可能导致无法自行批准，请谨慎配置。GitHub Free 的 Required Reviewers 在公开仓库可用，私有仓库不一定具备。
- 审计 `Allow admins to bypass`；用户必须了解允许管理员绕过的安全后果。

## E. Public 之前必须人工确认

- [ ] 所有受控分支/历史 refs 已完成 Secrets、数据库和个人图片审计
- [ ] 旧 GitHub Actions 日志和 Artifact 不含不应公开的数据
- [ ] 教材、错题和图片等内容已核对合法再分发权限
- [ ] 无过宽的 Actions 写权限/第三方 GitHub App 权限
- [ ] main/develop 已配置可用的保护规则
- [ ] 公开操作获得用户新的一次明确授权

## F. Release 管理位置

- RC 下载：`https://github.com/Aides8Stack/GankSoft/releases`，Release 标记 `Pre-release`。
- Release 明确保留可回滚的历史版本号、来源 SHA 与 SHA256SUMS。
- 错误版本可经人工决策标注、删除或用新版本替代；不要自动重写 Tag/资产。
- 若启用 GitHub Immutable Releases，请先创建 Draft、上传完整资产、核对后再发布；不可变发布后不得原地替换二进制。

## G. 重点官方文档

- 触发 workflow / 默认分支：<https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow>
- GITHUB_TOKEN 事件行为：<https://docs.github.com/en/actions/concepts/security/github_token>
- 保护分支：<https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches>
- Environments：<https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments>
- Immutable Releases：<https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases>
- GitHub Actions 计费：<https://docs.github.com/en/billing/concepts/product-billing/github-actions>
