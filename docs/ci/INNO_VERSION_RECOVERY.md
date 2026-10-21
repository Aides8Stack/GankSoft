# G3 Inno数字版本与历史RC恢复

基线 develop `605666c17d1b43a07f0cc1559741c3d6c53daf1b`；本次修复版本 `0.7.4-rc.4`。状态 IMPLEMENTED_PENDING_CI，**没有实际安装器成功或G3恢复完成的结论**。

## 已核实根因

失败Run39522154104/Job118970526040原日志：ISCC 6.7.1在历史源码df6b5a3（rc.1）上先失败，VersionInfoProductVersion不能接受SemVer预发布文本。最新rc.3尚未开始构建。preflight原日志计划包含：

| 待发版本 | 源码SHA | 状态 |
| --- | --- | --- |
| 0.7.4-rc.1 | df6b5a3ab1b07a966e363ac174634907abf1cf47 | PENDING |
| 0.7.4-rc.3 | 605666c17d1b43a07f0cc1559741c3d6c53daf1b | PENDING |

两份历史源码都包含同一错误配置，当前Release列表为空；legacy v0.7.3-rc1不删除或复用。rc.2未作为develop first-parent版本合入，不是被删除的队列项。修复合并后队列将按原算法再加入rc.4。

现有PR质量流程不执行ISCC，业务/协议/ASAR与便携测试成功不能证明Inno编译成功；真正安装器编译在下游windows-package，故此处才暴露故障。另查已安装@electron/packager的resedit实现：parseInt('4-rc')会折叠预发布序号，原应用EXE文本保留SemVer但固定数字资源不能区分RC。

## 唯一映射：ganksoft.windows-version/1

| 真实/显示版本 | Windows File/Product数字资源 |
| --- | --- |
| 0.7.4-rc.1 | 0.7.4.1 |
| 0.7.4-rc.3 | 0.7.4.3 |
| 0.7.4-rc.4 | 0.7.4.4 |
| 0.7.4 | 0.7.4.65535 |

major/minor/patch各0..65535；rc序号1..65534，65535保留正式版。在项目支持域内单射：所有RC严格升序且小于同core正式版；下一个core又高于前一个core的正式版。不截断、不回绕；超界、非规范前导零、alpha/beta等未分配预发布及build metadata拒绝。无限SemVer无法无碰撞映入有限四段WORD，本策略明确限制Windows可打包域，不假装支持所有SemVer。本项目现行develop版本本就要求规范rc.N。

统一函数在tools/ci/windows-version.mjs。Inno的AppVersion、VersionInfoTextVersion、VersionInfoProductTextVersion保留完整SemVer；VersionInfoVersion和VersionInfoProductVersion用四段数字。AppVersion同时用于安装显示和卸载面板DisplayVersion。应用ASAR/package.json仍为完整SemVer；Electron先用数字映射写PE固定资源，再明确写回FileVersion/ProductVersion文本为完整SemVer。

PowerShell不删除旧校验：同时验证安装器/应用PE的四段File和Product数值、完整SemVer文本；安装后核对完整版本、源码/工具身份、EXE字节与便携版一致，以及卸载注册表DisplayVersion。保留portable smoke、安装/启动/卸载、ZIP完整性、ASAR内版本、SHA256和制品验证。

## 历史源码与协调工具分离

不覆盖历史worktree内的脚本、不改历史提交、不删/跳过旧RC。batch.mjs仍为每个原intent独立检出历史source SHA并npm ci/build：

- 应用源码、package版本/锁、runtime依赖、历史smoke用历史工作树。
- metadata.mjs、package-windows.mjs、windows-package.ps1、installer.iss、版本模块、ZIP工具使用本次coordinator中明确绝对路径。package-windows.mjs的应用root改为**当前历史worktree**，不能从工具脚本目录反推应用源码。
- 新packagingToolchain记录coordinator完整SHA、协调锁摘要、实际工具文件摘要；调用时检查coordinator SHA且工具/锁文件必须与该提交的Git内容一致，拒绝dirty或替换工具。文本摘要明确采用UTF8/LF规范化，避免Windows checkout CRLF改变工具身份。
- source.json/build-metadata.json/installer报告/TEST_REPORT均保留历史source SHA、SemVer、源锁摘要，并增加同一windowsVersion/packagingToolchain；installer报告另记录实际ISCC版本与文件SHA256。
- artifact-verify按其同一coordinator checkout独立计算预期工具摘要，要求source/元数据/安装器报告一致；owner审批请求把工具身份、数字映射与manifest一起绑定。原人工批准策略及有效期不变，Summary同时展示source/tools SHA。

新版工具链仍受原PR完整SHA审查、pr-gate/pr-trust、develop合并授权及同一Run全门禁约束，不从任意下载脚本或候选制品中获取工具。没有第二套发布流水线。

## 针对性验证与尚未验证项

本轮Linux实际PASS：映射穷举全部65534个合法RC槽/边界拒绝、真实PE资源写入读取、真实临时Git历史worktree的metadata子进程、dirty/错tool SHA拒绝、版本/源码/工具/installer证据篡改拒绝；专项30/30、pipeline150/150、CRLF独立副本30/30，零跳过。owner原24项保留并适配新增必需制品字段。

真实Inno：已取得官方6.7.1下载，SHA256=4d11e8050b6185e0d49bd9e8cc661a7a59f44959a621d31d11033124c4e8a7b0（安装程序，不是编译结果）。尝试Wine执行受本环境Unix socket限制（wineserver: socket: Operation not permitted）；**未取得实际编译成功证据**，不能记PASS。没有绕过环境限制或请求管理员权限。

PR Windows质量Job新增强制实际ISCC回归：使用生产installer.iss编译0.7.4、rc.1/rc.3/rc.4四个最小PE载荷，实际解析输出Setup PE的数字/文本资源，报告validation-results/ci/inno-compile.json随原PR制品上传。缺compiler/编译失败/资源不符均阻断pr-gate；缺少时沿用Chocolatey安装流程，锁定已故障Run使用的6.7.1。该测试是实际编译，但载荷是fixture，不冒充GankSoft安装/启动验收。

完整应用的实际编译、Windows安装/启动/卸载、注册表显示版本、便携ZIP和SHA256来源证据，以及历史rc.1/rc.3重建，仍须修复获批合入develop后的原Windows流水线验证。本轮提交后不等待CI，不提前声称这些通过。Win10/11人工验收仍NOT_RUN。

## 交接

所有者先读新PR实际CI（尤其Windows的Actual Inno Setup步骤和inno-compile.json），再对完整SHA做既有可信授权；必需状态通过后自行决定合并。不要重跑旧39522154104的旧coordinator来期待使用新工具。新develop自动Run应按原队列先重建rc.1，再rc.3/rc.4；全部质量、安全、Windows、artifact-verify成功后才进入rc-publish-owner。到该阶段重新检查完整实时保护并人工批准，不复用旧批准。

如果新CI没有真实Inno成功或原队列有身份冲突，保持阻断、读取具体日志，不修改Ruleset/Environment、不忽略版本队列、不删除或覆盖Tag/Release。本任务不合并、不发布。

官方语义：
https://jrsoftware.org/ishelp/topic_setup_versioninfoproductversion.htm
https://jrsoftware.org/ishelp/topic_setup_versioninfoproducttextversion.htm
https://jrsoftware.org/ishelp/topic_setup_appversion.htm
