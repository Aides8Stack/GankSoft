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

### RC recovery phase B
A remote checkpoint d051420c7ec00ca51f622d1355d49aafe3af5810 verified (tree 2400fcd23bbb994bc1fb5db7a4da4b3baf2f9b48). Added withdrawal authority/provenance module, history classifier, and isolated stateful fake-GitHub regressions; no workflow integration yet. `node --test tools/pipeline/withdrawal.test.mjs tools/pipeline/release.test.mjs tools/pipeline/stable.test.mjs` PASS 19 tests on Linux Node24.19.0; original publishing and Stable assertions retained. Covers full publish/delete/retained-tag/receipt/reconcile/next-version lifecycle, forgery, API failure, drafts, concurrency and LF/CRLF Unicode paths. Not a real GitHub or Windows acceptance. B local DONE, C integration next; G2 remains BLOCKED.

### RC recovery C/D integration
B checkpoint a07987fc32e20108fdd00e6c428b0a95f3fea64d (tree a49e922f291fdf5fa87185175e7edc7cd4b91a0b). queue.plan now delegates historical reconciliation to release-history; immutable same-version publisher unchanged. Manual RC withdraw-plan/withdraw generate read-only authorization/completion artifacts, requiring separate owner-controlled main PRs. Added only actions:read/pull-requests:read to existing metadata readers; no additional writes, no PR execution or relaxed checks. Interrupted authorized deletion can confirm absence without duplicate DELETE, then awaits durable completed receipt; unknown orphan still refuses recovery. Owner runbook in docs/ci/RELEASE_OPERATIONS.md.
PASS: full pipeline 54/54 before additional recovery assertions; targeted withdrawal/workflow/Stable tests 26/26 after additions. C/D local DONE; E full quality/security next. No real release or Tag operations, no main/develop writes. Windows OS and live platform probes NOT_RUN. G2_NOT_COMPLETE — AWAITING_CI_AND_SECURITY_REVIEW.

## RC withdrawal recovery — final authoritative handoff (2026-10-20)
Source baseline 96eaf5e129b24a211689b0740b3b22d5cfd80459. Remote stages A=d051420c7ec00ca51f622d1355d49aafe3af5810, B=a07987fc32e20108fdd00e6c428b0a95f3fea64d, C=4eb5ddd6eedfda0d0136f42d14360e3147f40f79, all ordinary non-force checkpoints with matching index/API trees. Final checkpoint resolved from `git log -1 -- docs/development` and remote PR#4 HEAD; no self-SHA/future Run loop.
A–D implementation DONE locally. E core pipeline/quality/security PASS; complete Linux ASAR regression FAIL (below), so overall G2 remains BLOCKED. New withdrawal.mjs separates protected-main record authority/manual deletion from release-history.mjs classification/reconcileHistory, called by queue.plan; stable.mjs only routes RC withdrawal operations, with existing formal Stable branches retained. Existing release.mjs/github.mjs/protection.mjs/security/pr-trust/PR workflow/lock/business/smoke source unchanged. Only release metadata read permissions added; no token write expansion or quality gate removal.
PASS actual evidence on Linux Node24.19.0/npm11.9.0: npm ci; npm run test:pipeline 61/61 (original 43 retained, 17 new withdrawal lifecycle/provenance/actual Git queue tests + 1 workflow regression); LF/CRLF source×workflow four combinations each 38/38 with zero skipped; Unicode/space filesystem paths in actual temporary Git and artifact fixtures; npm run ci:quality (5 infra, 1 Unicode ZIP, 199 business, 21 protocol rerun, 75 methods, boundaries/types/build); npm run pipeline:security 0 vulnerabilities, license/source/workflow checks PASS. No Windows OS or true Windows filesystem/installer execution: NOT_RUN; future CI must verify Windows.
FAIL actual evidence: `node tools/validation/package-check.mjs` reached original tools/smoke-v070.mjs:170, stat-card value '2' expected '1'. Previous package groups v060, picker, filter, mind, import, study, v066 passed; later groups NOT_RUN because suite stopped on failure. Isolated same-ASAR recheck under TZ=Asia/Shanghai also FAIL at same assertion. Root cause NOT_VERIFIED; do not claim timezone fix or full ASAR success. Business/UI/test assertion untouched per scope. Preserve failure for owner-approved separate investigation; CI may fail and must be read next turn.
Security states exercised: PENDING → DRAFT_RECOVERABLE → PUBLISHED_VERIFIED; owner-authorized deletion with retained Tag remains BLOCKED until completed protected-main receipt + successful exact-attempt main Run; then WITHDRAWN_AUTHORIZED skips only that historical item and allows next RC through all existing gates. Same-version reuse always rejects. Unknown Tag, missing/forged/tampered/SHA-mismatched record, changed original Release ID/reason, missing prior authorization, wrong/Fork PR provenance, failed/wrong-event/wrong-branch/wrong-workflow/wrong-SHA/wrong-attempt/wrong-actor/out-of-window Run, missing/diverged main history, reappearing Draft, asset conflicts and unavailable API reject with tested reasons and preserved remote state. Different-version concurrent publishing, same-version conflict and Tag race tested. Interrupted approved deletion can confirm absence without another DELETE; receipt time explicitly means confirmation time, not an invented historical delete timestamp.
Durable authority: API-pinned protected main JSON + original authorization Git commit/blob + owner-merged PRs + exact successful main manual Run, never candidate local files/PR plan or transient artifact alone. Owner runbook: docs/ci/RELEASE_OPERATIONS.md. Initial read-only inventory releases=[] and legacy v0.7.3-rc1 only; no live RC withdrawal/release/Tag mutation was performed. All lifecycle tests use isolated fake transport and temporary Git, not production evidence.
Remaining G2/platform acceptance: latest Ruleset definitions protect-develop 25463281 active/no bypass/strict pr-gate only, protect-main 25463521 active/no bypass/no required checks. pr-trust still missing as required check; effective-rules endpoint unavailable through current connector (mark manual/runtime verification). Existing main pr-trust deployment does not deploy this new withdrawal code/control workflow. Owner must independently review this full PR SHA/design, read new CI outcome without assuming success, investigate preserved ASAR failure, verify effective protections + Actions/Fork/Token/Secrets + genuine good/malicious PR probes, and separately approve release-control/code deployment and future authorization/completion record PRs to main. Legacy branch migration and Win10/Win11 real same-package acceptance remain NOT_RUN. This task never performs those actions, pr-trust exact-SHA authorization, merges, main/develop writes, real releases, Tag overwrites/deletion, branch removal or PR#3 closure.
Evidence: docs/ci/evidence/rc-withdrawal-validation.json binds final source hashes and logs, raw full pipeline/quality and both ASAR failure logs. Full CI for final HEAD is CI_PENDING; final answer provides once-read Run ID/HEAD. Stop immediately after remote verification and Actions-trigger observation; no CI polling or waiting.
G2_NOT_COMPLETE — AWAITING_CI_AND_SECURITY_REVIEW

Final provenance regression: live GitHub PR#5 path history returns source a9433c31595ca246996ce0d378afa20262efc181 while merge is 223e5c38f5a949b6e7e98dec3d89752fb849318f. The verifier accepts normal merge/squash only after source → owner merge → pinned main ancestry, and rejects diverged source/merge history. Added normal-merge regression; pipeline final 61/61, newline matrix final 4×38/38. Full ci:quality rerun after this final code change PASS; security dependency result unchanged and final staged source/workflow/secret scan PASS. ASAR FAIL remains explicitly unresolved; no claim of complete local/G2 acceptance.

## Linux ASAR date difference — confirmed root and targeted fix
Baseline a281411ad14aa01664fa2b1e4208d2f6e5e300ac; Run39425037338 verified four successful Jobs, Ubuntu118635416826 original log includes custom-range test. Work /etc/localtime=Asia/Shanghai despite /etc/timezone=/UTC. Same Node24.19.0/Electron44.7.2/ASAR and source, only TZ changed: UTC original fixture credits [1,0,1,0], Shanghai [1,1,1,1]; backend protocol and UI both agree with effective=1 or 2 respectively. Late studyTimezone UPDATE changes report grouping, not persisted credits. This is test fixture host-timezone dependence, not a demonstrated production/async defect. Pin UTC during fixture scheduling, then Shanghai reporting; preserve original UI expectation 1 and add persisted row/score + renderer API assertions. Shared helper used by smoke and new isolated protocol tests. PASS three fresh child host zones incl Unicode/space temp paths, restart, invalid range, unchanged credits/scheduling; PASS full 15-case v070 ASAR smoke independently on UTC/Shanghai/New_York. No waits or production changes. Full quality/package/pipeline verification next; G2 remains incomplete.
