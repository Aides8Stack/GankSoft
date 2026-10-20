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

### G1 远程保存与触发回执（仅首次观察，不轮询）
修复检查点：1d57a13797029fdefb226579e28eaede757a0cb5；父提交 db5a5ea2aaa8987f058115e58fd09b1738bf1c1d；tree 9f0e27703a2020d5bac161e8a8adbfd4f7de3a31。普通非强制保存后读回 PR head、完整394个文件path/mode/blob SHA及父链，全部一致。
Draft PR #4：https://github.com/Aides8Stack/GankSoft/pull/4 ，infra/pipeline-v4 → develop；未合并。
首次确认该修复SHA的PR工作流已触发：Run 39387138356 / #3，queued，conclusion=null，CI_PENDING/待核实。https://github.com/Aides8Stack/GankSoft/actions/runs/39387138356 。该状态仅为首次读取，不等待结论。
本回执提交只改文档，security.mjs/workflows.test.mjs逐字节保持上述被测修复。当前最终文档检查点由远程分支HEAD解析；它会独立触发检查，不能将前序Run套作新HEAD结果。任务结束报告提供最终HEAD及一次读取的新Run；无法在自身提交中预写自身SHA/未来Run，不为此循环提交。
下一轮先读取真实HEAD对应Checks/Run；当前没有Windows成功、安装包或发布结论。Work保存交接后立即结束。

## G2 S1/F02（2026-10-20）
基线999a184；PR#4保持Draft/open，原Run39387301625已完成success，仅为旧源码回执。可信metadata-only pr-trust已实施：固定仓库/所有者/默认main、只用PR REST元数据、Fork/外部拒绝、完整SHA人工复核CI控制变化、拒绝截断列表/重命名伪装/并发前移。其唯一写权限是commit status；没有checkout/安装/执行PR内容。scope改用已审计999a184固定脚本，候选和可信目录隔离；PR取消共享npm缓存。
专项 node --test tools/pipeline/pr-trust.test.mjs tools/pipeline/workflows.test.mjs：18/18 PASS，Linux Node24.19.0；首次事件归属测试FAIL因为新增受限metadata触发器，补精确工作流白名单与篡改拒绝断言后PASS，未删除旧测试。源码和默认基线的部署状态分开：main无工作流，可信状态尚未部署；当前仅GitHub Actions app的pr-gate不足以抵御整个workflow被PR改写。必须另经所有者批准部署main的metadata工作流，并把pr-trust加入Rulesets，进行真实恶意探针。

## G2 S2/F03/F04 当前权威状态（2026-10-20）
基线999a184b53dc415c38661b84c56a1643d03f78eb；S1远程检查点91ccf4052af6ae910c3aaea397d57df0f766fed0（parent=999a184，tree=fadc855b6cd9f513835f88ace2bfbc95ed3f14ee），S1专项18/18 PASS，已普通非强制保存并核验tree/parent；当前S2工作树以源码哈希绑定。
仓库Public；protect-develop 25463281 / protect-main 25463521 均active、无bypass。develop已有GitHub Actions pr-gate+strict，main没有required checks，均缺pr-trust。原Run39387301625 completed/success仅绑定999a184，不能代替本轮。
F02代码DONE、部署BLOCKED：新增保护默认分支metadata-only状态，固定可信scope源码SHA，PR无Secrets/只读Token、不共享cache；控制文件修改须owner针对完整SHA单独review；未知来源/Fork、截断/重命名伪装/并发前移拒绝。新pr-trust尚未部署main、尚未设required，当前pr-gate不能单独视为可信授权。严禁将本轮标为平台级整改完成。
F03方案DONE、全仓库迁移NOT_RUN：6个旧分支每个4个唯一浮动Action；分支SHA/工作流blob/Action列表见docs/ci/evidence/g2-security-validation.json。PR#4保持原子替换旧quality.yml；未改其他分支、未停用全局workflow、未关闭#3/#2，避免中断开发。迁移步骤见docs/ci/PR_TRUST_AND_MIGRATION.md。
F04代码DONE、线上验收BLOCKED：queue/最终release/Stable共用有效Rules及active无bypass检查，要求PR、resolved threads、pr-gate+pr-trust的Actions来源、strict、防删除/防强推。读取失败或仅protected=true都阻断；PR/target/workflow_run/Fork/未知actor不能进入发布上下文。Actions管理、协作者/Apps/Secrets设置无法由本接口读取，明确待人工；不可默认安全。
本地PASS：npm ci；pipeline42/42（所有原测试保留）；ci:quality（5基础设施、1中文ZIP、199业务含21协议，协议21重跑、75方法导出、边界/类型/构建）；Linux ASAR/UI/缺原生依赖13组；pipeline:security 0漏洞；diff/秘密检查。Node24.19.0/npm11.9.0，Windows未运行。
部署main可信workflow、required pr-trust、真实恶意探针、旧分支迁移、Windows/RC/Stable均NOT_RUN。不能因PR CI变绿直接合并；先按PR_TRUST_AND_MIGRATION完成G2人工动作，本轮不进入G3。
当前新CI：CI_PENDING/待核实。交接保存后即退出；下轮按最新HEAD读取Run，失败读实际Job日志再最小修复，成功也不得跳过G2部署签核。无自动合并、无main/develop修改、无Release/Tag写入、无删除版本或分支。

### G2远程保存及Actions首次触发回执
S1：91ccf4052af6ae910c3aaea397d57df0f766fed0。S2源码/测试/交接检查点：b5e3b8cedfb4775263d6cc7f4b5c259dffbbbb9b，parent=91ccf4052af6ae910c3aaea397d57df0f766fed0，tree=eaeed17ce6e3f189f3f61dd59011870a2b77fc4a；完整401文件的path/mode/blob哈希及父链读回一致，普通非强制保存。
PR #4：https://github.com/Aides8Stack/GankSoft/pull/4 ，infra/pipeline-v4 → develop，保持Draft/open，未合并。
S2首次Actions确认：Run 39401281660，status=in_progress，conclusion=null，CI_PENDING/待核实；https://github.com/Aides8Stack/GankSoft/actions/runs/39401281660 。仅首次读取，不轮询、不等待结果。
本次最终补回执只修改文档/证据，不改被测源码。最终文档提交身份从远程infra/pipeline-v4 HEAD解析；其Actions独立触发，不能将S2 Run当作最终文档SHA的结果。最终回答记录一次读取的最终Run，不为了预写未来Run或自身SHA反复提交。
本地测试通过，G2部署/规则/旧分支迁移/真实攻击探针仍BLOCKED或NOT_RUN。下一轮先核实最新HEAD CI，之后由所有者批准可信metadata到默认main的独立部署、设required pr-trust并签核；不要立即合并本PR进入RC。本轮未改main/develop、未关#3、未发布或删除版本。

## G2 Windows换行测试修复（2026-10-20，当前权威状态）
基线f457cba9fa8b9e87c8789f2be817cf9a61664371；本地干净且远程PR#4最新HEAD相同，继续infra/pipeline-v4既有任务。实际Run39401503994：scope/Ubuntu quality成功，Windows Job118557286576在test:pipeline有两项FAIL，pr-gate失败，Windows ci:quality未运行。
根因已用原源码快照复现：LF源+LF工作流两项PASS；LF源+CRLF工作流仅多行替换测试FAIL；CRLF源+LF工作流仅嵌入脚本比较FAIL；双CRLF两项FAIL。YAML解析块脚本规范为LF，而源文件字节仍有CRLF；旧push多行replace在CRLF下没有命中，实际测试的是原工作流，而非PR带write的攻击对象。
修复仅pr-trust.test.mjs：只将CRLF转LF再精确比较，不trim、不忽略其它空白/内容；新增所有4种EOL组合及内容/空白篡改拒绝。使用YAML结构构造攻击，uniqueKeys解析无错误后回读确认top/job contents=write、Secrets引用、删除push并添加pull_request且release-rc仍write，再断言原生产审计拒绝；原两项测试保留。生产auditWorkflows、可信hash、pr-trust源码及所有workflow逐字节未改，F02/F03/F04设计不变。
实际本地PASS：4组合修复后各2项通过；专项20/20；pipeline43/43（新增1项，原42项保留）；ci:quality（5基础设施、1中文ZIP、199业务含21协议，协议21重跑、75方法导出、边界/类型/构建）；源码/工作流安全审计、git diff --check。Linux Node24.19.0/npm11.9.0；仅模拟Windows换行字节，未执行Windows OS。
精确证据：docs/ci/evidence/g2-windows-newlines.json，包含修复前后矩阵、原始失败Run/Job、源码hash与命令日志摘要。本轮未重装未变依赖，未重复Linux ASAR/UI或依赖漏洞库查询；不把历史通过写成本轮重跑。
新源码CI_PENDING/待核实，不能引用旧Ubuntu成功。G2平台验收仍待核实/验收：默认main可信metadata部署、required pr-trust及实际保护、Actions/Fork/Token/Secrets设置、旧分支迁移、真实正常/恶意PR阻断验证。Windows新HEAD结果由新Actions确认，本轮不等候。
禁止本轮合并PR、修改main/develop、发布RC/Stable、删除分支或关闭PR。下一轮先读最新HEAD的真实Run/失败日志；通过后也不跳过G2平台验收。本次提交交接后立即退出，不轮询。

### Windows换行修复远程回执（不等待CI）
修复检查点 2eb397da6fb3a8e6c39627cecde7e7d6570546e9，parent=f457cba9fa8b9e87c8789f2be817cf9a61664371，tree=51a9354fbc07c93bd35fec3f35d3d10bc9f1ed2a；完整402文件path/mode/blob及父链读回PASS，普通非强制更新infra/pipeline-v4，PR#4保持Draft/open。
首次确认Actions已触发：Run 39402740347，status=queued，conclusion=null，CI_PENDING/待核实：https://github.com/Aides8Stack/GankSoft/actions/runs/39402740347 。仅查询触发，不轮询。
本补回执只改文档/证据；被测测试与全部生产源码逐字节保持修复检查点。最终交接提交的身份从远程HEAD解析，它独立触发新运行；最终回答提供新Run的一次读取结果，不把前序运行套用于新SHA，不循环补写自身SHA或未来Run。
下次“检查CI并继续”先读最新HEAD真实结果，失败读失败Job再最小修复；成功后继续G2平台部署/Rulesets/Actions设置/旧分支迁移/真实攻击阻断验收。未合并、未改main/develop、未发布RC/Stable、未删分支/关PR。本轮完成交接即退出。

## RC withdrawal recovery — phase A
Verified PR #4 HEAD 96eaf5e129b24a211689b0740b3b22d5cfd80459, clean local checkout. GitHub releases=[]; tag inventory contains legacy annotated v0.7.3-rc1 (not canonical v0.7.4-rc.N). No live release mutation. Isolated original published() call with retained matching tag and absent Release reproduces `Withdrawn or orphaned tag cannot be reused` (PASS reproduction); queue calls that exact function for every historical intent. Root cause is conflating history reconciliation with same-version publication prohibition. Full lifecycle regression follows in D; no live production lifecycle has been run. A DONE; B–E NOT_STARTED.
main=223e5c38f5a949b6e7e98dec3d89752fb849318f, develop=c8db715d33265bdf8e2edd05f0f14a35b97de8ac. Existing legacy tag is not adopted or deleted. Protected-main authorization + completion receipt design is in PLAN; owner must separately approve all future main deployment/records. No RC/Stable/Tag writes, merges, rules changes, or pr-trust authorization.
