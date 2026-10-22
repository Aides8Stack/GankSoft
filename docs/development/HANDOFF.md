# 当前交接：S1.c 本地完成，整体S1待当前SHA门禁

仓库/分支/PR不变：Aides8Stack/GankSoft，feature/v075-unified-learning-workspace，Draft #13→develop。起点f24c6b05e10e925a52a7ff57c62f300a40597d25，已实际核实quality39721268828的Ubuntu/Windows/scope/pr-gate均success；pr-trust提交状态success，指向owner审核39723537044。S0/S1.a/S1.b有效证据直接继承。

本轮实现入口：

- migrations/unified-model.ts：stageUnifiedModel纯606验证/no-op；legacy-projection.ts：来源映射与同事务增量归档；unified-integrity.ts：精确结构/DTO/双向来源/水位校验。
- migrations/coordinator.ts：prepareAndActivateUnified → recoverUnifiedMigration → openUnifiedOwner；源外全新控制目录、源库/媒体保留及两个ZIP恢复点。active.json是提交点；相同目录重试用recover，不覆盖重建。
- infrastructure/write-owner.ts + database.transaction：应用路径冻结、606受控连接、最外层commit前adapter。原Application/host事务唯一业务写所有者，projection失败回滚旧写/档案/回执/水位。
- backup.ts / migrations/baseline.ts / integrity.ts：604/606完整备份识别、只读还原验证、全引用闭包；main.ts仅补604恢复UI在目录替换前拒绝未受控606，没有自动升级入口。
- tests/migration-recovery-v075.test.ts：新增30项，含迁移事务4故障+4进程退出、9协调检查点进程中断、备份/单写者/epoch/adapter回滚等。

安全状态：合成与隔离副本的准备/冻结/转换/606恢复验证/提交/旧API写入/重开路径已通过；真实用户数据库未触碰，生产启动默认604。不能仅删除MIGRATION_NOT_ACTIVATED保护或修改SCHEMA_VERSION接生产。606须由openUnifiedOwner核日志/指针/源目标marker/epoch并持独占租约；默认openDatabase和无所有者606协议仍拒绝。

激活前调用方须排空异步系统操作；任何pending平台操作先用原入口人工核对，协调器不自动承认。源DB应用marker/query_only及独立BEGIN IMMEDIATE锁冻结写入；源和图片不删除。指针前失败恢复可用源，指针后响应丢失报MIGRATION_COMMITTED；目标失联/epoch冲突不自动回旧路径。600–603旧备份沿用原路径，605不支持，未知604结构仍阻断。

已完成：T02两次迁移/no-op与完整指纹/ID、604/606备份还原；T03新deck三模式及旧集隔离、Draft/版本独有图片和受控读取；T04异常/进程中断/重开、源SQL锁、跨进程租约、epoch、真实EEXIST/注入ENOSPC、提交后丢响应/目标失联/缺图/错版本拒绝。本地267/267、协议21/21、构建、基础设施5、ZIP1、Electron4+5 PASS。

未完成/未验证：本轮新SHA远端Ubuntu/Windows quality/pr-gate/pr-trust；Win10/11人工、真实旧RC样本、真实断电/磁盘耗尽/权限ACL、Windows目录fsync。进程exit不是断电证据；恢复进程自身在recovery.lock内再崩溃会保守阻断，须人工核对。新606若旧purge会丢原史则拒绝，完整回收站/清理归S8；生产自动升级与新编辑/发布/评分UI均未启用。

**下一次准确入口**：fetch同分支，核本轮PR最新完整HEAD、对应双平台quality/pr-gate与pr-trust。运行中或失败停止，不轮询；失败只读失败Job定向修复，保留现有测试。需要owner审核时绑定当前完整SHA，前序审核不可复用。当前S1整体IN_PROGRESS，不满足进入S2；只有本轮全部必要远端门禁通过且无完整性阻塞后，才把S1自动化Gate记DONE，并按用户下一轮授权进入S2编辑器POC。不要重跑已有效的S0/S1.a/S1.b审计，不提前接编辑/发布/评分UI。

提交内当前CI=PENDING_NOT_OBSERVED；自身SHA从PR/head与git log解析，实际即时CI回执写原PR描述和最终回复，不为回写SHA重复触发重型CI。PROGRESS/TEST_REPORT/PHASE-GATES已同步，证据S1C-TEST-OUTPUT.txt。保存沿用base tree/真实parent、expected_sha、force=false；不新建分支或PR，不改流水线/可信/发布门禁，不自动审批/合并/发布。

---

# 当前交接：S1.b 本地完成，下一入口 S1.c（先核当前提交门禁）

同一任务/分支feature/v075-unified-learning-workspace、Draft PR #13→develop；S1整体IN_PROGRESS。前序检查点d334d91a26478c2ea4e899126f172138da91ebfe的quality39718272521（Ubuntu/Windows/scope/pr-gate）全部成功；精确SHA pr-trust success，owner审核Run39719132662。S0/S1.a基线有效，不重新全量设计/审计。

本轮实现：electron/infrastructure/migrations/{unified-schema,unified-model}.ts；electron/modules/cards-unified/{legacy,queries,drafts}.ts；shared/protocol/unified.ts；registry/gateway/src.services三个typed只读入口；tests/unified-model-v075.test.ts新增10项。原入口/评分/调度保持；生产schema604，目标606（605被图片恢复分支占用）。

**隔离606是模型验证结果，不是已激活的用户库。** stageUnifiedModel要求源库之外的副本，当前只接受S1.a实测完整604 schemaHash并阻断pending平台操作。旧表不删除，旧raw event/score/FSRS/会话/知识/回收站/媒体不改。没有迁移启动协调器；重跑606尚未实现幂等。openDatabase拒绝606；Application protocol拒绝606/MIGRATION_NOT_ACTIVATED，防止旧写入口造成投影漂移。不要直接解除保护接生产。

604新查询只读旧数据，无learning_*写入；返回的当前内容token绑定card/revision/epoch，是临时当前视图，不能宣称历史已归档。旧token/缺档案明确NOT_AVAILABLE；606隔离service按持久版本ID读，旧UUID alias多个来源时AMBIGUOUS，不任选一个快照。Draft仅内部副本CAS，尚无公开save/switch/publish或新编辑器。

下一次准确入口：

1. fetch原分支，核PR #13最新完整HEAD、对应双平台quality/pr-gate及pr-trust；当前最终SHA从PR/head与git log解析。若失败仅定向修复；运行中/门禁未过保存退出，不轮询，不凭前一SHA通过。
2. 门禁通过进入**S1.c**，从unified-model.ts的stageUnifiedModel + baseline.ts的prepareMigrationBaseline +上述10项测试继续。先做606重复迁移/no-op和原始事件/媒体/版本/cycle ID两次一致；补事务异常、进程退出、磁盘/目标错误的回滚与重开恢复证据，不重做S0/S1.a。
3. 完成606的backup manifest版本范围、readVerifiedBackup/stageBackup/openDatabase/validateBusinessData及引用闭包适配，验证604和606完整备份恢复；当前备份恢复支持范围仍旧版本，不能宣称606已可恢复。
4. 激活前建立冻结写入/无未决操作、单一写所有者、旧入口的同事务adapter/水位、恢复日志/epoch与原子升级策略；新投影不得异步双写。源库和媒体恢复点保留，禁止静默回旧路径。只有S1.c/T02–T04真实通过后才可进入S2。
5. 本地必要测试→更新记录→同分支提交保存→核完整远端SHA/即时CI→退出。无新分支/PR、流水线/可信/发布门禁改动，无自动审批/合并/发布。

本轮本地237/237、协议21/21、构建、基础设施5/5、UnicodeZIP1/1、Electron4+5通过；完整输出/文件hash见docs/v075/evidence/S1B-TEST-OUTPUT.txt。当前提交CI在提交内记PENDING_NOT_OBSERVED，保存后精确SHA/Run/真实状态写原PR描述与最终回执。提交不能包含自身SHA，不为回写生成重复重型CI。GitHub连接器保存沿用真实base tree/parent+expected_sha+force=false。

Win10/11人工/真实旧RC库/本轮606幂等中断重开备份均NOT_RUN，不宣称整个S1已通过。以下旧交接保留作历史。

---

# 当前交接：S1.a 本地完成，等待代码检查点CI

同一任务/分支/PR #13；S1整体IN_PROGRESS。当前文档检查点的完整SHA从PR/head与git log解析，提交不能包含自身SHA。远程保存前状态CI=PENDING_NOT_OBSERVED；保存后即时读取一次，真实SHA/Run/状态记入本轮最终回执及PR描述，不为写自身SHA制造重复重型CI。

本轮实现入口：electron/infrastructure/migrations/baseline.ts 的 inspectLegacyBaseline / prepareMigrationBaseline；electron/infrastructure/backup.ts 的 readVerifiedBackup；tests/migration-baseline-v075.test.ts（25项）与tests/fixtures/{schema604.sql,v075-schema604.ts}。S0架构/ADR/API差异保持有效，不重新设计/另起任务。

下一次准确入口：

1. fetch原分支，读取PR #13最新完整SHA和对应PR quality/pr-trust真实结果；检查是否仍以acf8556为前序、develop有无变化。失败只读失败Job/日志修复；若需owner对控制文件精确SHA审查，按现有门禁处理，不自动审批。运行中报告待核实，不轮询。
2. 本S1.a代码检查点Windows/Linux必要CI通过后进入**S1.b**：按已提交MIGRATION-ADR/API-CONTRACT-DELTA扩增量统一Card/不可变ContentVersion/单模式Draft/Cycle/Event表与typed摘要/内容合同；从合成schema604恢复点开始回填，保留旧UI和唯一写入所有者。schema版本候选605，动手前核实未被占用。不进入S2编辑器/S3发布UI/S4评分。
3. S1.c再验证回填幂等、连续两次迁移、各中断点回滚/重开/备份适配，T02–T04全部满足后才可进入S2。当前未实现这些DDL/协议/迁移，不能把备份故障测试当迁移事务测试。

使用限制：prepareMigrationBaseline尚未接入启动/UI/IPC；调用方必须冻结应用与媒体写入直至返回，三方指纹比较是漂移检测，不是跨进程文件锁。schemaHash是识别证据，非自动放行任意同版本结构；未知额外表也会完整计入指纹，S1.b须明确其映射或阻断。fixture故意保留pending平台操作，制作恢复点可保全它，但真实升级前必须解析/阻断未决操作；不能把有恢复点等同于允许升级。

恢复点只接受源目录外的全新目标文件，使用同文件系统硬链接原子发布（无覆盖），不支持硬链接时安全失败。进程强退出可留下未发布临时诊断目录；重试不会误认其为成功，也不切换活动路径。源表/原始评分/历史/图片未转换或改写，缺失历史正文/路径/自评不补造。真实私有库未打开。

版本0.7.5-rc.1仅为现有PR版本门禁预留；无依赖升级、无Release/Tag。依赖安装沿用同环境S0的npm ci，lock除根版本外逐项一致。普通git push无HTTPS凭据的既有事实继续有效，采用GitHub连接器以真实base tree/parent、expected_sha及force=false保存同一分支；不新建分支或PR、不改门禁。

本地最终227/227、协议21/21、build、基础设施5/5、UnicodeZIP1/1、pipeline162/162、Electron4+5通过。Windows Runner/Win10/11人工、本S1.b/S1.c未运行。完整证据见TEST_REPORT与docs/v075/evidence/S1A-TEST-OUTPUT.txt。

以下为S0历史交接，不将其NOT_STARTED/旧CI当本轮状态。

---

# HANDOFF

任务：GankSoft v0.7.5 S0 baseline and ADR
分支：feature/v075-unified-learning-workspace
基线：7970896c0306833e3b2f54a843f388d2e380618f

当前状态 DONE（仅S0）：本地审计/设计/测试、远程保存及Draft PR #13已完成；S1–S9未启动。最终回执提交CI须按新head核实。

先读 AGENTS.md/STANDARDS.md、本目录TASK/PLAN/PROGRESS/TEST_REPORT，以及 docs/v075/README.md。权威需求按最新用户明确决定 > AUTHORITY-AND-DECISIONS > FUNCTIONAL-SPEC/TEST-MATRIX > 历史资料；不要按旧任务/旧zip恢复废弃功能。

本轮只改文档和历史归档。docs/v075 包括真实字段/接口/模块/UI映射、schema604合成DDL清单、迁移和回滚策略、API差异、S1–S9门禁、三份包内权威原文及真实测试输出；API-INDEX仅由既有export校正版本标题。业务源码、依赖、schema、Vue UI和所有workflow未改。

重要差距：develop仍deck.kind隔离、直接保存正文自动重置、self_score与correct绑定；没有统一编辑草稿/内容版本档案/cycle；图片共享组件宽度不持久，#2图片分支不是已合入实现；内置AI API需后续退役。不要据旧报告宣称schema605/独立图片宽度已实现。

远程基线develop=7970896c0306833e3b2f54a843f388d2e380618f，基线Run39581175708 success。本任务Draft PR和新commit/Actions待本轮提交后即时读回，不用旧Run代替新head。提交不能包含自身SHA，最终检查点从 `git log -1 -- docs/development` 与远程PR/head解析；若有一次回执提交，其前序SHA/Run只属前序提交，不无限写回。

恢复步骤：

1. `git status --short`、fetch origin、核本分支和origin/develop/PR完整SHA；不覆盖未提交工作、不force push。
2. 仅用户明确“检查CI并继续/进入S1”才读最终head的Actions。失败先取失败Job原始日志定向修复；运行中报告待核实，不轮询；成功才进入用户指定阶段。
3. S1最小入口：schema604合成fixture、只读schema fingerprint、事件/图片/调度原始清单、node:sqlite备份和故障注入策略；对照MIGRATION-ADR/API-CONTRACT-DELTA冻结ID/版本/评分来源合同，再扩增量迁移。
4. 保留正常cardId/全部旧历史/FSRS与媒体；旧评分不伪转；缺历史正文或关联路径保留unknown；碰撞/损坏阻断。新编辑/发布评分不提前接入，S2才编辑器POC。
5. 必要本地测试→记录→提交普通push→核SHA/Actions一次→退出，不等CI；不合并/发布/审批、不改现有便携门禁。

本轮Windows10/11人工、新迁移与真实用户DB均NOT_RUN。原型DOM已打开；headless截图与outline物理点击未通过，见TEST_REPORT，不能当正式UI验收。

## S0 远程保存与即时交接回执（2026-10-22）

- 远程实现检查点：`8fa96a06325e047919a8b05d4c69ec6050676c95`；parent=`7970896c0306833e3b2f54a843f388d2e380618f`，tree=`b970098dd0ea16a80de21fd364d6b4eafd79ba5c`，与本地最终文档tree完全一致，PR与git fetch独立读回一致。
- Draft PR：[13](https://github.com/Aides8Stack/GankSoft/pull/13)，head=`feature/v075-unified-learning-workspace`，base=`develop`，draft=true，未合并。
- 已观察到实现检查点PR quality：[39715137420](https://github.com/Aides8Stack/GankSoft/actions/runs/39715137420)，head_sha=`8fa96a06325e047919a8b05d4c69ec6050676c95`，event=pull_request，completed/success。只反映纯文档PR质量检查，不是新版业务/Windows验收。未等CI完成，读取完整head绑定详情时已结束。
- 普通HTTPS git push因没有登录凭据失败；改用已连接GitHub接口，从核实的base tree构建、parent指向真实HEAD、expected_sha核对且force=false推进ref。未覆盖任何远程工作。初始两个本地提交留在本地local/s0-pre-api保存；当前任务分支重新跟踪真实API远程检查点，无强推/重置/历史删除。
- 本次仅补交接回执；最终回执自身SHA不能写入自身文件，从远程PR/head或`git log -1 -- docs/development`解析。**最终新head的CI：PENDING_NOT_OBSERVED（在提交内记录）**；保存后只即时查一次新head的Actions，最终聊天回执报告真实SHA/Run，不无限追加文档提交。前序成功不能代替新head结果。
- S0已完成；下一轮先查最终head的真实CI，再按用户指示进入S1.a。保留全部测试/审批门禁；不自动合并、不发布、不审批；现在退出，不等待CI。
