# Pipeline v4 历史实施进度（G1 前）
IMPLEMENTATION_DONE / LOCAL_TEST_PASS。分支infra/pipeline-v4；版本0.7.4-rc.1；Draft PR https://github.com/Aides8Stack/GankSoft/pull/4 → develop。
P0审计/隔离，P1版本，P2唯一PR，P3可信RC，P4事务/对账，P5Stable/安全均已实施并分阶段远程保存。最后前序远程检查点de3092a978a0e8aa1755c5d11b24c4a899c1001e；当前最终检查点请读取该分支HEAD，不能在自身内容中写自身SHA。
P6本地：23治理测试、199业务（含21协议）、21协议重跑、5基础设施、1中文ZIP、边界/类型/构建、13组Linux ASAR/UI/缺插件隔离PASS。三时区各5组PASS，安全审计0漏洞。证据docs/ci/evidence/local-validation.json记录测试源码哈希；最终Git tree与远程核验后交接退出。
原本地FAIL：时区测试依赖宿主默认纽约；fixture固定UTC并增强写入/时区断言后PASS。原Forge7漏洞31项（23high/1critical）；升级Forge8.0.1/Packager20.3.0/ASAR4.3.1后0，未降低门禁。YAML解析使用yaml2.9.1，最终npm ci可恢复。
CI_PENDING（最终运行编号尚未核实）；Windows Runner/真实RC事务/Win10/11人工/Stable/公开历史审计均NOT_RUN。develop未合并，自动RC未触发。
真实端到端验收BLOCKED：develop/main目前protected=false。先按MANUAL_CONFIGURATION配置保护，再用户审核合并PR#4；不自动关闭#3，不碰#2。

## G0–G1 当前权威进度（2026-10-20）
G0 DONE：GitHub API 实时核实 Private/default main；main=a0fb65d89b7273c6f06beb763e66b3c4d1899a05、develop=c8db715d33265bdf8e2edd05f0f14a35b97de8ac，二者 protected=false。PR #4 Draft/open、目标 develop、HEAD=db5a5ea2aaa8987f058115e58fd09b1738bf1c1d；PR #2 6d47b785e6b55d0f0c4146f8edd7d84842e30ff3、PR #3 ce3898531b8fcd7418727f85f33db0780261386e，均 Draft/open。
Run 39356453395 / Windows Job 118412291106 在 npm run test:pipeline 失败，Ubuntu quality 成功；不是当前修复通过证据。AUDIT.md 属旧基础设施分支，不作为当前状态。
G1 实现和本地验证 DONE：393 个源码 blob 全部 Git SHA1 校验，原 tree 1ba44ea3f79c228e1a1aa9cabd1188ec28c7a799 和精确 commit 已恢复；本地 shallow，非全历史。继续既有任务，不初始化或覆盖旧记录。
根因实测：旧 auditWorkflows 对同一 develop-rc.yml 的 LF PASS、CRLF FAIL（同 CI 错误）；按 LF 切行后残留 CR 导致 Job 行末正则失配。改用已有 yaml AST/结构审计；发布写权限限定 workflow+job+contents，拒绝解析错误/重复键/别名/merge/危险事件/继承 secrets/未固定 Action。没有修改 workflow、依赖或业务，没有删测试。
本地工作树：专项11/11、pipeline31/31、ci:quality（5基础设施+1中文ZIP+199业务含21协议、协议21重跑、边界/类型/构建）、pipeline:security 0漏洞 PASS。精确源码哈希与日志摘要见 docs/ci/evidence/g1-validation.json。
远程提交和最新 CI 回执在后续检查点补记；CI_PENDING，Windows Runner/Win10/11人工 NOT_RUN；G2–G7 NOT_STARTED。本轮不等待、不合并、不改 main/develop、不发布/删除版本。
