# GankSoft — Windows 便携测试包直接编译（默认复用方案）

## 用途与约束

用户已确认：今后需要临时获取 Windows 10/11 x64 可运行的 GankSoft 便携包进行人工体验、故障复现时，**优先复用此方案**，不要走 develop RC / stable / 发布审批流水线，不改正式标签、不发 GitHub Release、不改 main/develop，也不修改产品源码或 package.json 版本号。

这是 **GitHub Actions 的独立、仅打包任务**，使用 GitHub 托管 Windows 构建机而不是本地 Linux 对 Windows 包作无根据的宣称。打包任务本身不是 Windows 10/11 客户端人工验收；人工测试结论另行记录。

## 已成功验证的实例（2026-10-30）

- 源码分支：`feature/v077`
- 冻结源码 SHA：`2d6f9d080c40259747c218ec85ef37fee1728283`
- 独立构建分支：`build/v077-portable-test-20261030-2d6f9d0`
- 一次性构建工作流：`.github/workflows/v077-direct-portable-test.yml`（在上述独立构建分支）
- 工作流保存提交：`86148a49880ad554eb7da279d317a9620a561d88`
- [成功的 Actions 运行 #41061911548](https://github.com/Aides8Stack/GankSoft/actions/runs/41061911548)
- Artifact：`GankSoft-v077-test-2d6f9d0-win64-portable`，内含 `GankSoft-v077-test-2d6f9d0-win64-portable.zip`、`source.json`、`SHA256SUMS.txt`
- 运行结果：Windows 编译、便携目录打包、原有 Windows 便携冒烟测试、ZIP/校验清单生成、Artifact 上传均为 SUCCESS
- Artifact 到期：2026-11-13（原运行保留14天）
- 原始 `package.json` 仍显示 `0.7.6`；本测试包的源码身份始终以完整 SHA 和 `source.json` 为准，**不能把它冒充正式发布的 v0.7.7**

## 下次默认执行方式

1. 先从 GitHub 读取所需开发分支 **最新完整 SHA**，明确实际编译的源码基线。不要用旧的 SHA 冒充最新源码。
2. 由该源码 SHA 新建专用构建分支，命名为 `build/<版本>-portable-test-<日期>-<短SHA>`。不要改动或强推原功能分支。
3. 以本次成功工作流为模板，在**新建的构建分支**写入专用 `.github/workflows/<版本>-direct-portable-test.yml`：将 `on.push.branches`、`on.push.paths` 和 `checkout.with.ref` 及产物名称替换为新的构建分支、工作流路径、准确的完整源码 SHA 和唯一名称。只在该构建分支的此文件变更时自动触发，不依赖默认分支上的 `workflow_dispatch`。
4. 在 `windows-latest` 机器依次执行：
   - `actions/checkout` 精确检出该源码 SHA，关闭持久凭证
   - `actions/setup-node` Node 24，`actions/setup-python`
   - 优先复用 D 盘临时目录，`npm ci --include=dev`
   - `npm run build`
   - `node tools/package-windows.mjs`
   - `node tools/ci/windows-smoke.mjs out/GankSoft-win32-x64/resources/app.asar out/GankSoft-win32-x64/GankSoft.exe portable`
   - `python tools/build/zip-windows.py out/GankSoft-win32-x64 artifacts/<唯一测试包名>.zip GankSoft`
   - 生成 ZIP SHA-256 和 `source.json`（必须注明实际 `sourceSha`、`packageVersion`、`release=no`、`windowsClientVerified=NOT_RUN`）
   - `actions/upload-artifact` 上传 ZIP 和校验清单，推荐保留14天
5. 获取实际 Actions run ID，核对**每个关键步骤**成功，尤其不能因 `continue-on-error` 就把冒烟失败说成通过；验证已生成 Artifact，给用户可打开的 GitHub Run URL 与 Artifacts 名称。编译失败应直说失败，不生成虚构下载链接。
6. 用户打开 Actions Run → Artifacts 下载；下载得到的外层 Artifact ZIP 内有真正的 Windows 便携 ZIP；完整解压 `GankSoft/` 后运行 `GankSoft.exe`。不要单独移动 EXE。
7. 用户人工 Win10/Win11 测试时，先备份既有数据，尽量使用隔离的合成 Schema606 数据目录。核验粘贴、草稿自动保存、草稿箱找回、发布、关闭重启等重要路径；所有未完成 Windows 实机用例保持 NOT_RUN/BLOCKED。

## 禁止和注意

- **不要**为了这次用户试用而调用旧 `develop-rc.yml`、`stable-candidate.yml`、`release-control.yml`，也不要合并分支、改 protected branch、改版本号或创建 Release。
- **不要**执行 `tools/ci/portable-only.mjs prepare/finalize` 作为独立构建的必经步骤：其中具有 `refs/heads/develop` 正式发布分支限制。直接使用 `tools/package-windows.mjs` 和 `tools/build/zip-windows.py`。
- 不将 Windows hosted runner 当成真实 Win10/Win11 人工桌面验收；Windows 物理中文输入法和真实剪贴板仍需用户实机验证。
- 每次使用新的构建分支、新的完整源码 SHA 与明确标识的测试包名。原一次性分支可留作历史模板；**不得重复使用硬编码的旧源码 SHA**。
- 当前已连接 GitHub 动作支持创建分支、创建工作流文件和读取运行/Artifact 状态；未提供通用 Workflow Dispatch 写入接口。故已实证可用的「创建构建分支 + push 专用工作流自动触发」是默认方案。

