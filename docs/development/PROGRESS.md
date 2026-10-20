# Pipeline v4 进度（当前权威状态）
IMPLEMENTATION_DONE / LOCAL_TEST_PASS。分支infra/pipeline-v4；版本0.7.4-rc.1；Draft PR https://github.com/Aides8Stack/GankSoft/pull/4 → develop。
P0审计/隔离，P1版本，P2唯一PR，P3可信RC，P4事务/对账，P5Stable/安全均已实施并分阶段远程保存。最后前序远程检查点de3092a978a0e8aa1755c5d11b24c4a899c1001e；当前最终检查点请读取该分支HEAD，不能在自身内容中写自身SHA。
P6本地：23治理测试、199业务（含21协议）、21协议重跑、5基础设施、1中文ZIP、边界/类型/构建、13组Linux ASAR/UI/缺插件隔离PASS。三时区各5组PASS，安全审计0漏洞。证据docs/ci/evidence/local-validation.json记录测试源码哈希；最终Git tree与远程核验后交接退出。
原本地FAIL：时区测试依赖宿主默认纽约；fixture固定UTC并增强写入/时区断言后PASS。原Forge7漏洞31项（23high/1critical）；升级Forge8.0.1/Packager20.3.0/ASAR4.3.1后0，未降低门禁。YAML解析使用yaml2.9.1，最终npm ci可恢复。
CI_PENDING（最终运行编号尚未核实）；Windows Runner/真实RC事务/Win10/11人工/Stable/公开历史审计均NOT_RUN。develop未合并，自动RC未触发。
真实端到端验收BLOCKED：develop/main目前protected=false。先按MANUAL_CONFIGURATION配置保护，再用户审核合并PR#4；不自动关闭#3，不碰#2。
