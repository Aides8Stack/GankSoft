# G3 安装身份修复计划

基线 a00700124d895eed1a002c231456233b10296a88；fix/g3-inno-install-identity → develop。

- A DONE：读取原Job/Artifact/安装卸载日志与Inno6.7.1源码；结论见G3_INSTALL_IDENTITY.md；新增纯函数身份及阻断测试。
- B IN_PROGRESS：最小生产修复与严格注册表/元数据/清理/阶段报告已实现；扩展原Windows Inno步骤执行fixture安装、重装、并存和卸载，真实Windows执行待CI。
- C IN_PROGRESS：保留原历史RC队列与源码/工具/锁身份；完整历史应用安装/Smoke/ZIP仍待develop RC流水线。0.7.4没有已找到的历史源码提交，禁止伪造。
- D DONE：本地专项、全pipeline、ci:quality、ASAR完成；更新记录、分阶段提交、新PR、远程SHA及CI回执后退出，不等待、不审批、不合并、不发布。

保留旧G2证据和全部门禁，不重新审查G2历史、不改业务。当前版本按现行强制版本门禁提升到rc.5，非历史RC改写。Win10/11人工验收NOT_RUN。
