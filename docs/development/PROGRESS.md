# G3 安装身份修复进度

## 当前续修：卸载显示名称（2026-10-21）

状态 **IMPLEMENTED_PENDING_CI**。继续原PR #10 / fix/g3-inno-install-identity → develop；不创建PR、不合并、不审批、不发布。以下更新优先于后面的历史快照。

已重新核实失败HEAD 8b12d63775e94dd4670aa7a74d437082496f5485、Run39533875571、Windows Job119006178153，以及原Artifact12316627030。
`ci/inno-registry-1.json` 原始值：hive=HKEY_CURRENT_USER、view=Registry64、exists=true；键尾GankSoft-ff915f18daf22f47f5cd1243f98ac47029f9d19db0812bca_is1；DisplayName=`GankSoft version 0.7.4`、DisplayVersion=`0.7.4`。InstallLocation为本次隔离目标（末尾反斜杠），UninstallString为该目录引号包围的unins000.exe；完整原始路径保留在上述Artifact中。
`ci/inno-install.json`：首个stable fixture install/identity-validation/uninstall=PASS，registry-validation=FAIL；reinstall/coexistence/launch=NOT_RUN，cleanup为空。其余fixture案例尚未执行，不能称Windows完整验收成功。全部fixture编译与PE版本资源PASS。

真实原因：installer.iss未显式设置UninstallDisplayName，实际注册表名称与install-identity.mjs:29期望的裸`GankSoft`不同。只修这项契约：显式`UninstallDisplayName=GankSoft {#AppVersion}`，校验精确期望`GankSoft ${meta.version}`及完整DisplayVersion；错误消息保存actual/expected。stable期望变为`GankSoft 0.7.4`，历史RC保留完整SemVer。旧名称、裸名称、错误版本、尾空格以及原路径/卸载命令等拒绝用例均保留或增加。

代码仅改installer.iss、install-identity.mjs、install-identity.test.mjs；57字符AppId、每构建隔离、HKCU/Registry64、重装/并存/卸载、元数据、ZIP、版本资源算法、全部workflow/门禁均保持。没有G2重审。

本轮本地：专项17/17、pipeline161/161；ci:quality PASS（基础设施5/5、UnicodeZIP1/1、业务202/202、协议21/21及边界/类型/build）。没有用这些结果代替Windows。本轮ASAR未重跑，先前13套件107用例仅作继承证据，应用文件未改变。离线npm ci因缺少zod缓存失败；随后普通npm ci成功安装194包，才执行上述依赖测试。最终代码测试FAIL 0。

实现远程检查点：470735868ca9b34772a70dfe7c5d0a603d839ad3，已独立读回；tree=cda0e870f2b9955589504f35262a66b79416db11，与本地f489d0d85c8390c882a9a1b6ab7c97cf7778ae31提交树完全相同。原PR仍open。最后交接提交的自身SHA由PR/head和git log -1 -- docs/development解析；不为记录自身SHA无限提交。
新CI已触发：Run39571052720（https://github.com/Aides8Stack/GankSoft/actions/runs/39571052720），head_sha=470735868ca9b34772a70dfe7c5d0a603d839ad3，event=pull_request，读取快照in_progress。scope=PASS；Windows Job119125085408和Ubuntu Job119125085458运行中。Windows链接：https://github.com/Aides8Stack/GankSoft/actions/runs/39571052720/job/119125085408 。本回执只属于该实现检查点；最后文档提交触发synchronize后，应按最终PR head查询新Run，旧Run可能被原concurrency取消。未等待执行结束。

本轮修复后的真实Windows安装/重装/并存/卸载、完整历史应用与ZIP验收均NOT_RUN，须读取新CI实际结果。若失败，先保留actual/expected再局部修复，严禁宽松匹配或跳过。若通过，仍须核对真实安装/卸载及产物证据，再由所有者决定后续授权。提交并确认触发后立即退出，不等待。

## 前序阶段历史记录

分支 fix/g3-inno-install-identity → develop；基线 a00700124d895eed1a002c231456233b10296a88。
状态 IN_PROGRESS；实现结论 IMPLEMENTED_PENDING_CI，禁止称G3完成。

A DONE：原Run39528225102、Job118991333874及Artifact12314936808重新核实；Inno6.7.1源码确认>57字符ASCII AppId的卸载键转换；根因、证据行号与兼容策略见G3_INSTALL_IDENTITY.md。
B IN_PROGRESS：生产身份/注册表/报告/卸载检查与Windows实际fixture回归已实现，真实Windows执行待CI。
C IN_PROGRESS：rc.1/3/4历史源码与锁、协调工具独立身份及恢复队列保留；0.7.4为映射/安装fixture，未找到历史稳定源码，不伪造完整应用验收。
D DONE：本地专项16/16、pipeline160/160、ci:quality全部通过，Linux ASAR 13套件107用例通过。分阶段API提交、新PR、远程SHA和CI触发已核实；仅剩最终文档回执推送，推送后确认最新Run即退出。

未改业务、pr-trust策略hash、任何workflow、Release权限或审批。不重做G2、不自动合并/发布。

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
