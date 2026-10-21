# G3 Inno数字版本与历史RC打包恢复

基线605666c17d1b43a07f0cc1559741c3d6c53daf1b；独立分支fix/g3-inno-version。只处理安装器数字版本及直接关联历史队列，继承G2及既有业务/ASAR结果。
P1 DONE：失败Run39522154104/Job118970526040原日志确认历史df6b5a3/rc.1先失败；pending包含rc.1(df6b5a3)、rc.3(605666c)，无已发布RC。Inno数字ProductVersion直接用了SemVer；Electron packager自身parseInt会折叠RC数字资源。源码历史与协调工具不能混同。
P2 DONE：统一版本映射core各0..65535，rc.N→major.minor.patch.N(1..65534)，stable→major.minor.patch.65535；完整SemVer文本不变，不支持的预发布/build metadata fail-closed。AppVersion/PE文本保留完整SemVer，安装器和应用PE数字使用相同四段映射。显式记录工具coordinator SHA+工具树文件hash，源SHA/版本/锁文件仍为历史worktree；不覆盖历史源码，调用协调工具时显式使用历史source root。
P3 本地DONE/真实Windows待验证：专项映射/真实PE资源/真实Inno编译（优先在本环境安装编译运行工具；无法执行则NOT_RUN）、历史worktree/工具身份/制品验证和审批相关pipeline回归。不重跑无关业务/ASAR。
P4 IN_PROGRESS：版本正常递增rc.4，源数据/工具身份/哈希入制品及原审批摘要；新增PR→develop，经原pr-gate/pr-trust。核实保存/触发即交接，不等待CI，不修改Environment/Ruleset，不合并或发布。

## PR #9 续修：下载名与Windows解压路径

同分支继续，不重新task:init，不新增PR；前序85e861cbd478ea4d29896b5c7932331b4f201465。版本仍为本PR未合并的0.7.4-rc.4（相对develop的rc.3满足递增）。
P5 DONE：下载名改为GankSoft-v{SemVer}-win64-{setup.exe,portable.zip}；ZIP根固定GankSoft/。内部name、源码SHA、协调工具SHA及文件摘要、Run ID/attempt、source worktree隔离保持。新证据协议要求精确文件名与实际Windows解压报告；既有已发布legacy包保留原协议，不为新协调构建豁免证据。
P6 本地DONE / Windows NOT_RUN：Windows原生Expand-Archive实解压至80和100字符长的目标目录；每个文件与完整manifest核对，解压出的metadata与期望源/工具/run身份逐字节核对。记录最长ZIP路径与绝对路径，达到260字符直接拒绝，无长路径开关/扩展路径依赖；失败删除旧PASS报告。PR原ci:quality的ZIP回归在Windows调用同一脚本；真实RC打包调用同一脚本，artifact/release校验其证据。
P7 IN_PROGRESS：专项/全pipeline/CRLF/ZIP及基础设施回归，更新文档，快进保存同PR，核实远程SHA与新Run后退出；不等待CI或合并/发布。
