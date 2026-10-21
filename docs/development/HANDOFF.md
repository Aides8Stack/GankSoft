# G3 安装身份修复交接

状态 IMPLEMENTED_PENDING_CI；G3未完成。目标develop；基线a00700124d895eed1a002c231456233b10296a88；新分支fix/g3-inno-install-identity。

先读AGENTS/STANDARDS、TASK、PLAN、PROGRESS、TEST_REPORT及G3_INSTALL_IDENTITY.md。旧AUDIT为基础设施历史，不作为本轮G2重审依据。PR #9已合并，不修改或重开。

原故障证据：Run39528225102 / Job118991333874；windows-build-reports Artifact12314936808。实际长AppId的卸载键由Inno变为48前缀+CRC；验证脚本误用完整构建名。原注册表四字段未快照，不能假称已验证。

已实现：57字符每构建摘要AppId；源码/工具/锁/Run完整身份保留；精确HKCU/Registry64与版本/路径/卸载命令验证；完整metadata文件哈希；卸载所有payload与精确键检查；报告分阶段NOT_RUN/FAIL/PASS；真实Windows fixture安装重装并存卸载；artifact新身份/阶段强制验收。下载名和GankSoft/ZIP根不变。旧安装不迁移、不覆盖默认路径、不删除用户学习数据。

本地：专项16/16、pipeline160/160、质量5+1+202+21及build通过、Linux ASAR13套件107用例通过。Windows实际执行、完整历史应用与解压/产物验收NOT_RUN；0.7.4稳定历史源码身份尚未找到，禁止用当前源码冒充。

远程检查点/PR/CI：见下方已核实回执。通过GitHub Git Data API从已核实基线tree建立增量提交，真实parent、force=false、expected_sha；不覆盖其他文件，不改main/develop。提交后核实远程SHA、PR和Actions触发即退出，不等待Windows结束。

下一会话：先读回远程ref/PR/head与Run被测SHA；读取具体Windows Job日志、inno-install.json、installer.json及registry.json，核实真实安装/卸载和并存。PR fixture成功也不能认作历史完整应用/ZIP成功。原develop-rc队列仍有rc.1/3/4，保留独立源/工具/锁身份及全部审批。
若失败：只修具体Job，小提交/普通推送，读回SHA和新Run后交接。若成功：先核对实际Windows与产物证据；所有者独立审核完整SHA及pr-trust、决定是否授权合并，并在完整RC产物验收后决定rc-publish-owner审批。缺少稳定0.7.4源码身份时如实保留未验收项。禁止自动合并、审批或发布。

## 远程检查点与触发回执

新PR：https://github.com/Aides8Stack/GankSoft/pull/10 （open，head=fix/g3-inno-install-identity，base=develop；未合并）。
阶段A提交：ce088fbd0b3cb44ed4497eb28f80e41bc2039631。
阶段B提交：56a84a5d4d4692f602204db724f7f5709b390ec4；远程ref独立读回一致。
远程tree=5279285f20b024ab6c8ca44e0784747e98e2cfdd，与本地已提交5345dd0da7426440735fa91deef52f02075ccecc的tree精确相同；该本地提交上再跑pipeline160/160、完整metadata生成/committed-toolkit hash及身份CLI通过，工作区干净。此前全部quality/ASAR测试针对同样实现文件。

已确认PR quality Run39533697469被触发：
https://github.com/Aides8Stack/GankSoft/actions/runs/39533697469
被测head_sha=56a84a5d4d4692f602204db724f7f5709b390ec4，event=pull_request，快照in_progress；scope已PASS，Windows/Ubuntu quality运行中。Windows Job：https://github.com/Aides8Stack/GankSoft/actions/runs/39533697469/job/119005324813 ；Ubuntu Job119005324912。
本回执只对上述SHA/Run有效，不代表测试完成。最后文档提交会触发synchronize，旧Run可能被原有concurrency取消；当前文档提交SHA由远程分支/PR head及git log -1 -- docs/development解析，最新Run须按该SHA查询，不把旧Run当成最终head验收。按规则不为写入自身SHA无限提交。

IMPLEMENTED_PENDING_CI。未持续轮询或等待Windows结束；未审批pr-trust/Release、未合并/发布。下一会话先重新核对最终head和最新CI，再读取具体失败Job或真实安装/卸载/产物证据；只有所有者可授权后续合并与发布审批。
