# 当前进度：S2最终验收等待Windows人工证据（2026-10-22，Asia/Shanghai）

已核PR13完整HEAD326572b6e46982ac74223547874956ee7f967a28，Run39776290661 Ubuntu119816032219/Windows119816032326/pr-gate119817726034/scope均success；latest pr-trust failure→39776475352/job119816591373，真实日志CI_POLICY_REVIEW_REQUIRED: owner must review this exact SHA。用户授权隔离验收，不代所有者审核。Windows冷启动DONE、FAST/FULL实施暂缓，S0/S1不重做。

本机Linux，Windows57/完整smoke和真实IME/系统剪贴板/拖拽/脱网均NOT_RUN。新增tools/editor-spike/manual-acceptance.mjs直接打开原验证页面，仅新建临时数据目录；capture保留截图/完整当前与成功保存JSON、pageerror/browser/进程日志，restart通过测试JSON和同一隔离资源库重启Electron，人工结果永不自动PASS。它是测试adapter重开，不是S3正式Draft持久化。简短PowerShell入口与6项清单见docs/v075/S2-WINDOWS-ACCEPTANCE.md。

自检发现真实字体CSP问题：独立build内联data:font被font-src self拒绝，pageerror未捕获。仅spike vite.config设置assetsInlineLimit:0输出40个本地字体，CSP不放宽。完整smoke失败HTML改写至本次mkdtemp目录，修复Windows无/tmp导致日志丢失的诊断问题；业务/依赖/协议/流水线无改动。首次工具焦点自检失败记录保留，改为真实编辑区域focus再Ctrl+S。

本轮Linuxbuild+spike、工具自检（失败内容保留/重试/真实进程重开、errors/browserErrors/external均空、无failedFonts）、57/57及完整editor smoke16记录（15PASS+限制探针）PASS。273/协议21/默认Electron等继承精确基线有效结果，未重复运行；不能冒充Windows。小结证据S2-ACCEPTANCE-CHECKPOINT.json，原57和原生失败历史证据不删。

**S2/T05–T08总Gate仍BLOCKED，不能进入S3。** 下一入口：当前新SHA门禁真实核对→所有者完成对应pr-trust→Windows按清单跑57/完整smoke/6项人工（Win10/11分别记），提交结果后重评DONE。Windows编辑器ASAR、Base64交换仍NOT_RUN（后者属S6，不越级实现）。保存后只取一次即时CI回执写PR描述退出。

---

历史记录（当前状态以上节为准）：

# 当前进度：S2表格竞态公开扩展自动化通过；S2/T05仍BLOCKED

起点/恢复核实PR HEAD 4aebc2682c9e8b46c57bf311e9479432e9d3004a，原分支/Draft PR13→develop未变。质量39763577036 Ubuntu/Windows/pr-gate/scope全success；Windows真实D:\a\_temp独立全锁冷安装13962.7299ms、隔离/锁/yaml/三模式PASS，冷启动故障DONE，不再C/D调查。起始真实pr-trust failure→39763767234仍为合并阻塞；用户本轮授权隔离S2开发，不冒称可信门禁通过。FAST/FULL实施暂缓，继承S0/S1。

本轮实现DONE（仅隔离候选）：src/editor/table-interaction.ts经公开Editor.remove/use/$view/TableNodeView替换click选择，保留原Table feature/UI/行列/对齐/拖拽与mutation；回调以expected state校验意图，内容或仅选择更新/更新点击/销毁取代旧操作就取消，仅当前state构建事务，destroy取消RAF/timer。保留原RAF及CellSelection20ms安排，没有新增输入延时、不吞异常、不改node_modules/私有方法/依赖版本。原生7.22.3最小复现仍真实FAIL/exit1，原文件和旧证据未删改。

专项PASS：新增公开扩展隔离19用例固定3轮57/57，errors[]，含表头、鼠标/pointer-mouse、RAF/CellSelection、立即内容与仅选择更新、最后点击、删除/替换/销毁、同格/行列命令/对齐/重建完整JSON。完整集成smoke16条记录（15 PASS+原生颜色限制探针）、pageerror[]/external[]；合成标题/列表/表格中文undo/redo、Tab/ShiftTab、30/80真实媒体/重建/进程重启、数学/颜色、失败重试、双实例/安全离线均通过。Node6、quality业务273/协议21/基础设施5/ZIP1/边界/类型/78导出/build、默认Electron4+5通过。实现指纹e1b078dc5a5a4c52ecf6577f22b55ed29e39cdc5a55f3a393011a1f3cd0c777b，证据docs/v075/evidence/S2-TABLE-CURRENT-STATE，新夹具开发失败/更正也保留，不把错误夹具结果当产品PASS。

合同不变：ganksoft.editor/1、asset/placement/width、DocumentAdapter/SaveController、正式Draft/ContentVersion API、生产604保护均未改；组件不直接SQL/文件I/O，正常App未接线。优先继续Milkdown7.22.3+公开扩展候选，本轮无需安装备选，仍不最终生产选型。

**S2/T05 BLOCKED**：真实OS中文IME/光标、Windows编辑器实机/脱网ASAR、系统剪贴板、单MD Base64、真实拖拽手势NOT_RUN。T06–T08只限已测Linux/注入边界路径PASS；原生未扩展失败不被覆盖，新57专项未自动接CI，CI绿色不代表Windows编辑器通过。本轮不进入S3，完成文档/原分支保存后只读一次新SHA即时CI退出。

---

历史进度，以本节为准。

# 当前进度：独立D盘冷启动修复已实现/本地通过；Windows待CI

起点/保存前核对HEAD a8b4d61ea43093d86f38a28659351ef16568fffc，原分支/Draft PR13→develop不变。参考Run39759121731的Ubuntu success，Windows119758723844 test:pipeline failure/pr-gate failure；最新有效pr-trust failure→39759353663。用户最新完整修正版授权本轮修复，不因红色CI退出，不绕过门禁。继承S0/S1，不重做。

Artifact12417536862已真实读取：同Job C120045.7208ms超时/118802.5741ms成功；D10420.721/10469.988ms成功，环境hash/Node/npm/完整锁相同。只认目录相关性能差异，不继续追查C慢原因；旧D在源码子树，不能作为解析隔离证据。原远端Artifact未删改，完整ZIP以base64+SHA256无损保存于docs/v075/evidence/S2-COLD-ROOT-FIX/ORIGINAL-WINDOWS-ARTIFACT.json。

本轮代码DONE（本地）：Windows先realpath RUNNER_TEMP，接受实际D盘；否则尝试源码外D盘同级新专用目录，无安全D根FAIL。祖先任何node_modules/源码内部或别名/非D候选拒绝；安装前ESM/CJS实际缺yaml，三模式真实缺依赖；安装后必须解析到自己node_modules，原全锁offline ci/production include-dev/120000ms/4MiB/严格error-signal-status0、锁hash/yaml版本/timing/三模式均保留。仅清理自建目录，异常前置证明不足不执行安装。缺依赖/坏lock/独立worktree/失败阻断全部留在每日测试。

四次性能对照完整代码移至tools/pipeline/experiments/directory-comparison.test.mjs显式专项，顶层每日glob不再执行；合成comparison8项/process6项继续每日。本轮**未重跑四次对照**，正常路径仅1次全锁冷安装。

本地Linux：专项20/20；正常test:pipeline182/182（完整捕获，无skip/cancel），全锁冷安装6001.938ms、前后解析/锁/yaml2.9.1/三模式PASS；ci:quality基础设施5/ZIP1/业务273/协议21/边界/类型/78导出及Vue/Electron/Vite build PASS。代码指纹7da3fc0da72851510d259df66be902d796fd7c9204c7e1aa6c62f74e95ced9c9，逐文件hash与完整输出见docs/v075/evidence/S2-COLD-ROOT-FIX。原四次对照安装259.739秒→新正常一次预计可少约249秒，**这是旧D样本推算，不是新Windows实测**。新独立D路径/Windows质量恢复NOT_RUN本地，待提交后新CI。

第二阶段设计DONE：docs/v075/CI-QUALITY-TIERS.md完整FAST/FULL映射（37业务文件/21每日pipeline文件/13套107项LinuxASAR及Windows专项），触发/SHA绑定/唯一pr-gate严格FULL/当前pr-trust/保护差异/收益/实施次序。分级实现NOT_STARTED，无workflow、依赖、业务、保护或发布改动；main可见规则集缺required checks的差异已列待授权，不自动配置。手工dispatch Job不能直接满足PR Required Checks，设计用正常PR上下文；不把FAST/跳过/旧SHA当FULL。

S2/T05仍BLOCKED/FAIL：Crepe竞态、最小复现/失败/pageerror不改，真实IME/系统剪贴板/Base64/Win编辑器实机未验；不进入S3。提交后只记录一次即时新SHA CI，交接退出不等待。

---

历史进度，当前状态以上节为准。

# 当前进度：Windows同机目录对照已实现，Windows待CI（IN_PROGRESS）

继承原分支/Draft PR13→develop；本轮起点与保存前PR最新HEAD均为e3051b0d95c418c348d3ac725c98e8c8ffacd9f2。真实已读Run39749260681失败/Windows Job119725473546、最新有效pr-trust failure→39749485110；用户明确授权在红色CI上继续本次定向测试侧调查，没有把旧成功当当前门禁。S0/S1不重做。

指定Artifact12413335363的正向bootstrap/run-zMZeQH/child-t3NvEM已读取并无损保存：C临时目录，120023.6397ms，ETIMEDOUT/SIGTERM/status=null，最后完成reifyNode @milkdown/crepe112667ms。**已确认超时，慢的原因UNKNOWN**，未断定物理磁盘/杀毒/平台问题。

实现只改bootstrap测试及process/helper：同Job A1=os.tmpdir→B1=workspace新空目录；全部中文/空格，完整manifest/lock/hash、同cache/env/版本/参数、120000ms/4MiB不变。A失败仍B；明显差异仅反向B2→A2一次，最多4次完整锁对照。报告按实际路径根判断C/D，不伪称跨盘；全部失败最后统一阻断，不挑成功重跑。成功组保留lock/yaml/三模式及timing校验；缺yaml/损坏lock/独立worktree等原测试保留，专用目录外不清理。沿用现有入口/always上传，无workflow/依赖/业务/审批/发布改动。

本地Linux最终A4283.318ms/B4195.231ms，根均/，2次status0且全部后验PASS，无反向；不是Windows/C-D证据。专测14/14、其余pipeline文件TAP168/168、完整test:pipeline退出0（spec无汇总计数，未推算PASS数）；ci:quality基础设施5/ZIP1/业务273/协议21/边界/类型/78导出/build PASS。逐文件指纹与真实日志见docs/v075/evidence/S2-DIRECTORY-COMPARISON，最终实现指纹91675ee0bfc0a32ec5e8ade79066d9722be2f2d2a3be3ed6f04800f3a144fad2。

Windows对照NOT_RUN本地/待新CI，不宣称原失败已修复；原生Crepe竞态、最小复现/失败日志/pageerror不改，S2/T05仍BLOCKED，真实IME/系统剪贴板/Base64/Windows编辑器实机NOT_RUN。不进入S3。保存新SHA后仅一次即时CI回执，记录原PR描述后退出。

---

以下历史记录当前状态以上节为准。

# 当前进度：Windows冷启动CI诊断检查点（IN_PROGRESS，未宣称恢复）

起点/原PR HEAD 46e404a8a7224946854ae7be3c8a18fa062d82d1未前移，原分支/Draft #13→develop不变。已真实读取Run39745482071：Ubuntu success，Windows Job119712802877的test:pipeline失败，pr-gate失败；该SHA最新有效pr-trust failure→39745800696。S0/S1有效证据继承，不重做设计/审计。

已确认故障点：Windows Node24.21.0/npm11.19.0，顶层npm ci约25秒/378包成功；真实全锁离线冷安装在120015.5683ms返回status=null。原封装有120000ms/4MiB限制，但没输出error/signal/完整stdout/stderr或保留npm日志；Windows没有artifact。不能由这些信息确定底层是超时预算、缓存、文件系统、npm或进程问题。缺yaml和损坏lock均是通过的负向测试，未误认故障。

本轮只修复诊断丢失：bootstrap-process.mjs沿用spawnSync/原120000ms与4MiB，逐调用保存result(error/signal/status/elapsed)、stdout/stderr和npm timing/debug到validation-results/bootstrap独立目录，源临时库finally清理不会删除。原真实全锁安装、dev默认覆盖、锁哈希/yaml版本、三模式启动和独立worktree/损坏lock断言保留；成功另严格要求无error/无signal且status===0。不增加超时、不接受null、不重跑旧CI、不修改workflow/审批/发布/依赖。

本地Linux实际：最初缓存不全的离线探针在1秒内ENOTCACHED；单次npm11.19在线ci预热后，隔离同参数离线安装4737.976ms、完整pipeline中的同安装4906.314ms，均status0。npm11.19流水线167/167（原162+新增5）、ci:quality业务273/协议21/基础设施5/ZIP1/构建通过。不能将Linux快装/通过外推为原Windows瞬时故障或Windows已恢复；没有凭据扩大超时。

底层根因仍待下一次Windows诊断；此检查点是可观测性修复，不是已完成的Windows根因修复。保存新SHA后只记即时CI退出，不等待。S2原生Crepe表格竞态/T05 FAIL、pageerror断言与所有未验证项均保持；Windows门禁恢复也不代表S2通过，不进入S3。

---

以下历史进度状态按当时记录，当前以本节为准。

# 当前进度：S2 独立验证完成至候选阻塞（BLOCKED）

精确S1.c检查点19ab62dfe806174060478ffdb05fe955bea223bd：quality39726201464的Ubuntu job119650594353、Windows119650594402、pr-gate119651723739均completed/success；scope119650548049亦成功。最新有效pr-trust提交状态success，target39730661706，明确绑定该完整SHA。旧自动trust失败已被该有效状态取代。S1自动化Gate DONE，真实旧RC/Win10/11/真实断电等NOT_RUN/BLOCKED保留；生产默认604，不自动升级真实用户库。

S2已实现：真实Vue共享MarkdownEditor、Milkdown/Crepe7.22.3隔离候选、受约束Markdown/颜色/图片placement编码、现有media.stage资源适配器、保存状态/组合输入延后保存与销毁边界。独立入口只由验证build生成，正式main/App未接线；不进入S3/评分UI，不改迁移实现/数据库保护/流水线/可信策略。候选依赖锁定且仅devDependencies。

局部证据PASS：数学编辑/渲染、颜色与Markdown往返；同asset两处30%/80%通过真实IPC/解码/落盘后保存、销毁重建和进程重启；多实例销毁、失败重试、恶意Markdown拒绝、Linux无外部请求。系统剪贴板注入只替代平台读取边界，不是系统剪贴板验收。真实中文IME未运行。

关键FAIL：Crepe7.22.3原生TableNodeView延迟提交旧state事务，点击表格后下一帧前输入会报Applying a mismatched transaction。已去掉GankSoft adapter稳定最小复现，诊断exit1；完整编辑smoke有成功及失败，不忽略异常。S2 BLOCKED，编辑器未最终选定，不具备S3条件。详见MARKDOWN-EDITOR-ADR/TEST_REPORT及S2证据。

必要回归：最终全量质量273/273（旧267+新增6）、协议21、基础设施5、ZIP1、边界/类型/78定义导出及Vue/Electron/Vite构建PASS；Electron原有4+5 PASS。新阶段真实Windows离线/IME、单.md Base64媒体交换、正式Draft接线NOT_RUN/BLOCKED。旧测试不改、不删、不skip，不以CI绿覆盖候选专项FAIL。

待做：原生竞态先在受支持修复版或备选（Vditor/Cherry，同fixture）验证；补真实IME/系统剪贴板/Win脱网及Base64往返，然后才能重新判断S2 Gate。当前保存同分支/PR后只读一次即时CI，不等待、不轮询。自身SHA由远端解析，提交内CI保持PENDING_NOT_OBSERVED，真实回执写PR描述和最终回复。

---

以下为历史进度，当前结论以上节为准。

# 当前进度：S1.c（2026-10-22）

S0/S1.a/S1.b有效证据继承；S1.b f24c6b05e10e925a52a7ff57c62f300a40597d25质量39721268828的Ubuntu/Windows/scope/pr-gate均success，pr-trust精确SHA success（owner审核39723537044）。原分支/PR #13及develop基线未变，未重做需求设计或全量审计。

S1.c本地实现/验证DONE；当前新提交CI待即时读取；S1整体IN_PROGRESS，未进入S2。完成项：

- 606的纯验证no-op、独立副本同ID/版本/cycle/event映射；DDL/逐卡/逐事件/提交前异常及进程退出回滚，重开后可重跑，不改源库/媒体/原始分数与unknown历史。
- 604/606完整备份：清单和库真实版本/application_id匹配；新目录拒覆盖；606模型精确DDL/不可变约束/双向来源/水位验证；当前/历史/暂存/会话及版本独有图片闭包。606新deck三模式、单编辑Draft及图片宽度字段可无损恢复并通过受控协议读取。未把604通过当606证据。
- 显式prepareAndActivateUnified/recoverUnifiedMigration/openUnifiedOwner：源外新控制目录、无未决操作、应用marker/query_only+SQLite源写锁、两个验证恢复点、持久日志/原子小指针、独占进程租约、epoch和源/目标所有者校验。提交前恢复源，提交后仅认目标；目标丢失/证据冲突阻断，不回旧库。
- 旧Application仍唯一业务写入者；最外层事务COMMIT前同步projection和digest/revision/epoch水位，与旧写/回执同事务。重放只一次；adapter起始/中途失败均全部回滚。606旧物理purge会丢档时明确阻断，完整回收站整合归S8；评分/FSRS/发布行为未改。

实际通过：最终ci:quality业务267/267（新增30，包含全部旧237）、协议21/21、基础设施5/5、UnicodeZIP1/1、边界/类型/78定义导出、Vue/Electron/Vite构建；真实Electron基本4/4和系统5/5。旧测试、registry合同、依赖、CI/可信/发布流水线均未修改或弱化。

安全激活状态：仅合成/隔离目录完整端到端验证；未接生产启动/公开升级UI，未自动操作真实用户数据库，默认openDatabase仍604。606未受控副本仍拒绝协议；现有604恢复UI在切换目录前拒绝606备份，需受控协调恢复。

T02/T03/T04本地自动化范围PASS，细项见PHASE-GATES/TEST_REPORT。当前新SHA双平台CI与可信门禁、Win10/11实机、真实旧RC库、真实断电/实际磁盘耗尽/Windows目录fsync均未验证；恢复进程自身崩溃的未知恢复锁保守阻断。整个S1尚不满足进入S2的条件，不能把本地部分范围当生产迁移放行。

本次保存后即时查询一次CI并在原PR描述/最终回执记真实SHA/Run/状态；不等、不轮询、不审批、不合并、不发布。以下为历史记录。

---

# 当前进度：S1.b（2026-10-22）

S1整体IN_PROGRESS；S1.a DONE（精确SHA质量/可信通过），S1.b本地实现/验证DONE、当前提交CI待即时观察；S1.c NOT_STARTED；S2–S9未进入。沿用原分支和Draft PR #13→develop，没有初始化新任务/分支/PR。

起点d334d91a26478c2ea4e899126f172138da91ebfe未前移；develop仍7970896c0306833e3b2f54a843f388d2e380618f。已实际读取quality39718272521及jobs：Windows/Linux/scope/pr-gate均completed/success；pr-trust commit status=success，指向owner审核39719132662。未根据用户文字推断通过。605已被远端图片恢复分支占用，因此本阶段目标606。

本轮完成：

- 隔离副本606的Card/ContentVersion/每模式发布指针/单模式Draft/StudyCycle/ReviewEvent/元数据增量模型；稳定原cardId、同card/mode外键、版本/cycle/event不可变、draft唯一与内部CAS约束。混合同deck三模式有专项数据验证。
- stageUnifiedModel在源库之外的WAL一致副本预检后事务构建；当前/事件分别归档，原始42表+sqlite_sequence逐行及4张媒体不变；无pending操作/未知结构才允许。缺历史保持partial/unknown，不捏造旧自评、路径、周期时间；旧评级和完整row/fault/evidence/schedule原样保留。
- shared/protocol/unified.ts显式Zod DTO，新增3个query：card.listSummary、card.getPublishedContent、content.getVersion；registry/gateway/services/生成协议同步。摘要limit50/最大100，cursor绑定范围/revision/epoch，正文按单卡单模式查询；旧75个方法schema与envelope逐项相同。
- 生产仍604，查询直接读旧表；旧Application/协议事务是唯一写入所有者。606只允许隔离service验证，openDatabase和Application protocol尚不接受为活动库；S1.c前不启用自动迁移/新写入口。无新编辑器、发布UI、模式切换或评分/FSRS行为。

实际通过：最终ci:quality（业务237/237，其中新增10；协议21/21；基础设施5/5、Unicode ZIP1/1、边界/类型/78定义导出、Vue/Electron/Vite构建），Electron基本4/4和系统5/5。摘要106卡/每卡3万字符正文，50条页最大13497 bytes；606摘要索引检查通过。依赖和流水线未变，未删除/弱化旧测试。

待验证：本提交双平台CI/ASAR、Win10/11人工、真实旧RC用户库；S1.c的迁移幂等、各中断回滚、重开、604/606完整备份验证、旧写适配/原子激活及epoch恢复。当前T02–T04只有部分模型证据，不是整个S1通过。详细结果与实现指纹见TEST_REPORT/S1B-TEST-OUTPUT。

保存后只即时读取一次当前SHA的CI，实际SHA/Run写原PR描述与最终回执；不等待/轮询，不自动审批、合并、发布，不改可信/发布门禁。

---

# 当前进度：S1.a（2026-10-22）

状态：IN_PROGRESS（S1整体）；S1.a本地实现和测试DONE，CI PENDING_NOT_OBSERVED。S1.b/S1.c NOT_STARTED；S2–S9未进入。

沿用原分支 feature/v075-unified-learning-workspace、Draft PR #13→develop、S0 acf8556bf5691ce49d380cac93842f9804c065ac。起始HEAD与develop均未前移；S0最终质量39715355519/可信39715352908均success。未重跑需求设计或全量审计，未运行task:init，继承S0原文与证据。

本轮完成：

- 冻结tests/fixtures/schema604.sql（与S0 schemaHash一致）和完全合成旧数据：42张用户表+sqlite_sequence、错题/记忆原始评分与缺快照、知识多对多/多根/重名分支、回收站、FSRS/单卡策略、会话草稿、幂等/平台操作、4张当前/历史/作答/未绑定草稿图片。
- migrations/baseline.ts只读源库预检、逐表行摘要/媒体hash、ID/范围/FK/树/图片/草稿引用检查。使用readOnly/query_only，不执行openDatabase修复或schema升级。
- prepareMigrationBaseline复用node:sqlite backup生成WAL一致快照，单独只读核验备份还原内容，源前/备份/源后指纹一致后发布到源目录外新文件；拒绝覆盖。故障清理/重试、并发源变更和进程退出均有测试。
- backup.ts提取readVerifiedBackup供恢复与只读预检共用，保留所有校验；备份清单记录源库实际schema，不再套用当前应用常量。

实测：最终ci:quality PASS（227/227业务含新增25项、协议21/21、边界/类型/导出/构建、基础设施5/5、UnicodeZIP1/1）；流水线162/162；真实Electron基本4/4+系统图片/内容导入导出/完整备份恢复/回收站/取消5/5。没有删除/弱化/skip旧测试。

版本按现有非文档PR门禁预留0.7.5-rc.1（仅package及lock根版本变更，依赖完全不变）；schema仍604，protocol仍2.0/75定义。没有新UI/发布/模式切换/新评分/活动路径切换，不改workflow/审批门禁，不合并、不发布。

待验证：当前代码检查点的双平台CI、Windows硬链接/备份句柄路径行为、Win10/11人工、新schema实际迁移T02–T04。S1.a测试仅是T02/T04前置，绝不称整个S1完成。进入S1.b前需读取该代码检查点CI；此轮保存后即退出，不轮询。

以下为S0历史记录，状态以本节为准。

---

# PROGRESS

任务：GankSoft v0.7.5 S0 baseline and ADR
分支：feature/v075-unified-learning-workspace
基线：7970896c0306833e3b2f54a843f388d2e380618f

状态：DONE（S0）。审计/ADR/基线与远程检查点已保存，Draft PR #13；S1–S9未启动。最终回执提交CI保持PENDING，须按新head核实。

日期：2026-10-22（Asia/Shanghai）。实际 develop 与包快照一致，应用仍0.7.4-rc.6、schema604、protocol2.0。旧 TASK 与 PLAN/PROGRESS/HANDOFF/TEST_REPORT 已完整归档至本目录 history/infra-portable-only-release-6ab4df3a-7970896c0306-1792637499928/；其历史成功不算本轮验证。

已核实：真实源码调用链、42张合成空库表（含协议网关存储）、75个registry定义、原始评分约束、分类型deck/历史与FSRS、图谱排序/正文、图片与备份边界、当前便携流程、开放Draft PR #2/#3/#6/#7。基线develop Run39581175708 completed/success；不是新分支CI。

已完成设计：docs/v075/{ARCHITECTURE-BASELINE,SCHEMA604-INVENTORY,MIGRATION-ADR,API-CONTRACT-DELTA,PHASE-GATES}.md；保存权威需求/规格/全量验收原文。实际打开v3.7原型并审主要页面DOM/包内截图；没有用演示替换Vue。

本轮实测：锁文件冷安装194包；业务202/202、协议21/21、边界/类型/导出75定义、Vue/Electron/Vite构建PASS；真实Electron smoke4/4。protocol:export只校正API-INDEX版本标题rc.1→rc.6，无方法变更。完整命令/输出/限制见TEST_REPORT与docs/v075/evidence。

未实现：全部S1–S9新增业务（混合三模式/发布草稿/统一自评与周期/MD/排序/独立追加等）。未验证：新迁移、编辑器POC、Win10/11人工、私人数据库。头图自动截图超时/outline物理点击超出headless视口，未记通过；DOM审阅不冒充生产UI测试。

下一阶段需用户明确进入S1后，核最终head及真实CI；先S1.a合成迁移fixture和只读备份基线，不跳到编辑器/发布/复盘实现。本轮不合并、不发布、不审批、不等待CI。

## S0 远程保存与即时交接回执（2026-10-22）

- 远程实现检查点：`8fa96a06325e047919a8b05d4c69ec6050676c95`；parent=`7970896c0306833e3b2f54a843f388d2e380618f`，tree=`b970098dd0ea16a80de21fd364d6b4eafd79ba5c`，与本地最终文档tree完全一致，PR与git fetch独立读回一致。
- Draft PR：[13](https://github.com/Aides8Stack/GankSoft/pull/13)，head=`feature/v075-unified-learning-workspace`，base=`develop`，draft=true，未合并。
- 已观察到实现检查点PR quality：[39715137420](https://github.com/Aides8Stack/GankSoft/actions/runs/39715137420)，head_sha=`8fa96a06325e047919a8b05d4c69ec6050676c95`，event=pull_request，completed/success。只反映纯文档PR质量检查，不是新版业务/Windows验收。未等CI完成，读取完整head绑定详情时已结束。
- 普通HTTPS git push因没有登录凭据失败；改用已连接GitHub接口，从核实的base tree构建、parent指向真实HEAD、expected_sha核对且force=false推进ref。未覆盖任何远程工作。初始两个本地提交留在本地local/s0-pre-api保存；当前任务分支重新跟踪真实API远程检查点，无强推/重置/历史删除。
- 本次仅补交接回执；最终回执自身SHA不能写入自身文件，从远程PR/head或`git log -1 -- docs/development`解析。**最终新head的CI：PENDING_NOT_OBSERVED（在提交内记录）**；保存后只即时查一次新head的Actions，最终聊天回执报告真实SHA/Run，不无限追加文档提交。前序成功不能代替新head结果。
- S0已完成；下一轮先查最终head的真实CI，再按用户指示进入S1.a。保留全部测试/审批门禁；不自动合并、不发布、不审批；现在退出，不等待CI。
