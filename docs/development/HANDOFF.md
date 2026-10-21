# G3 Inno版本修复交接

IMPLEMENTED_PENDING_CI。基线605666c17d1b43a07f0cc1559741c3d6c53daf1b；fix/g3-inno-version → develop；版本0.7.4-rc.4。

恢复入口：tools/ci/windows-version.mjs为唯一映射；installer.iss/PowerShell/应用PE同步校验。batch在原历史worktree构建，但用明确coordinator绝对路径运行metadata/打包/ISCC模板/ZIP；package-windows的source root必须是cwd，不能取工具目录。package-toolchain记录并校验源与工具各自身份；artifact-verify独立比对工具文件摘要；owner原人工批准不变，绑定追加工具/映射。
已核实pending：rc.1=df6b5a3ab1b07a966e363ac174634907abf1cf47，rc.3=605666c17d1b43a07f0cc1559741c3d6c53daf1b；新合并再增加rc.4，不删除或跳过任何旧项。版本队列/历史撤回/Tag墓碑/原事务保持；无Release/Tag操作。
本地专项30、pipeline150、CRLF30全PASS；本地真实Inno尝试被Wine socket限制阻断，不得称编译成功。新增PR Windows原生ISCC四版本测试（真实编译、fixture载荷）应先给出证据。完整GankSoft编译、历史RC重建、安装/启动/卸载/ZIP及Win10/11人工未验证。
下一步：只读新PR准确SHA CI及inno-compile.json→必要时最小修复；通过后owner独立pr-trust授权并决定合并。必须由新develop Run使用新coordinator，旧失败Run重跑不会获得修复工具。原流程全部成功后才等待rc-publish-owner实际人工审批；不提前批准/发布。
远程检查点及首次Run回执在PR描述/最终报告；文档提交自身SHA用git log -1 -- docs/development解析，不循环补写未来ID。核实触发即退出，不等待CI。

## PR #9 下载名与解压路径续修

IMPLEMENTED_PENDING_CI；继续fix/g3-inno-version，前序85e861cbd478ea4d29896b5c7932331b4f201465，仍为0.7.4-rc.4。本段为最新增量结果；上文30/150为前序记录。
下载名：GankSoft-v{version}-win64-setup.exe / GankSoft-v{version}-win64-portable.zip；ZIP根GankSoft/。完整内部name及source SHA/tool SHA/run ID/attempt保留在metadata、哈希manifest和报告；新delivery字段与工具树受验证。各历史源码SHA独立结果目录及不同SemVer文件名不碰撞，同版本不同Run不得混用，原Release草稿摘要冲突即拒绝。
Windows实解压脚本共用于PR回归和真实包：80/100字符目标目录、最长ZIP/绝对路径记录、传统260字符限制、全文件SHA256/覆盖率、解压metadata与期望构建身份核对。解压报告绑定ZIP摘要、文件名、Run/attempt及内部构建身份；缺失/错误/旧报告均阻断。原Inno数值/文本映射、四版本实际编译门禁、安装/启动/卸载/便携smoke及owner批准策略保留。
PASS（Linux Node24.19.0/npm11.9.0，本次工作树）：专项33/33、全部pipeline153/153（原150保留+3）、CRLF专项33/33、基础设施core5/5、Python ZIP回归1/1（含中文非UTF8默认编码），无skip。version:check相对origin/develop仍PASS。源码hash更新至docs/ci/evidence/g3-inno-validation.json。
NOT_RUN：本地无Windows，Windows原生Expand-Archive与深目录实际验证待新CI；完整应用包及历史rc.1/rc.3/rc.4实际重建仍待合并后原develop流程。本地Linux ZIP验证不能替代Windows证据。前序Inno本地环境阻塞不变，不宣称G3完成。
下一步：所有者检查新SHA对应pr-gate/pr-trust、Windows原Inno编译和ZIP实解压日志/报告，独立授权后决定合并；原develop全门禁通过后才允许rc-publish-owner人工批准。未合并、未发布、未修改Ruleset/Environment。新完整SHA/Run回执在PR描述及最终交接，核实触发即退出。
