# S2旁路：独立冷启动目录修复证据

父检查点a8b4d61ea43093d86f38a28659351ef16568fffc；原失败Run39759121731/Windows119758723844/Artifact12417536862。ORIGINAL-WINDOWS-ARTIFACT.json以base64保留下载的完整209KiB ZIP，可用Python base64.b64decode(content)还原，并与sha256核对；原远端Artifact未删除/覆盖。ORIGINAL-WINDOWS-directory-comparison保留原表/JSON，C120.046/118.803秒对D10.421/10.470秒，仅证明目录关联，旧B在项目树内不是隔离证明。不再跑四次调查。

LINUX-pre-install.json、LINUX-cold-install.json是本轮正常一次全锁安装的真实记录；Linux6.002秒不是新WindowsD路径耗时。完整正常pipeline182 PASS含6项新工作区测试、原14项诊断/调度以及所有原负向/坏lock/独立worktree；quality基础设施5/ZIP1/业务273/协议21/边界/类型/导出/build PASS。LOCAL-TEST-OUTPUT保留实际输出，VALIDATION.json给出实现hash与范围。未执行Crepe专项、Win10/11实机或真实用户数据库操作。

REMOTE-SNAPSHOT是原Run步骤时长及只读规则集/branch快照。develop可见required pr-gate/pr-trust strict/source15368；main规则集无required_status_checks，classic checks亦空，不能冒称已强制FULL。有效rules/branches端点被连接拒绝（HTTP400），快照不冒充完整有效规则枚举；本轮未改任何规则。

下一次读新SHA的Windows pr-reports artifact中bootstrap/run-*/{pre-install.json,cold-install.json,child-*/result.json及完整stdout/stderr/npm-logs}，确认选择真实D盘、源码外/祖先无node_modules、预先ESM/CJS缺yaml及三模式缺依赖、完整离线锁安装、120秒/4MiB及安装后本地解析/锁/yaml/三模式PASS。原四次对照显式入口tools/pipeline/experiments/directory-comparison.test.mjs保留，但不应无新假设反复运行。

新完整SHA/即时Run/状态见原PR13描述和最终回执；不为自身SHA在仓库反复提交。FAST/FULL只有设计，S2/T05仍BLOCKED/FAIL。
