# 当前交接：读取新Windows目录对照；S2/T05仍BLOCKED

原分支feature/v075-unified-learning-workspace、Draft PR13→develop不变。父检查点e3051b0d95c418c348d3ac725c98e8c8ffacd9f2；原质量Run39749260681/Windows Job119725473546失败；最新有效pr-trust failure→39749485110。用户本轮明确授权调查红CI，未绕过可信/合并/发布门禁。自身SHA以远端HEAD/git log -1 -- docs/development解析，提交后即时Run/status写原PR描述和最终回执，不为自身SHA反复提交。

已完成：读取Artifact12413335363正向bootstrap/run-zMZeQH/child-t3NvEM，确认C临时目录120023.6397ms/ETIMEDOUT/SIGTERM/null，最后reifyNode @milkdown/crepe112667ms；四份原文件完整保存于docs/v075/evidence/S2-DIRECTORY-COMPARISON/prior-windows-positive。已提交的代码范围仅测试侧同机目录实验，不是业务修复或超时放大。

test:pipeline现在顺序A1(os.tmpdir)→B1(workspace/validation-results/bootstrap/sources)。同Node/npm、完整package/lock/hash、实际cache与child env hash、ci --include=dev --ignore-scripts --offline --no-audit --no-fund、120000ms/4MiB；全新专用中文/空格目录，安装前lstat证实无node_modules，不复制依赖。安装成功/失败分歧，或都成功但≥2倍且差≥10秒，才反向B2→A2一次；最多4次对照安装。A失败仍B，最后汇总任何失败仍门禁FAIL。每次成功继续manifest/lock、yaml、timing及三模式完整断言；旧负向/独立worktree控制保留。只清理mkdtemp所有目录，诊断外置保留；沿用现有workflow与always artifact，无审批/发布改动。

本地已通过：专项14、其余19个pipeline文件TAP168、完整test:pipeline退出0（捕获spec缺汇总，不推算总计）、ci:quality业务273/协议21/基础设施5/ZIP1/边界/类型/78导出/build。最终Linux A4283.318ms/B4195.231ms，根/与/，两组全检查PASS，无反向，不能称Windows或C/D验证。Windows对照NOT_RUN本地，慢的原因仍UNKNOWN。

下一准确入口：

1. 读取PR最新完整HEAD及该SHA quality的Ubuntu/Windows/pr-gate、最新有效pr-trust真实状态；本提交后的即时Run见原PR13描述。运行中不轮询。要恢复后续S2必须全部必要门禁通过；可信失败须所有者按新完整SHA处理，旧审核不能替代，不自动审批。
2. 无论Windows quality成败，读取**该SHA**的pr-reports-windows-latest-<run>-<attempt> Artifact，找到bootstrap/run-*/directory-comparison.json和.md，及每行指向的child-*/result.json、stdout/stderr、npm-logs。核实际Windows平台、路径/盘符、执行顺序、版本/完整lock hash/环境hash/缓存、120000ms与4MiB、耗时、error/signal/status/最后阶段及全部后验；报告非C/D就明确非C/D。原Artifact12413335363仅是前序超时证据，不能充当新对照。
3. A慢B快且反向同方向仅记录“目录相关性能差异”，不能归因物理磁盘/杀毒；下一步优先最小调整临时目录并保留隔离/中文/全部断言。两处超时需实际完成耗时或资源证据再提出一次有界验证，不能无限扩大超时或宣称GitHub全站故障。两处成功只记本次未复现。120秒本轮公平固定，未来有证据可讨论有限调整。
4. 当前SHA必要门禁通过后，再继续**S2表格竞态修复或同fixture备选验证**。Crepe原生竞态、最小复现、失败日志/pageerror均保留；真实IME/系统剪贴板/Base64往返/Win编辑器实机NOT_RUN/BLOCKED。Windows恢复不代表T05/S2通过；不进入S3、不改生产数据库保护、不操作真实用户库。

保存采用核实HEAD为parent/base tree、expected_sha、force=false，核远端完整SHA/tree后仅一次即时CI，退出不等待，不新分支/PR、不强推、不自动合并/发布。

---

以下历史交接状态以上节为准。

# 当前交接：先收集Windows冷启动诊断；S2仍BLOCKED

原仓库/分支/Draft PR13→develop不变。已核父检查点46e404a8a7224946854ae7be3c8a18fa062d82d1；Run39745482071的Windows Job119712802877在test:pipeline失败，Ubuntu成功、pr-gate失败；最新有效pr-trust failure→39745800696。没有用S1旧SHA门禁代替当前结果。

Windows真实日志：Node24.21.0/npm11.19.0；顶层ci25秒成功；bootstrap.test.mjs原229–245真实离线全锁ci在120015.5683ms返回null退出码。原error/signal/npm日志未记录、临时源被finally清理、无Windowsartifact，故**底层根因未确认，不能宣称Windows已修复/瞬时环境故障或确需提高超时**。缺yaml/损坏lock为正常负向证据。

实现仅tools/pipeline/bootstrap.test.mjs、bootstrap-process.mjs和5项bootstrap-process.test.mjs：逐子进程持久诊断、npm timing/debug、node/npm/cache/锁包数量；原120000ms/4MiB上限及完整真实冷启动断言保留并加强无error/无signal/退出0。新报告在validation-results/bootstrap/run-*/child-*/{result.json,stdout.txt,stderr.txt,npm-logs/}，自动由现有always上传步骤覆盖，没改workflow/审批/发布/依赖。原临时checkout仍清理，不复用node_modules；每次证据目录独立，不重用旧PASS。

本地通过：npm11.19流水线167（含新增5）、业务273/协议21、基础设施5/ZIP1/构建。单次在线预热后Linux真实离线安装4.738秒，完整pipeline同安装4.906秒；初始缺缓存探针ENOTCACHED<1秒。仅Linux证据，没使用Windows/真实用户库，也未无依据重跑旧CI。

下一准确入口：

1. 读原PR最新完整HEAD及该SHA的Ubuntu/Windows quality、pr-gate、最新有效pr-trust。提交后的即时状态见原PR描述；运行中/未通过就停止，不轮询。当前文档不可能含自身SHA，按远端HEAD/git log解析。
2. 若Windows冷安装仍失败，优先下载其现有pr-reports-windows artifact，找到cwd为coordinator且args为npm-cli ci的正向child目录；cwd为failed install的是损坏lock负向用例，不能混淆。对照result的error.code/signal/status/elapsed，完整stdout/stderr及npm-logs的debug/timing最后完成/未完成阶段；再判断cache/文件系统/进程/npm版本/预算。不要先扩大timeout、删除冷安装、接受null或修改workflow。旧Run没有这些证据，不假装已经看过。
3. 当前SHA必要门禁全部通过后，再继续S2表格竞态修复或同fixture备选验证。T05原生Crepe竞态FAIL、最小复现与pageerror断言保留；真实IME/系统剪贴板/Base64往返/Win编辑器实机NOT_RUN/BLOCKED。不因CI绿将S2改DONE，不进入S3，不重做S0/S1。

本轮原始Job、Linux对照、真实npm日志和测试输出见docs/v075/evidence/S2-WINDOWS-BOOTSTRAP-*。未完成：原Windows根因/恢复结论及新SHA远端门禁；必须读取新诊断CI才能进一步有据修复。提交推送核SHA后只取一次即时CI并退出，不自动审批、合并、发布。API保存沿用最新base tree/parent、expected_sha与force=false；保留本地恢复stash，不强推。

---

以下历史交接的当前状态以上节为准。

# 当前交接：S1自动化DONE；S2候选验证BLOCKED，不进入S3

仓库Aides8Stack/GankSoft；feature/v075-unified-learning-workspace；原Draft PR #13→develop。本轮父检查点19ab62dfe806174060478ffdb05fe955bea223bd。精确S1.c检查点19ab62dfe806174060478ffdb05fe955bea223bd：quality39726201464的Ubuntu job119650594353、Windows119650594402、pr-gate119651723739均completed/success；scope119650548049亦成功。最新有效pr-trust提交状态success，target39730661706，明确绑定该完整SHA。旧自动trust失败已被该有效状态取代。S1自动化Gate DONE，真实旧RC/Win10/11/真实断电等NOT_RUN/BLOCKED保留；生产默认604，不自动升级真实用户库。

实现入口：src/editor/{MarkdownEditor.vue,milkdown-adapter.ts,media-adapter.ts,save-controller.ts}；shared/editor/document.ts；src/editor-spike/与tools/editor-spike/独立验证入口；tests/editor-v075.test.ts六项。编码/限制/备选对照见docs/v075/MARKDOWN-EDITOR-ADR.md，复现命令见EDITOR-COMPONENT.md，API边界已补API-CONTRACT-DELTA。

当前阻塞：Crepe7.22.3表格点击捕获旧state，requestAnimationFrame/20ms后dispatch旧事务；期间输入导致mismatched transaction。原生Crepe默认feature、无本项目adapter也稳定失败，详见S2-NATIVE-TABLE-RACE.json。未补丁node_modules、未禁用表格/吞错/增加等待掩盖问题。候选不获准上正式页面；仅隔离验证组件可继续使用。

已通过：全量273（含6项新增）/协议21/构建/基础设施5/ZIP1、Electron原流程4+5；S2图片独立30/80、公式编辑和重建、颜色、保存失败/冲突/中断控制、多实例销毁、安全拒绝/本地字体等部分范围。完整S2 smoke保留FAIL（表格异步事务），不能以成功运行覆盖失败。平台clipboard.read注入后真实IPC/解码/资源持久化已测；系统剪贴板实际读取无图、真实OS IME、Win10/11脱网、单.md Base64往返仍NOT_RUN/BLOCKED。SQLite JSON fixture不冒充正式草稿API，内存save adapter不代表S3完成。

下一次准确入口：

1. fetch原分支，读PR最新完整HEAD的Ubuntu/Windows quality、pr-gate及最新有效pr-trust。当前提交后的CI只取一次即时快照，真实SHA/Run见PR描述；运行中/失败停止，不轮询，失败定向读取job日志。不能复用19ab62d旧审核。
2. 继续S2，先`npm ci`、`npm run build && npm run build:editor-spike && node tools/editor-spike/reproduce-table-race.mjs`复现（当前预期诊断exit1=FAIL）。读ADR，验证上游受支持修复版；若不能解决，使用相同T05–T08 fixture实装对照Vditor，再考虑Cherry。不要重新S0审计/迁移设计，也不要通过改测试时序隐藏库竞态。
3. 补真实中文IME（标题/列表/表格长文、光标/撤销）、系统图片剪贴板、Win10/11便携脱网、单.md Base64资源往返；当前尚无最终编辑器选型或S3准入。只在S2所有必要要求真实通过后判断下一阶段，届时另按用户授权；本轮不进入S3。

正常应用build清除验证入口；验证脚本固定新临时目录，禁止手工对真实用户数据目录运行POC。不增加/启用生产Draft/publish/新评分接口，不改S1安全激活保护。真实旧RC/断电等仍未验收；不合并、不发布、不自动审批。

提交不可能包含自身SHA；当前提交内CI=PENDING_NOT_OBSERVED，最终SHA从PR/head与git log解析。原PR描述记录真实远端SHA/tree/即时Run，避免回写自身SHA反复触发CI。Git HTTPS无凭证时沿用既有API tree/commit/ref流程，parent/base_tree绑定最新已核HEAD、expected_sha且force=false，fetch核对tree后本地快进；远端若前移先停查，绝不强推。

---

以下为历史交接，当前入口以上节为准。

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
