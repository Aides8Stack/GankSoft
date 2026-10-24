# CI-QUALITY-TIERS — FAST/FULL实施设计

状态：设计DONE，分级实现NOT_STARTED；2026-10-22。依据用户《完整修正版》、a8b4d61ea43093d86f38a28659351ef16568fffc上的真实工作流/脚本及本轮独立目录修复；不再依赖其它未提交设计文件。本提交只修复冷启动测试，**没有实施下面的工作流或规则变更**。S2/T05仍BLOCKED/FAIL。

## 1. 基线、耗时与本轮改动

原Run39759121731/Windows Job119758723844/Artifact12417536862，同Node24.21.0/npm11.19.0、完整manifest/lock/cache/env：C临时目录120.046秒超时、118.803秒成功；源码内D目录10.421/10.470秒成功。只认目录相关性能差异，不再追查C盘慢的底层原因。原D结果不是独立模块解析验收：源码祖先有node_modules。原Artifact保留，完整ZIP及hash、本轮正常安装报告位置见开发TEST_REPORT。

| 参考Run步骤（Job时间戳） | Ubuntu | Windows |
| --- | ---: | ---: |
| job setup | 1秒 | 1秒 |
| checkout | 1秒 | 6秒 |
| Node/Python setup | 1秒/0秒 | 5秒/0秒 |
| 顶层npm ci | 5秒 | 20秒 |
| test:pipeline | 9秒 | 286秒（FAIL，含4次对照及其余测试） |
| ci:quality | 34秒 | NOT_RUN（前置失败） |
| package-check | 60秒 | 平台不适用；当前入口是Linux专用 |
| 报告上传 | 1秒 | 2秒 |

时间戳取整，不包含排队；完整Job日志/步骤快照是证据，不能把约20秒setup/npm等全部归为测试开销。四次完整对照安装总259.739秒。正常路径改为一次真实隔离安装，若新Windows仍约10.5秒，安装部分预计少约249秒（约96%）；这是基于旧工作区D样本的估算，**新独立D路径耗时和新Windows质量恢复待CI**。Linux本轮正常安装6.002秒、pipeline182/182、quality273/协议21通过，不能冒充Windows结果。

本轮正常Windows根选择：先realpath(RUNNER_TEMP)，只接受真实D盘；否则尝试realpath(源码父目录)下mkdtemp独立同级目录。拒绝源码树内部/别名、任何祖先node_modules、不可访问或非D候选；无安全D根直接FAIL，不悄悄回C。保留中文/空格、物理无node_modules、安装前ESM+CJS yaml不可解析和三模式真实缺依赖，安装后解析必须落在本fixture的node_modules；完整离线全锁npm ci及120000ms/4MiB/严格error/signal/status约束不变。只删自建专用目录。

四次对照保存在tools/pipeline/experiments/directory-comparison.test.mjs，显式命令：`node --test tools/pipeline/experiments/directory-comparison.test.mjs`（先正常npm ci预热缓存）。顶层test:pipeline glob不匹配它；8项合成调度/失败保留测试仍每日运行。当前已有足够证据，**本轮不执行此专项**；需要新的定向假设/明确授权时才运行，原B路径仅用于历史复现，不作为隔离验收。

## 2. FAST的覆盖与执行顺序

FAST用于日常反馈，Ubuntu单Job，成功只产生`pr-fast`，不得产生`pr-gate`或`pr-trust`成功。一次正常完整`npm ci --include=dev`（执行生命周期脚本），安装前后核package/lock hash、锁定yaml版本及可用性；不拷贝node_modules。不运行额外完整锁冷安装。失败即停止相依步骤，always上传已产生的诊断；后续真实NOT_RUN。

可执行实施顺序（后续编写tier runner；下面不是已新增命令）：

1. 固定PR head/base/checkout SHA，Node24/npm版本和manifest/lock/platform；正常npm ci一次，保留npm日志与耗时。
2. `node --test tools/ci/core.test.mjs`；`python3 tools/ci/test_zip_manifest.py`；结构/权限/可信/版本/发布/制品等pipeline单测（见映射，先把真实bootstrap安装用例分文件，不能脆弱按名称过滤掉其它用例）。
3. `npm test`：保留当前全部37个文件/273项业务与数据一致性测试，不为缩短时长挑删测试。包含S0/S1迁移、图片/备份、S2六项纯适配测试和protocol-v2全部21项。
4. `npm run protocol:boundaries`、`npm run protocol:typecheck`、`npm run protocol:export`。protocol-v2已随npm test执行，不再重复`npm run test:protocol`；报告明确该覆盖来源与实际case集合，不能把未执行的独立命令伪记为PASS。
5. `npm run build`一次：内部已有vue-tsc、electron tsc和Vite，不在外部再重复类型/构建。验证78定义导出，预期case/导出清单随受审查契约更新，不从当次输出反推期望。
6. `scanSource`/`auditWorkflows`/`auditLock`的实际安全检查（现有security.mjs），不能只跑审计器单测代替扫描。阶段分离函数调用器，不重复npm audit或重新安装依赖；网络依赖审计可由FULL实际执行，FAST中明确NOT_RUN。不能把NOT_RUN当零漏洞。
7. 汇总机器报告与实际case IDs、日志、时长；每个必需项缺失/失败则pr-fast失败。Windows专属冷启动/原生/Electron/ASAR统一NOT_RUN，而非PASS。

FAST的价值先是Ubuntu早反馈，不保证整个FULL墙钟减少；单独增加FAST且仍全自动FULL会增加部分总CPU成本。等冷启动恢复后再量化收益，不把重复Job并行藏起来当“减少测试”。

## 3. FULL的完整覆盖与平台边界

FULL绑定准备合并的**最新完整head SHA**与base SHA，Ubuntu/Windows矩阵，fail-fast=false并保留所有平台报告。每Job一次正常顶层npm ci；完整隔离冷启动有自己的专用空目录npm ci，不能“优化”掉该不同验收目的的安装。离线冷安装只用于测试，不将ignore-scripts/offline套用生产安装。

| 验证集合/真实入口 | FAST | FULL Ubuntu | FULL Windows |
| --- | --- | --- | --- |
| 顶层全锁npm ci、manifest/lock/yaml/版本 | 一次 | 一次 | 一次 |
| 基础设施tools/ci/core.test.mjs及ZIP中文清单 | 全部 | 全部 | 全部（python） |
| npm test全部业务/SQLite/迁移/媒体/调度/备份 | 全部 | 全部 | 全部 |
| protocol-v2、边界/类型/导出 | 全部；protocol单测随npm test一次 | 全部 | 全部 |
| Vue/Electron/Vite类型与构建 | 全部一次 | 全部一次 | 全部一次 |
| pipeline结构/权限/可信/制品/发布/保护单测 | 全部，bootstrap只结构部分 | 全部顶层文件 | 全部顶层文件 |
| 独立空目录全锁冷启动/失败阻断/坏lock/独立worktree | NOT_RUN | 完整 | 完整；真实D根+前后解析证明 |
| 安全源码/权限/锁license/依赖漏洞审计 | 源码/权限/锁；网络审计NOT_RUN | 扫描与依赖审计完整，结果不可用FAIL | 扫描/锁及Windows平台依赖审计完整；不拿Linux成功代替Windows原生检查 |
| package-check.mjs / SMOKE_CONTRACTS | NOT_RUN | 13套107项ASAR/Electron/UI/原生缺失隔离/完整性与结束标记 | 该脚本硬编码Linux原生addon，不直接套用 |
| Windows真实原生/Electron/ASAR | NOT_RUN | 不冒充Windows | 正常安装的Windows原生addon加载；临时Windows打包并用windows-smoke.mjs执行v060/system-v060/v072（含图片/备份/ASAR），EXE版本/来源/完整性按现有工具验证 |
| 旧Inno/安装身份、版本映射、短路径/解压等测试 | 跨平台单测全留 | 原有适用项 | 原有适用项；现存真实安装验收留在其原发布流程，不删 |
| pr-trust/所有者审核、当前SHA门禁 | 独立仍需，FAST不代替 | 独立仍需 | 独立仍需 |
| 诊断、耗时、实际case与SHA报告 | always上传 | always上传 | always上传 |
| 真实Win10/11、真实IME/系统剪贴板/Base64与Crepe竞态 | NOT_RUN/BLOCKED | 不冒充通过 | Runner不是实机；未验证继续NOT_RUN/BLOCKED |

当前pr-quality只在Ubuntu执行package-check，Windows质量Job尚未包含上述Windows临时打包/Electron全路径。FULL设计把它列为必须补齐的明确实施项，不能把当前Windows普通quality绿当作该新增FULL验收已执行。临时打包只用于测试，无Release、Tag、environment approval或生产数据操作。现有develop-rc/stable/便携ZIP/RC/Release/rc-publish-owner流程保持原样，重复安装与隔离协调器的多SHA工作树安装不在本轮推广优化。

先复用现有`ci:quality`全部顺序和`test:pipeline`，确保FULL覆盖不变；下一小步再以清单驱动的单Job runner去除protocol重复执行与重复build，保持每个原case都有一次真实执行证明。FAST与FULL是不同时间的验收，默认FULL独立重测；本设计不引入跨Run“复用PASS”授权链，以避免旧SHA/缓存/制品伪证导致绕过。

## 4. 逐文件完整映射

所有新增tests/*.test.ts默认两级都包含；不能用此快照冻结文件数来排除新测试。下面37文件均FAST与FULL Ubuntu/Windows执行。实际预期case清单和数量应在后续runner落地时纳入受审查manifest，并与真实Node test事件核对；本轮观察273，不是永久不变业务常量。

| tests/文件 | FAST | FULL双平台 |
| --- | --- | --- |
| ai.test.ts | 全部 | 全部 |
| analytics-v066.test.ts | 全部 | 全部 |
| app-version.test.ts | 全部 | 全部 |
| asar-date-fixture.test.ts | 全部 | 全部 |
| assessment-v051.test.ts | 全部 | 全部 |
| audit-v050.test.ts | 全部 | 全部 |
| bulk-ready.test.ts | 全部 | 全部 |
| containers-v060.test.ts | 全部 | 全部 |
| core.test.ts | 全部 | 全部 |
| decks.test.ts | 全部 | 全部 |
| direct-study.test.ts | 全部 | 全部 |
| editor-v075.test.ts | 全部 | 全部 |
| exchange.test.ts | 全部 | 全部 |
| image-binding.test.ts | 全部 | 全部 |
| import-scope.test.ts | 全部 | 全部 |
| migration-baseline-v075.test.ts | 全部 | 全部 |
| migration-recovery-v075.test.ts | 全部 | 全部 |
| protocol-v2.test.ts | 全部 | 全部 |
| reliability.test.ts | 全部 | 全部 |
| review-adaptive-v073.test.ts | 全部 | 全部 |
| review-backup-v073.test.ts | 全部 | 全部 |
| review-budget-v073.test.ts | 全部 | 全部 |
| review-config-v073.test.ts | 全部 | 全部 |
| review-due-v073.test.ts | 全部 | 全部 |
| review-matrix-v073.test.ts | 全部 | 全部 |
| review-performance-v073.test.ts | 全部 | 全部 |
| review-policy.test.ts | 全部 | 全部 |
| review-protocol-v073.test.ts | 全部 | 全部 |
| review-timeline.test.ts | 全部 | 全部 |
| review-v0410.test.ts | 全部 | 全部 |
| study-pages-v065.test.ts | 全部 | 全部 |
| trash.test.ts | 全部 | 全部 |
| unified-model-v075.test.ts | 全部 | 全部 |
| v04.test.ts | 全部 | 全部 |
| v070.test.ts | 全部 | 全部 |
| v071.test.ts | 全部 | 全部 |
| v072.test.ts | 全部 | 全部 |

pipeline当前21个每日文件完整映射（本轮182项；嵌套专项另列）：

| tools/pipeline/文件 | FAST规划 | FULL双平台 |
| --- | --- | --- |
| bootstrap-directory-comparison.test.mjs | 全部 | 全部 |
| bootstrap-process.test.mjs | 全部 | 全部 |
| bootstrap-workspace.test.mjs | 全部 | 全部 |
| bootstrap.test.mjs | 拆分后仅workflow/结构/path guards；真实冷安装/坏lock/独立worktree NOT_RUN | 全部 |
| delivery.test.mjs | 全部 | 全部 |
| inno-resources.test.mjs | 全部 | 全部 |
| install-identity.test.mjs | 全部 | 全部 |
| owner-rc.test.mjs | 全部 | 全部 |
| portable-only.test.mjs | 全部 | 全部 |
| pr-trust.test.mjs | 全部 | 全部 |
| protection.test.mjs | 全部 | 全部 |
| queue.test.mjs | 全部 | 全部 |
| release.test.mjs | 全部 | 全部 |
| scope.test.mjs | 全部 | 全部 |
| smoke-integrity.test.mjs | 全部 | 全部 |
| stable.test.mjs | 全部 | 全部 |
| version.test.mjs | 全部 | 全部 |
| windows-version.test.mjs | 全部 | 全部 |
| withdrawal.test.mjs | 全部 | 全部 |
| work-exit.test.mjs | 全部 | 全部 |
| workflows.test.mjs | 全部 | 全部 |
| experiments/directory-comparison.test.mjs | 不日常运行 | 不日常运行；显式性能专项保留，原非必需门禁的四次实验 |

FULL中的bootstrap.test保留三模式缺yaml、全锁离线安装、hash/yaml/本地解析/三模式启动、错误SHA/版本与detached worktree独立安装、坏lock及success-only阻断，不能因拆分而丢失。新增bootstrap-workspace.test验证真实文件系统隔离/别名/清理/解析污染拒绝；bootstrap-process与合成comparison调度测试全部保留。

Electron/ASAR具体覆盖由tools/validation/smoke-contracts.mjs中的SMOKE_CONTRACTS定义：v060、knowledge-picker、knowledge-filter、mind-workspace、import-cards、study-pages、v066、v070、v071、v072、v073、system-v060、native-failure，13套107项；逐case ID在现有常量中。完整校验stdout完成标记、每套case集合/数量和零未处理错误，不能凭退出0通过。S2独立editor-spike/native table reproduction仍是已知FAIL的阶段验收，不把FULL绿色覆盖其结论。

## 5. Required Checks安全设计

2026-10-22只读API快照：develop规则集25463281 active，strict_required_status_checks_policy=true，required为pr-gate/pr-trust，integration_id=15368，禁止删除/非快进、review threads须解决、bypass_actors=[]。main规则集25463521 active，有PR/禁止删除/非快进/线程规则，但**该规则集没有required_status_checks**；branch API的classic保护同时显示enabled=false/checks=[]。有效rules/branches端点本连接被拒绝，已保存原错误和可见规则集，不声称完整有效规则枚举成功或main已强制FULL。当前两个规则集required_approving_review_count=0；所有者整SHA可信审核来自pr-trust控制文件机制，不把它写成已有“至少1个PR approving review”规则。

推荐保留现有develop Required Checks名字和GitHub Actions来源：

- `pr-fast`：只提供反馈，非合并放行者，不能重用pr-gate名称或写pr-trust状态。
- `pr-gate`：**唯一生产者**只能在最新SHA的FULL完整结束、所有需要项严格success后成功；aggregator总运行（if:always）并显式拒绝failure/cancelled/skipped/neutral/missing/timed_out/action_required，FULL未申请也不能成功。docs-only也不能绕过本两级设计的FULL合并要求。不要给FAST另造同名success覆盖。
- `pr-trust`：现有默认分支固定可信metadata-only机制不改。CI/门禁文件改变仍由所有者审核当前完整SHA，旧SHA审核无效。禁止新增执行PR代码的pull_request_target或给候选代码Secrets/statuses:write。
- 不修改main/develop保护、不增加bypass、不自动审批。main推广前必须先解决并验证可强制的Required Checks：建议由所有者明确授权后为main增加与develop同样来源绑定/strict的pr-gate/pr-trust（若需新增pr-full则另列完整上下游变更），本轮只提出方案，**main的分级放行实施BLOCKED待授权/平台验证**。风险是名字/来源/事件不匹配导致永久pending，或只要求FAST造成绕过；迁移时先让新FULL自动跑绿并确认merge UI，再由所有者配置，绝不能先移除旧门禁。

GitHub会把条件跳过的Job视为不阻断；因此仅把FULL矩阵标记required不够，必须由always aggregator拒绝跳过。官方还明确workflow_dispatch创建的workflow Job checks不满足PR ruleset Required Checks，不能用“手工dispatch FULL绿”直接允许合并。[官方Required Checks说明](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)。

## 6. 触发与SHA绑定方案

推荐先安全过渡，再减少Draft日常FULL次数：

1. 初期保持当前PR每次FULL自动执行，新增Ubuntu pr-fast非required反馈；先确认覆盖/门禁/当前SHA行为。D目录修复本身已省去大部分异常时间，不能为追求提速仓促改规则。
2. 后续经代码审核后，在**正常pull_request上下文**内分级：opened/synchronize/reopened默认FAST；非Draft与ready_for_review始终FULL；Draft中所有者本次labeled `ci:full`显式请求FULL。仅本次labeled事件、actor=owner有效，旧label残留不代表后续SHA已申请/通过FULL。未申请FULL时pr-gate明确失败“FULL_REQUIRED”，Draft继续开发但不能合并。该PR维持Draft不自动转换。
3. FULL和唯一pr-gate留在同一PR workflow依赖图；若拆成reusable workflow，调用者仍为pull_request，pr-gate只在调用者产生。不以workflow_dispatch、issue_comment、workflow_run后台写required success。手工复跑现有正常PR Run只适用于同一完整SHA且当前head/base未变，否则FAIL，不能把旧成功搬到新SHA。
4. 正常PR事件含labeled/ready_for_review符合Required Checks事件要求。部署默认分支工作流、修改任何可信脚本审核hash另需原有所有者流程；本轮不部署。若未来使用merge queue，必须独立支持merge_group并审定merge SHA证据，不在本轮假设已有。
5. 每次开始记录expected head/base SHA（40位）；checkout显式head.sha，运行前verify git HEAD==expected且base是head祖先。报告记录eventSha/headSha/baseSha/checkoutSha/lockHash/OS/架构/Node/npm/tier/workflow/runId/attempt/每个真实case与最终结果。
6. FULL结束、pr-gate放行前只读重查PR最新head/base相等、PR仍open、来源/目标合法；Actions Run与checks绑定该完整SHA、事件和workflow正确，各必需job均completed/success、报告齐备且来源run一致。只认报告里的PASS不够，需核实际Job完成结果、完整性和固定预期集合。head/base变更、新提交、run取消、旧Run重跑、合并提交与head SHA混淆都FAIL关闭。沿用strict up-to-date，不自动合并base。
7. FAST与FULL的concurrency分组区分tier+PR/固定SHA；同tier新提交可取消旧Run，FAST不能取消进行中的当前FULL；旧成功仍只属于旧SHA。不要让重复Job名或其它workflow的success满足pr-gate。选择head/测试合并SHA时以实际checks关联+merge UI证据校验，未验证不宣称安全。

## 7. 缓存、重复安装和报告

允许缓存npm下载内容（按OS/arch/Node/npm/lock hash分key）；不缓存/跨Job复制node_modules，不跨平台搬native addon。每个FAST/FULL顶层Job正常ci只一次；同Job npm test/协议/build复用该安装，开发依赖明示include-dev。冷启动专用新目录的第二次全锁ci是独立验收目标，保留。旧协调器与不同历史源工作树是不同package/lock/SHA，不可因“重复安装”共享依赖；本轮不改stable批处理。

不同时运行npm run ci:quality又逐项重跑它内部相同测试；后续runner二选一管理。FAST全npm test已覆盖protocol-v2，不再另跑21项同一文件；FULL迁移去重先比较前后case集合，所有原case都需实际执行，不能写alias PASS掩盖缺失。build自带类型检查只执行一次；Linux package-check消费同Job本SHA的dist/dist-electron，不重新build。Windows专用打包使用本Job本平台的native依赖，不能消费Ubuntu node_modules。

报告路径按tier/OS/run/attempt/完整SHA唯一命名；保存安装耗时、error/signal/status/stdout/stderr/debug/timing与冷根选择/祖先/解析证明。失败always上传诊断，缺报告=失败；不上传真实用户库或凭据。Artifact至少沿用现有14天留存，关键验收索引/hash入仓库；Retention到期不伪称仍可下载。

## 8. 分步可执行实施清单与验收

| 顺序 | 下一轮改动范围 | 完成证据与门禁 |
| --- | --- | --- |
| A（本轮） | 仅冷根/解析/正常一次安装，重型对照移专项；新设计与交接 | Linux pipeline182、quality273/21已过；Windows新SHA待CI，未提前宣称恢复 |
| B | `tools/ci`新增tier清单/runner/报告，bootstrap按结构与真安装分文件；不先减FULL | 命令级前后完整case ID集合相等；原所有安全/数据/协议/平台测试保留；新文件自动纳入；无flow修改时单测本地验证 |
| C | 增加pr-fast反馈；FULL仍自动，权限/默认可信scope保持，唯一pr-gate仍只看FULL | actual PR同SHAFAST/FULL成功、主动FULL失败而FAST成功仍阻断；取消/跳过/缺报告/旧SHA/错误来源都拒绝；先基准后优化重复命令 |
| D | 真实Windows原生/Electron/ASAR临时测试入FULL，Linux完整13/107仍留 | Windows图像addon、真实Electron/ASAR/备份/缺原生失败路径报告，非Win10/11实机；无发布权限 |
| E | Draft日常FAST与owner请求FULL，最新SHA绑定/always gate | owner控制审核通过；实际最新SHA全部FULL success才可merge；FULL缺失/跳过/旧SHA均红；不自动merge |
| F | 可选main或其它required contexts配置，**仅在用户另行明确授权后** | 提前给出规则diff/风险/回退；保留现有有效required checks与App绑定，平台真实阻断验收。不影响便携ZIP/RC/Release/人工审批 |

每小步本地必要测试→原分支/PR保存→读一次即时CI→交接退出。不能为完成分级而等待CI，不把后续实施方案写成已实现。B–F本轮均NOT_STARTED。最小回退是恢复原全自动FULL调度和原命令（保留独立D冷根），不删测试、不放开required checks、不动发布门禁。

当前代码不会因本设计文档自动改变任何Actions、状态生产者、发布权限或Required Checks；部署与平台阻断验收均须后续独立检查点。
