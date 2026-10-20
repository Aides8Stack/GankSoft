# 版本号和 Release 管理规范

## 1. 单一应用版本号

- `package.json.version` 是唯一事实源；`package-lock.json` 必须同步；UI 显示、Inno Setup 安装包版本、源码清单、Tag、Release 标题必须使用相同版本。
- 应用改进、功能新增、Bugfix、数据协议/打包或 CI 行为更改：**每个被批准合并的改进 PR 必须具有新的唯一版本号**。
- PR 不得使用和最新 develop 相同的版本号，不能与任何现存 Tag / Release 的版本冲突。与 develop 比较要验证版本递增和父版本关系；PR 过时必须更新。
- 仅 README、注释、交接报告等真正的纯文档变更可以不 bump、不发布；不得把业务变更伪装为纯文档。
- 版本号由开发任务在提交 PR 前写入仓库；不要在合并后 CI 中暗中调用 `npm version` 并 Push，这会产生权限、溯源和触发问题。
- 可供 Codex 使用的命令示例（需核实实际最新版本）：

```bash
npm version 0.7.4-rc.1 --no-git-tag-version
npm ci
npm run check
```

### 建议的版本序列

| 场景 | 示例版本（仅示例） | Git Tag | 发布类型 |
|---|---|---|---|
| 从 0.7.3 开启下一改进 | 0.7.4-rc.1 | v0.7.4-rc.1 | Pre-release |
| 再一次改进 | 0.7.4-rc.2 | v0.7.4-rc.2 | Pre-release |
| 第三次改进 | 0.7.4-rc.3 | v0.7.4-rc.3 | Pre-release |
| 经人工确认正式版 | 0.7.4 | v0.7.4 | Stable（单独验收） |
| 下个改进周期 | 0.7.5-rc.1 | v0.7.5-rc.1 | Pre-release |

`0.7.4-rc.2` 不能替换 `v0.7.4-rc.1` 附件；用户可以选择继续使用旧版本。

## 2. 同时开发的两个 PR

例如 PR A 和 PR B 同时基于 `0.7.3`，两者都使用 `0.7.4-rc.1`：
1. A 先通过并被人工合并后，develop 应已有 `0.7.4-rc.1`。
2. B 再次通过前必须刷新受保护的 develop 基线，并改成 `0.7.4-rc.2`；lock、测试和 PR gate 全部重跑。
3. 若冲突或版本未变，禁止合并或阻止自动发布；禁止用“末尾追加 run ID”偷偷绕过应用内版本号重复问题。
4. 若使用 Merge Queue，要核实 Queue 的最新 merge-group 基线和版本门禁；不能只测试过时 PR 原始 head。

## 3. 合并后的自动 RC

- 触发：`develop` 出现经授权审核合并的新代码 Commit。
- 版本验证：应用内版本、tag、release、安装包必须一致。一个版本只能绑定一个真实 SHA 和一组不可更改的发布制品。
- 质量门禁：完整业务、协议、SQLite、复盘、图片、数据往返、原生依赖、Windows 安装器真实测试。
- 安全门禁：无高危未处理漏洞/密钥/危险工作流写权限；证据完整；合并来源可信。
- 发布事务：Draft -> 上传完整 Asset -> 哈希核对 -> Pre-release Public。执行失败不公开半成品。
- Release 页面应清楚标示 `RC / Testing / Windows 10/11 manual: NOT_RUN`，不能描述为稳定可用或人工验收成功。
- 如果前一版 RC 已发布，下一版必须新建 Release，不自动删除/覆盖前一版。

## 4. Stable

- 稳定版本从受控 `main` 的正式版本号与固定源码 SHA 构建；不能将 RC 的 `-rc.N` 二进制直接改名为 `vX.Y.Z`。
- `npm run release:verify` 的两份 Win10/11 真实人工验收必须与**同一个正式安装包** SHA 对应；缺失为 BLOCKED，禁止伪造报告。
- 经过用户人工审批，发布 Stable；若发行不可变，发布后不得修改 Asset/Tag。
- 发布失败：保留审计资料，不允许自动“跳过门禁重试”。

## 5. 撤回 / 更正

- 发现功能差、发布错误：由维护者明确选择“保留并标注不推荐”、“撤回/删除”或“发布修复版本”。
- 优先新建修复版本 `vX.Y.Z-rc.N+1` 或新 patch，而非修改原有 Tag/安装包；对于 immutable release 可能不能复用已删除的 tag。
- 手动删除需二次确认，严禁 Codex/Work 自动删除历史 Release、旧 Artifacts 或用户数据。
- 展示标题、Release notes 可以按平台支持范围人工更正，但不得改变二进制溯源事实。

## 6. Release 命名与溯源字段

```
Release: GankSoft v0.7.4-rc.2 (Windows x64 · RC)
Tag: v0.7.4-rc.2
Source: <full SHA>
Merge PR: #<number>
Workflow run: <url + attempt>
Package version: 0.7.4-rc.2
Package-lock SHA256: <hash>
Installer: GankSoft-v0.7.4-rc.2-windows-x64-setup.exe
Portable: GankSoft-v0.7.4-rc.2-windows-x64-portable.zip
Checksums: SHA256SUMS.txt
Windows10/11 manual acceptance: NOT_RUN (unless actually signed off)
```

真实名字要按现有 `tools/ci/metadata.mjs`、`windows-package.ps1` 的来源命名实现，避免重复命名或改变现有验证链。`private:true` 在 `package.json` 的含义是禁止 npm 发布，不表示 GitHub 仓库为 Private；将 GitHub 改成 Public 也不要求把它设为 `false`。
