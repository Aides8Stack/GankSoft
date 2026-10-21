# G3 Inno修复测试报告

基线605666c17d1b43a07f0cc1559741c3d6c53daf1b；fix/g3-inno-version → develop；版本0.7.4-rc.4。
被测对象：该基线加本PR工作树；Linux Node24.19.0/npm11.9.0。
PASS：npm ci --include=dev --ignore-scripts（本地pipeline依赖，不冒充Windows应用安装）。
PASS：node --test tools/pipeline/windows-version.test.mjs tools/pipeline/owner-rc.test.mjs，30/30。涵盖stable/rc.1/rc.3/rc.4、全部RC槽不碰撞/排序/溢出/非法与不支持格式拒绝、实际PE数值与文本、真实Git历史worktree元数据子进程、dirty/错coordinator、制品来源/版本/installer工具证据篡改和既有人工审批。
PASS：npm run test:pipeline，150/150（原144保留，新6项）；无删除/skip。
PASS：CRLF独立副本专项30/30（Linux模拟Windows文本换行，不等于Windows OS）。
PASS：version:check相对origin/develop、diff检查及源码/工作流守卫；精确源码摘要见docs/ci/evidence/g3-inno-validation.json。
BLOCKED（未获得成功证据）：本地Wine真实Inno尝试，wineserver socket Operation not permitted；官方6.7.1安装程序hash已核实，但编译器未成功运行，不能记编译PASS。PR Windows新增强制真实四版本ISCC编译与Setup PE检查，结果待新CI，缺compiler/失败均阻断。
NOT_RUN：完整Windows应用安装器成功、安装/启动/卸载/DisplayVersion、便携ZIP/历史RC完整重建；Win10/11人工；真实RC审批/发布。本轮未重跑业务/ASAR或G2全量审计。

原Run39522154104：preflight/security/双平台quality通过，windows-package118970526040失败，artifact-verify/release跳过。原始编译错误在历史rc.1 worktree的Inno ProductVersion字段；该失败不是新修复的验收证据。新CI仅记录首次触发，不等待。

## PR #9 下载名与解压路径续修

IMPLEMENTED_PENDING_CI；继续fix/g3-inno-version，前序85e861cbd478ea4d29896b5c7932331b4f201465，仍为0.7.4-rc.4。本段为最新增量结果；上文30/150为前序记录。
下载名：GankSoft-v{version}-win64-setup.exe / GankSoft-v{version}-win64-portable.zip；ZIP根GankSoft/。完整内部name及source SHA/tool SHA/run ID/attempt保留在metadata、哈希manifest和报告；新delivery字段与工具树受验证。各历史源码SHA独立结果目录及不同SemVer文件名不碰撞，同版本不同Run不得混用，原Release草稿摘要冲突即拒绝。
Windows实解压脚本共用于PR回归和真实包：80/100字符目标目录、最长ZIP/绝对路径记录、传统260字符限制、全文件SHA256/覆盖率、解压metadata与期望构建身份核对。解压报告绑定ZIP摘要、文件名、Run/attempt及内部构建身份；缺失/错误/旧报告均阻断。原Inno数值/文本映射、四版本实际编译门禁、安装/启动/卸载/便携smoke及owner批准策略保留。
PASS（Linux Node24.19.0/npm11.9.0，本次工作树）：专项33/33、全部pipeline153/153（原150保留+3）、CRLF专项33/33、基础设施core5/5、Python ZIP回归1/1（含中文非UTF8默认编码），无skip。version:check相对origin/develop仍PASS。源码hash更新至docs/ci/evidence/g3-inno-validation.json。
NOT_RUN：本地无Windows，Windows原生Expand-Archive与深目录实际验证待新CI；完整应用包及历史rc.1/rc.3/rc.4实际重建仍待合并后原develop流程。本地Linux ZIP验证不能替代Windows证据。前序Inno本地环境阻塞不变，不宣称G3完成。
下一步：所有者检查新SHA对应pr-gate/pr-trust、Windows原Inno编译和ZIP实解压日志/报告，独立授权后决定合并；原develop全门禁通过后才允许rc-publish-owner人工批准。未合并、未发布、未修改Ruleset/Environment。新完整SHA/Run回执在PR描述及最终交接，核实触发即退出。
