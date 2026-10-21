# G3 Inno版本修复交接

IMPLEMENTED_PENDING_CI。基线605666c17d1b43a07f0cc1559741c3d6c53daf1b；fix/g3-inno-version → develop；版本0.7.4-rc.4。

恢复入口：tools/ci/windows-version.mjs为唯一映射；installer.iss/PowerShell/应用PE同步校验。batch在原历史worktree构建，但用明确coordinator绝对路径运行metadata/打包/ISCC模板/ZIP；package-windows的source root必须是cwd，不能取工具目录。package-toolchain记录并校验源与工具各自身份；artifact-verify独立比对工具文件摘要；owner原人工批准不变，绑定追加工具/映射。
已核实pending：rc.1=df6b5a3ab1b07a966e363ac174634907abf1cf47，rc.3=605666c17d1b43a07f0cc1559741c3d6c53daf1b；新合并再增加rc.4，不删除或跳过任何旧项。版本队列/历史撤回/Tag墓碑/原事务保持；无Release/Tag操作。
本地专项30、pipeline150、CRLF30全PASS；本地真实Inno尝试被Wine socket限制阻断，不得称编译成功。新增PR Windows原生ISCC四版本测试（真实编译、fixture载荷）应先给出证据。完整GankSoft编译、历史RC重建、安装/启动/卸载/ZIP及Win10/11人工未验证。
下一步：只读新PR准确SHA CI及inno-compile.json→必要时最小修复；通过后owner独立pr-trust授权并决定合并。必须由新develop Run使用新coordinator，旧失败Run重跑不会获得修复工具。原流程全部成功后才等待rc-publish-owner实际人工审批；不提前批准/发布。
远程检查点及首次Run回执在PR描述/最终报告；文档提交自身SHA用git log -1 -- docs/development解析，不循环补写未来ID。核实触发即退出，不等待CI。
