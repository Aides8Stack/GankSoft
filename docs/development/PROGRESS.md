# G3 Windows安装器版本修复

阶段结论 IMPLEMENTED_PENDING_CI。基线605666c17d1b43a07f0cc1559741c3d6c53daf1b；fix/g3-inno-version → develop；版本0.7.4-rc.4。

P1 DONE：核实develop、完整失败日志及原preflight计划。pending rc.1(df6b5a3)、rc.3(605666c)均有旧错误模板；无已发布RC。rc.1先失败，不能只修新源码。
P2 DONE：共享Windows映射rc.N→core.N(1..65534)、stable→core.65535；保留完整SemVer文本/显示/ASAR。安装器/应用数值与文本检查、安装后元数据/EXE/DisplayVersion核对，原smoke/卸载/ZIP/SHA保留。
P3 本地DONE：专项30/30、pipeline150/150、CRLF30/30，无skip；真实临时历史worktree+metadata子进程/PE资源/篡改拒绝PASS。历史应用源码和依赖保持原SHA，固定coordinator打包工具与文件hash独立记录并机器核对，审批请求绑定两者。
真实Inno编译BLOCKED于本地Wine socket环境；已新增PR Windows实际ISCC四版本编译/资源强制门禁。没有Windows包/安装成功证据；合并后历史RC应用重建仍待原流水线。
P4：新PR保存、完整tree/parent/HEAD与一次CI触发回执在最终报告/PR描述。不等待CI、不合并、不发布、不修改Ruleset或Environment。G2/业务/ASAR不重复。详见docs/ci/INNO_VERSION_RECOVERY.md。
