# G3 安装身份修复进度

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
