# G3 安装身份修复交接

状态 IMPLEMENTED_PENDING_CI；G3未完成。目标develop；基线a00700124d895eed1a002c231456233b10296a88；新分支fix/g3-inno-install-identity。

先读AGENTS/STANDARDS、TASK、PLAN、PROGRESS、TEST_REPORT及G3_INSTALL_IDENTITY.md。旧AUDIT为基础设施历史，不作为本轮G2重审依据。PR #9已合并，不修改或重开。

原故障证据：Run39528225102 / Job118991333874；windows-build-reports Artifact12314936808。实际长AppId的卸载键由Inno变为48前缀+CRC；验证脚本误用完整构建名。原注册表四字段未快照，不能假称已验证。

已实现：57字符每构建摘要AppId；源码/工具/锁/Run完整身份保留；精确HKCU/Registry64与版本/路径/卸载命令验证；完整metadata文件哈希；卸载所有payload与精确键检查；报告分阶段NOT_RUN/FAIL/PASS；真实Windows fixture安装重装并存卸载；artifact新身份/阶段强制验收。下载名和GankSoft/ZIP根不变。旧安装不迁移、不覆盖默认路径、不删除用户学习数据。

本地：专项16/16、pipeline160/160、质量5+1+202+21及build通过、Linux ASAR13套件107用例通过。Windows实际执行、完整历史应用与解压/产物验收NOT_RUN；0.7.4稳定历史源码身份尚未找到，禁止用当前源码冒充。

远程检查点/PR/CI：待提交回执。通过GitHub Git Data API从已核实基线tree建立增量提交，真实parent、force=false、expected_sha；不覆盖其他文件，不改main/develop。提交后核实远程SHA、PR和Actions触发即退出，不等待Windows结束。

下一会话：先读回远程ref/PR/head与Run被测SHA；读取具体Windows Job日志、inno-install.json、installer.json及registry.json，核实真实安装/卸载和并存。PR fixture成功也不能认作历史完整应用/ZIP成功。原develop-rc队列仍有rc.1/3/4，保留独立源/工具/锁身份及全部审批。
若失败：只修具体Job，小提交/普通推送，读回SHA和新Run后交接。若成功：先核对实际Windows与产物证据；所有者独立审核完整SHA及pr-trust、决定是否授权合并，并在完整RC产物验收后决定rc-publish-owner审批。缺少稳定0.7.4源码身份时如实保留未验收项。禁止自动合并、审批或发布。
