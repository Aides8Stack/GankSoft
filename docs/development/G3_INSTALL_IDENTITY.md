# G3 安装身份故障：证据与修复范围

基线：develop a00700124d895eed1a002c231456233b10296a88；原 PR #9 已合并。
2026-10-21 重新读取远程 develop、Run 39528225102 / Job 118991333874 完整日志、Artifact 12314936808（windows-build-reports），解压原 install.log、uninstall.log、installer.json、source.json；并读取 Inno Setup is-6_7_1 原始源码。未重做 G2 全历史安全审查。

## 确认的根因

- 构建/原始 AppId：`GankSoft-0.7.4-rc.1-develop-947726dd-df6b5a3ab1b0-windows-x64-39528225102-1`。基线 installer.iss:17 将 ArtifactName 原样赋给 AppId，windows-package.ps1:22 传完整 meta.name。
- 实际卸载键：`HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Uninstall\GankSoft-0.7.4-rc.1-develop-947726dd-df6b5a3ab1b~FDA75533_is1`。install.log:568 创建；uninstall.log:18 删除；两份日志分别报告安装、卸载 succeeded。
- 测试预期键：同根路径下的完整 meta.name + `_is1`，基线 windows-package.ps1:49–50。它不是实际键。完整 AppId 自身没有被改写；Inno 在生成卸载键基名时转换了字符串。
- Inno 原始实现：`jrsoftware/issrc` 的 `is-6_7_1/Projects/Src/Setup.MainFunc.pas:358–383`，GetUninstallRegKeyBaseName 对长度 >57 且字符 <=126 的 AppId 取前48字符、追加 `~` 和原串 CRC32（8位十六进制）。Setup.Install.pas:2770–2775 先 ExpandConst，再调用该函数。故第一次不一致发生在 Inno 运行时生成卸载键基名之处；测试错误地假定 AppId 和注册表键基名恒相同。
- install.log:2 确认 Inno 6.7.1；:4 记录 VERYSILENT/SUPPRESSMSGBOXES/NORESTART/SP-/隔离 DIR/TASKS=/LOG；:8–11 记录进程有 Administrative 权限，但 Administrative install mode=No、HKCU、64-bit install mode=Yes。与 lowest/x64compatible 模板一致，不是误查 HKLM 或32位视图。
- Job 原日志显示安装器/应用数字与文本资源均 PASS；source SHA 为 df6b5a3ab1b07a966e363ac174634907abf1cf47，协调工具为 a00700124d895eed1a002c231456233b10296a88，两个锁身份独立保留。
- 原报告 install=PASS、launch=FAIL、uninstall=PASS。基线 windows-package.ps1:45 在身份和注册表检查前已设置 stage=launch，实际没有执行 installed smoke，因此 launch 应为 NOT_RUN。
- 原产物没有注册表值快照；DisplayVersion、InstallLocation、UninstallString 的实际值不能从这些证据追溯。模板和 Inno 源码能说明预期写入方式，不能把预期冒充实测值。

来源：
- https://github.com/Aides8Stack/GankSoft/actions/runs/39528225102/job/118991333874
- https://github.com/Aides8Stack/GankSoft/actions/runs/39528225102/artifacts/12314936808
- https://github.com/jrsoftware/issrc/blob/is-6_7_1/Projects/Src/Setup.MainFunc.pas#L358-L383
- https://github.com/jrsoftware/issrc/blob/is-6_7_1/Projects/Src/Setup.Install.pas#L274-L311

## 为什么 PR #9 未覆盖

原 test-inno-compile.mjs 使用短 `GankSoft-{version}`，只编译 fixture、校验 PE 资源，不实际安装/重装/并存/查注册表/卸载。首次完整历史 RC 安装使用了长构建名，触发真实 Inno 转换。故保留原资源断言并扩展专项实际安装回归，不能删除注册表验收。

## 身份策略与兼容边界

现行模板把每个构建作为不同安装（AppId、默认安装目录、快捷方式组原来都含构建名），没有共享稳定升级通道。继续每构建隔离，不引入跨 RC 自动覆盖或降级迁移。

新 scheme `ganksoft.installation/1` 对版本、完整源码/协调工具 SHA、两个锁哈希、分支、完整构建名、Run ID/attempt、windows-x64 的有序序列作 SHA-256，使用192位摘要，AppId=`GankSoft-`+48位小写hex，总长57，卸载键61字符。摘要碰撞是192位哈希风险，不是截断长名称导致的相同前缀；专项覆盖同前缀SHA、边界和一万组Run身份。

同一安装包重装保持身份，使用 Inno 原有重装语义；不同版本、源码、工具或Run/attempt隔离。默认目录/快捷方式也使用新AppId，避免与旧长名称安装路径交叉覆盖。旧程序保留原卸载器和键，不自动认领、不删除旧安装或用户学习数据；本修复不提供旧身份到新身份的原位迁移。Windows fixture 将验证四版本及同版本两构建并存/重装/逐个卸载；该结果仍待CI。

构建 meta.name 和 source/tool/lock/run 身份完整保留；build-metadata.json 与 source.json 按文件哈希精确比对。安装身份单独记录在 source.installation，ISCC和严格验证器共同使用。下载名保持 GankSoft-v{version}-win64-setup.exe / portable.zip，ZIP顶层保持 GankSoft/。

注册表通过显式 .NET HKCU/Registry64 读取精确键，只记录本次键及四个相关值；严格验证应用名、完整SemVer、实际目标路径、精确引号包围的 unins000.exe 命令及文件存在。卸载执行真实 unins000.exe，校验退出码、所有打包文件及卸载器移除、精确注册表键不存在；不枚举或删除其他键。

报告从 NOT_RUN 开始，区分 package/compile/install/identity-validation/registry-validation/launch/uninstall/portable-zip/windows-extraction；保留失败阶段、实际键、值与结果。清理失败同样阻断。artifact-verify 额外要求新身份及新阶段 PASS，原ZIP、全文件哈希、manifest、80/100字符目录和路径边界断言保留。

## 验证边界

PR原有Windows Inno步骤现在执行实际编译和fixture安装回归，五个案例（stable、rc.1/3/4、另一rc.1构建）同时存在，逐个重装与卸载；fixture不是可启动GankSoft，launch明确NOT_RUN。未改PR workflow、不交付fixture为Release、不弱化pr-gate/pr-trust。实际历史应用安装/Smoke/ZIP/产物验收仍由既有develop-rc队列完成，不能把PR fixture或Linux测试冒充它。

本地Git历史包含rc.1、rc.3、rc.4的原始源码，未发现package.json版本为0.7.4的历史提交；0.7.4仅作为版本映射及Inno fixture验证。没有对应源码身份时，完整稳定应用验收只能记NOT_RUN，不能将当前源码改版本冒充历史源码。

行为变更按现行pr.mjs/checkVersion门禁将当前版本rc.4提升为rc.5，只改package/lock的版本字段，无依赖升级；远程matching-refs/tags/v0.7.4-rc.5为空、Release列表为空。历史队列不删除；未创建Tag/Release。
