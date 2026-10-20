# Pipeline v4 历史实施测试（G1 前）
Linux Node24.19.0/npm11.9.0；从远程develop c8db715d33265bdf8e2edd05f0f14a35b97de8ac逐blob核验恢复，精确重建Git commit和tree；shallow边界明确。
最终被测源码：以P5远程de3092a978a0e8aa1755c5d11b24c4a899c1001e为基线的P6工作树。精确文件SHA256和文档更新前Git tree见docs/ci/evidence/local-validation.json。远程最终提交必须逐tree读回；新文档提交不宣称已有安装包包含本回执。
| 命令/范围 | 结果 | 证据 |
|---|---|---|
| npm ci（最终lock） | PASS | 仅锁定依赖恢复 |
| npm run test:pipeline | PASS | 23项：SemVer、风险分类、权限/事件/DAG、A/B/C对账、故障/篡改、Draft恢复、幂等/墓碑、Stable同包签核、Work退出 |
| npm run ci:quality | PASS | 5基础设施、1中文ZIP、199业务（含21协议），协议21重跑、边界/类型/前后台构建；不是220个独立用例 |
| node tools/validation/package-check.mjs | PASS | 13组Linux ASAR/UI/原生插件缺失故障隔离；不是Windows测试 |
| UTC/上海/纽约各运行review-matrix-v073 | PASS | 每环境5项，fixture固定初始UTC，原拒绝变化断言保留 |
| npm run pipeline:security | PASS | secrets/许可/integrity/工作流权限/依赖审计；0漏洞，首次31项已修复 |
| YAML结构+Prettier+git diff --check | PASS | 六workflow唯一事件、pins、最小权限、有效依赖；5个官方Action commit均经GitHub API核实存在 |
| 内部/源代码/编译输出版本 | PASS | package/lock/backend快照/编译模块同为0.7.4-rc.1 |
| GitHub PR真实事件去重及跨Job故障注入 | NOT_RUN | 当前CI_PENDING/待核实，不等待 |
| Windows构建/安装/卸载/实际EXE版本 | NOT_RUN | 由用户合并后的GitHub Windows Runner完成 |
| 自动RC真实Draft上传/发布/三连合并 | NOT_RUN | 未授权合并；本地mock通过不能代替实测 |
| Win10/11人工、Stable | NOT_RUN | 无真实同包签核，禁止Stable |
| 所有refs历史/旧日志/Artifacts/版权/Apps | NOT_RUN | 本地shallow不能冒充公开审计；仍Private |
首次业务回归197/198失败定位为宿主默认纽约导致测试无时区变化；固定fixture初始UTC并增强断言后最终199/199通过（新增版本单一来源用例）。原工具链31漏洞升级到0；未删断言、未跳过失败或修改阈值。
全部配套验收项逐项状态见docs/ci/ACCEPTANCE_LEDGER.md。当前“代码已实现、本地通过”，不是完整上线/Windows/发布通过。

## G0–G1 实际结果（2026-10-20，覆盖上文历史“待核实”状态）
环境 Linux / Node24.19.0 / npm11.9.0；被测 db5a5ea2aaa8987f058115e58fd09b1738bf1c1d + 本轮 security.mjs/workflows.test.mjs 工作树，非原提交本身 PASS。精确源码 SHA256、基树、quality 实际报告及日志摘要见 docs/ci/evidence/g1-validation.json。
| 命令/场景 | 状态 | 证据 |
|---|---|---|
| npm ci | PASS | 锁文件依赖恢复，exit 0；依赖/锁文件未改 |
| 旧版 LF / CRLF 对照 | PASS（缺陷复现） | LF PASS；CRLF FAIL Write permission outside publishing job: develop-rc.yml，与原 Windows Job 日志一致 |
| 修复版 LF / CRLF 对照 | PASS | 同一 YAML 两种换行均通过 |
| node --test tools/pipeline/workflows.test.mjs | PASS | 11/11；所有原有测试保留，新增8组正反例，每组覆盖LF/CRLF |
| npm run test:pipeline | PASS | 31/31，无 skip/cancel/fail |
| npm run ci:quality | PASS | 5基础设施、1中文ZIP、199业务（含21协议）；协议21重跑、75方法导出、边界/类型/应用构建；重跑不另算独立用例 |
| npm run pipeline:security | PASS | 工作流/源码/许可/integrity，审计0漏洞；未降门禁 |
| git diff --check | PASS | 无空白错误，修改限故障代码/测试/必要交接 |
| 本轮 Linux ASAR/UI package-check | NOT_RUN | 本轮未改应用/依赖/工作流；完整双平台PR仍按既有配置运行，未用历史13组冒充重跑 |
| 最新修复 HEAD GitHub Linux/Windows | NOT_RUN（CI_PENDING） | 提交后仅查询是否触发，不等待结果 |
| Windows打包/安装/卸载、Win10/11人工、RC/Stable | NOT_RUN | G2–G7范围外；PR不打包、不自动合并 |
质量报告中的 provenance.sha 是运行时 HEAD（基线），有未提交修复；本轮证据明确记录工作树哈希，不能把基线 SHA 当成修复源码身份。

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

| G2命令/证据 | 状态 | 结果/边界 |
|---|---|---|
| node --test tools/pipeline/pr-trust.test.mjs tools/pipeline/workflows.test.mjs（S1） | PASS | 18/18，S1源码检查点91ccf405 |
| npm ci（S2） | PASS | 未改依赖/lock，exit0 |
| npm run test:pipeline（S2最终） | PASS | 42/42，fail/skip/cancel=0；正常owner、Fork/伪造来源、自改scope/tests、重命名、旧SHA、错误actor、发布权限/规则不足及API错误 |
| npm run ci:quality | PASS | 5基础设施、中文ZIP、199业务，协议21重跑、边界/类型/构建 |
| node tools/validation/package-check.mjs | PASS | 13组Linux ASAR/UI/缺插件隔离；不是Windows验收 |
| npm run pipeline:security | PASS | 当前源码、许可/integrity/工作流、依赖审计0漏洞 |
| Rulesets实际读取 | PASS（只读证据） | active和现有规则已核实；不等于满足新策略 |
| effective-rules和Actions管理API | BLOCKED | 当前连接器拒绝端点；Actions REST运行时可读性待独立验收，失败会阻断发布 |
| main部署/Rulesets新required/外部PR线上攻击探针 | NOT_RUN | 本轮禁止改main/develop或仓库设置；不能用mock冒充 |
| 新HEAD双平台CI、Windows包、RC/Stable | NOT_RUN（CI_PENDING） | 只确认触发，不等待；不触发发布 |
S2初次42项回归有3个FAIL：原权限夹具将合法发布Job写权限放在pull_request事件下，新增PR全只读约束正确拒绝。夹具改为真实合法push上下文，原拒绝断言保留，另加PR禁止写权限/Secrets专用拒绝测试，最终42/42 PASS。
