# G3 Windows安装器版本修复

阶段结论 IMPLEMENTED_PENDING_CI。基线605666c17d1b43a07f0cc1559741c3d6c53daf1b；fix/g3-inno-version → develop；版本0.7.4-rc.4。

P1 DONE：核实develop、完整失败日志及原preflight计划。pending rc.1(df6b5a3)、rc.3(605666c)均有旧错误模板；无已发布RC。rc.1先失败，不能只修新源码。
P2 DONE：共享Windows映射rc.N→core.N(1..65534)、stable→core.65535；保留完整SemVer文本/显示/ASAR。安装器/应用数值与文本检查、安装后元数据/EXE/DisplayVersion核对，原smoke/卸载/ZIP/SHA保留。
P3 本地DONE：专项30/30、pipeline150/150、CRLF30/30，无skip；真实临时历史worktree+metadata子进程/PE资源/篡改拒绝PASS。历史应用源码和依赖保持原SHA，固定coordinator打包工具与文件hash独立记录并机器核对，审批请求绑定两者。
真实Inno编译BLOCKED于本地Wine socket环境；已新增PR Windows实际ISCC四版本编译/资源强制门禁。没有Windows包/安装成功证据；合并后历史RC应用重建仍待原流水线。
P4：新PR保存、完整tree/parent/HEAD与一次CI触发回执在最终报告/PR描述。不等待CI、不合并、不发布、不修改Ruleset或Environment。G2/业务/ASAR不重复。详见docs/ci/INNO_VERSION_RECOVERY.md。

## PR #9 下载名与解压路径续修

IMPLEMENTED_PENDING_CI；继续fix/g3-inno-version，前序85e861cbd478ea4d29896b5c7932331b4f201465，仍为0.7.4-rc.4。本段为最新增量结果；上文30/150为前序记录。
下载名：GankSoft-v{version}-win64-setup.exe / GankSoft-v{version}-win64-portable.zip；ZIP根GankSoft/。完整内部name及source SHA/tool SHA/run ID/attempt保留在metadata、哈希manifest和报告；新delivery字段与工具树受验证。各历史源码SHA独立结果目录及不同SemVer文件名不碰撞，同版本不同Run不得混用，原Release草稿摘要冲突即拒绝。
Windows实解压脚本共用于PR回归和真实包：80/100字符目标目录、最长ZIP/绝对路径记录、传统260字符限制、全文件SHA256/覆盖率、解压metadata与期望构建身份核对。解压报告绑定ZIP摘要、文件名、Run/attempt及内部构建身份；缺失/错误/旧报告均阻断。原Inno数值/文本映射、四版本实际编译门禁、安装/启动/卸载/便携smoke及owner批准策略保留。
PASS（Linux Node24.19.0/npm11.9.0，本次工作树）：专项33/33、全部pipeline153/153（原150保留+3）、CRLF专项33/33、基础设施core5/5、Python ZIP回归1/1（含中文非UTF8默认编码），无skip。version:check相对origin/develop仍PASS。源码hash更新至docs/ci/evidence/g3-inno-validation.json。
NOT_RUN：本地无Windows，Windows原生Expand-Archive与深目录实际验证待新CI；完整应用包及历史rc.1/rc.3/rc.4实际重建仍待合并后原develop流程。本地Linux ZIP验证不能替代Windows证据。前序Inno本地环境阻塞不变，不宣称G3完成。
下一步：所有者检查新SHA对应pr-gate/pr-trust、Windows原Inno编译和ZIP实解压日志/报告，独立授权后决定合并；原develop全门禁通过后才允许rc-publish-owner人工批准。未合并、未发布、未修改Ruleset/Environment。新完整SHA/Run回执在PR描述及最终交接，核实触发即退出。
