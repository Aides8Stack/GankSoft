# GankSoft Pipeline v4.0 — Codex 工作流设计与完整执行指令包

## 你的最终目标（已经在指令中落实）

1. **Work 只负责开发和当前环境的必要测试，Commit/Push、保存交接后立即退出**，不等待 CI/PR/打包/Release。
2. 用户**亲自审核 PR 并合并到 `develop`** 后，GitHub 自动对合入代码运行全量质量 + 安全检查、构建 Windows 安装器/ZIP、安装测试，并自动发布新的 **RC Pre-release**。
3. 每次实质改进都要**修改版本号**，`package.json`/lock/安装器/Tag/Release 必须一致，永不覆盖上一个版本。
4. 日常 PR 不打包，不重复触发 Push/PR 两套相同的重型工作流；合并后 RC 的重型测试属于另一个阶段。
5. Stable 正式版仍要 Win10/11 同包人工验收和发布人工批准。
6. 未来可公开仓库，但公开前严格审计、用户批准；未经授权者不能修改、合并、发布原仓库。

**请注意：本 ZIP 是让 Codex 实施的完整设计与验收指令，不是已经写入 GitHub 的工作流，也不是已测试的软件安装包。**

## 文件清单

- `01-Codex-MAIN-INSTRUCTION.md` —— **主执行指令：直接复制给网页版 Codex / Work**。
- `02-ARCHITECTURE-AND-ALGORITHMS.md` —— 事件矩阵、去重、漏发对账、Release 状态机。
- `03-VERSION-AND-RELEASE-CONTROL.md` —— 必须改版本号、RC 自动发布、Stable 人工发布、撤回。
- `04-ACCEPTANCE-TESTS.md` —— P0～P5 的完整测试矩阵和验收记录模板。
- `05-GITHUB-MANUAL-CONFIGURATION.md` —— GitHub 网页端权限/保护/公开前检查。
- `06-WORK-HANDOFF-AND-RESUME.md` —— 交接、立即退出、中断恢复和新会话提示词。
- `07-MIGRATION-ROLLBACK.md` —— 现有 PR #2/#3、旧 workflow 迁移和失败回滚。
- `templates/` —— **只供 Codex 对照理解的触发器草案；模板故意 fail closed，不能原样部署**。

## 如何使用

**最简单的方式**：将本 ZIP 上传到网页版 Codex 或 ChatGPT Work，发送：

> 请解压附件，读取 `01-Codex-MAIN-INSTRUCTION.md`，按其 P0→P6 阶段依次实施，并遵守其他文档的测试矩阵与权限要求。每阶段分步修改、测试、提交、推送、交接；全部本地工作和远程保存完成后立即退出，不等待 GitHub Actions。未经我明确授权不得合并 PR、切换 Public 或发布 Stable。

如果 ZIP 内容不能自动读取，就单独上传 `01-Codex-MAIN-INSTRUCTION.md`，再上传其余支持文档。

## 现有仓库核查时点

- 仓库：`Aides8Stack/GankSoft`；默认 `main`，集成 `develop`。
- 仓库仍是 Private；`package.json.version` 在 develop 为 `0.7.3`。
- PR #2：图片模块 Draft；PR #3：旧版 CI 优化 Draft；均未被本次设计修改。
- develop 只有一个 `quality.yml`；当前尚无 GitHub Release。
- 上述事实是核查时记录；实施前必须重新验证最新状态。

## 官方参考

GitHub Actions 计费：<https://docs.github.com/en/billing/concepts/product-billing/github-actions>

GitHub 手动触发：<https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow>

GitHub Token 触发语义：<https://docs.github.com/en/actions/concepts/security/github_token>

GitHub Release 不可变性：<https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases>
