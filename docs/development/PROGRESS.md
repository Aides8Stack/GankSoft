# G3 安装身份修复进度

分支 fix/g3-inno-install-identity → develop；基线 a00700124d895eed1a002c231456233b10296a88。
状态 IN_PROGRESS；实现结论 IMPLEMENTED_PENDING_CI，禁止称G3完成。

A DONE：原Run39528225102、Job118991333874及Artifact12314936808重新核实；Inno6.7.1源码确认>57字符ASCII AppId的卸载键转换；根因、证据行号与兼容策略见G3_INSTALL_IDENTITY.md。
B IN_PROGRESS：生产身份/注册表/报告/卸载检查与Windows实际fixture回归已实现，真实Windows执行待CI。
C IN_PROGRESS：rc.1/3/4历史源码与锁、协调工具独立身份及恢复队列保留；0.7.4为映射/安装fixture，未找到历史稳定源码，不伪造完整应用验收。
D IN_PROGRESS：本地专项16/16、pipeline160/160、ci:quality全部通过，Linux ASAR 13套件107用例通过。分阶段API提交、PR、远程SHA及CI回执待记录。

未改业务、pr-trust策略hash、任何workflow、Release权限或审批。不重做G2、不自动合并/发布。
