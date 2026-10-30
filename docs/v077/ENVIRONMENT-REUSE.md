# GankSoft v0.7.7 — 跨 Work 测试环境与最小用例复用

> 本文是**可复用环境的规范与入口**，不是“Windows 已经测试通过”或“GitHub 已经有可下载构建”的宣称。环境安装与编译有成本；只在输入、运行平台和文件哈希匹配时复用。

## 1. GitHub 中已经永久保存什么

- 依赖版本：仓库 `package-lock.json`，Node.js 24、Electron/npm 按锁文件恢复。
- 测试目录：`tools/validation/v077/`，单一 runner、模块注册表、失败收集器。
- 12 个模块/20 个功能组：`tools/validation/v077/modules.mjs`；独立模块步骤：`docs/v077/modules/`。
- 最小数据定义：`tests/fixtures/ganksoft/v077-minimal.json` 和既有 `definition.json`；实际写库通过 `tests/fixtures/ganksoft/b2.ts` 在**每轮隔离目录重新生成**，Schema606，避免状态串扰。
- `docs/v077/E2E-RESULTS.json` 是唯一可持久化用例/平台结果；`DEFECT-INBOX.json` 只收集用户报告和实际失败观察，不代替最终定责。

## 2. 进入新的 Work 时优先运行

```bash
git fetch origin
git switch feature/v077
# 不覆盖其他未提交工作；按仓库规范确认干净且远端 HEAD
node tools/validation/v077/environment.mjs status
# 如果有合法并且同平台的 Actions Artifact，请先按第3节恢复
node tools/validation/v077/environment.mjs prepare
node tools/validation/v077/module-plan.mjs audit
node tools/validation/v077/module-plan.mjs show cards
node tools/validation/v077/run.mjs list --module cards --baseline
```

`status` 不安装/不编译，只检测环境；`prepare` **只在**依赖无有效本地标记时 `npm ci`，生产源码指纹或输出哈希不匹配时 `npm run build`，其余情况复用。首次全新云电脑的 `node_modules` 不会凭文档出现，可能仍需要一次 `npm ci`，但**有已校验的构建 Artifact 时可避免重复生产编译**。

`environment.mjs seal` 仅供**确认刚完成合法 build 的 CI/Work**生成指纹快照；若源文件被修改后未重建，不得手动调用 `seal` 将陈旧输出盖章。

## 3. 从现有 GitHub PR CI 下载生产测试构建

同一个 `feature/v077` 提交已由 **既有 `.github/workflows/pr-quality.yml` 的 PR quality 检查成功构建**后，流水线会附加：

- `v077-test-runtime-ubuntu-latest-<PR_HEAD_SHA>`
- `v077-test-runtime-windows-latest-<PR_HEAD_SHA>`

Artifact 包含：`dist/`、`dist-electron/`、`validation-results/v077/cache/runtime-manifest.json`，**不包含**用户学习数据、生成 SQLite、Node 依赖、隐私图片，也**不是 Windows 便携 ZIP**。依赖仍依赖 `npm ci`；无对应 PR/成功 CI 则目前没有此 Artifact。

操作示例（在连接 GitHub 且有 `gh` 及相应权限的 Work 中）：

```bash
# 在本仓库目录，先核对 PR head 的精确SHA、Run是否成功及平台
gh run list --workflow pr-quality.yml --branch feature/v077 --limit 10
# 使用 GitHub 上真实返回的 Run ID、真实 PR_HEAD_SHA、同OS Artifact名称
gh run download <RUN_ID> --name v077-test-runtime-ubuntu-latest-<PR_HEAD_SHA> --dir .
node tools/validation/v077/environment.mjs status
node tools/validation/v077/environment.mjs prepare
```

注意：上传是**条件触发**，仅 `feature/v077` 有 PR 并且 quality PASS 才会发生。Artifact 默认保留 **30 天**，过期、路径损坏、源文件/依赖锁/Node主版本或平台不匹配都必须退回本地 `npm run build`。不可把旧 develop、v0.7.6 RC 构建视为 v0.7.7 的有效构建。

## 4. 为什么缓存不会污染测试

- 用 Git 跟踪的 `src/`、`shared/`、`electron/`、`public/`、构建脚本与配置、依赖锁的**实际工作区文件内容**计算 SHA-256 指纹。纯测试/文档变更通常不需要重建生产界面。
- 检查 OS/arch/Node 主版本，并逐文件校验 `dist/` 和 `dist-electron/` 的路径、大小、SHA-256；缺文件、过期或来源不一致时拒绝复用。
- `validation-results/v077/cache/`、`node_modules/`、`dist/`、`dist-electron/` 均已被 `.gitignore` 排除；构建 Artifact 与长期 Git 源码归档分开。
- 测试 fixture 只存**版本化配方**，每次执行通过既有 B2 工厂生成**新临时数据库**，用完销毁。不可将活动 SQLite 上传或复用；否则测试互相影响、把错误隐藏成 PASS。
- 代码变更后源指纹失效，不能为了省时间跳过强制 rebuild。只改变文档或测试说明且正式源码不变时，优先复用本地/CI 已验证产物。

## 5. 不能做的事

- 不把 `node_modules`、`dist`、完整 SQLite、可识别的用户日志直接提交到 Git 仓库。
- 不放宽 `pr-gate`、`pr-trust`、质量测试、Windows 实机验收，也不创建第二套发布工作流。
- 不把环境 `READY` 当作某个功能 CASE 的 `PASS`。功能测试另走正式 Electron GUI、后端读回与重启证据。
- 不声称脚本写入 GitHub 就能在任何新的 Work 中**无网络、无依赖安装、永远不构建**。

## 6. 下一轮 Work 一句话

从 `feature/v077` 最新 SHA 恢复，先 `environment.mjs status` 再按需恢复 GitHub Artifact/运行 `prepare`；按 `module-plan.mjs list` 和对应模块文档逐条模拟用户操作。**先完成 T1/T2 全模块缺陷收集，I3 去重之后才统一进入 F4 修复。**
