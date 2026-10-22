# 当前执行：Windows编辑器图片粘贴定向诊断（2026-10-22，Asia/Shanghai）

核PR13最新41a2d89cae627d4ea001204f6b9252d967c2c57a，继承另一次任务已接入的tools/ci/quality.mjs Windows专项，不覆盖或改流水线。Run39785588369 Ubuntu成功，Windows119847922073表格57通过、首次图片超时、pr-gate失败，启动自检NOT_RUN；pr-trust failure39785584531。Artifact12428893855已实际下载和读取，原报告只有waitFor超时/errors[]/external[]，缺clipboard/stage/DOM错误证据，HTML在临时库未被上传，不能确认根因。

只补原smoke与验证页面必要诊断：paste事件/主进程clipboard.read与getType计数、media adapter实际stage调用结果、图片DOM/页面alert/本地资源请求和独立库证据。保留真实paste→media.stage→节点路径、30秒和全部断言，不直接insertImage冒充首次粘贴、不放宽门禁。先同路径Linux比较；证据足以确认直接故障才最小修复，证据不足则保存诊断并让现有Windows Job区分失败阶段。57/完整集成/启动恢复及类型构建按影响回归；无Windows结果不能外推，不重跑S0/S1/C-D、不进入S3。保存原分支/PR、核新SHA与一次即时CI后退出。

---

历史计划：

# 当前执行：S2最终验收准备（2026-10-22，Asia/Shanghai）

起始SHA326572b6e46982ac74223547874956ee7f967a28已核；Run39776290661 Ubuntu/Windows quality及pr-gate/scope success，最新pr-trust failure→39776475352。本轮用户授权继续隔离验收，不代表可信审核放行。本机Linux，没有Windows/系统IME测试环境；不重复有效57/业务/协议证据，不跑C/D、不实施FAST/FULL、不进入S3。

先确认现有入口→补最小人工启动工具（只新建临时数据目录、原页面、真实剪贴板、pageerror/进程日志、测试快照重开；不改业务组件/正式保存协议）和短清单→构建/验证工具自身启动、失败保存内容保留及重开路径→仅更新必要交接。Windows57及完整smoke/真实IME/剪贴板/拖拽/离线均NOT_RUN，用户实际操作后才能重评S2 DONE。修复完整smoke失败证据写死/tmp导致Windows不能留HTML的问题，不削弱原断言。保存原分支，核完整SHA/一次即时CI退出；无自动审核/合并/发布。

---

历史计划：

# 当前执行：恢复S2/T05表格竞态（2026-10-22）

当前本地：公开扩展57/57、完整editor smoke（15 PASS+限制探针）、Node6/quality273/协议21/Electron4+5通过；T05真实IME/Windows仍NOT_RUN，S2 BLOCKED。

已核PR最新4aebc2682c9e8b46c57bf311e9479432e9d3004a；质量39763577036双平台/pr-gate/scope success；Windows真实D:\a\_temp独立安装13962.7299ms且隔离/锁/yaml/三模式通过，冷启动故障DONE，不重跑C/D调查。pr-trust当前failure→39763767234，仍保留可信审核阻塞；用户本轮明确授权恢复隔离S2开发，局部修改不代表合并/发布放行。FAST/FULL只设计，本轮暂缓实施，继承S0/S1。

已读S2设计/组件/原生复现/失败、T05–T08与包内编辑器评审。npm当前stable仍7.22.3；本地table-block捕获旧state后在RAF/20ms派发；上游issue2495亦报告延迟选择覆盖。先复现原失败保留证据；以公开$view/TableNodeView扩展替换仅点击选择适配，保留原表格组件、行列/对齐/拖拽/键盘等功能。取消已被编辑/选择取代的旧点击，执行时读取当前state，销毁清理调度；不吞异常、不延时输入、不修改node_modules/私有方法/禁表格。若公开扩展不能稳定保留必要功能，才同fixture验证备选。

专项必须覆盖RAF与CellSelection分支，文档和仅选择更新、多次点击、表格删除/重建/销毁、同单元格编辑/Tab/行列操作/序列化、双实例；保留原生未适配最小复现与pageerror断言。然后完整editor smoke T05合成输入/undo及T06–T08媒体/公式/颜色/保存恢复/离线安全、必要Node/协议/build/Electron回归。真实OS IME、Windows编辑器实机/系统剪贴板/Base64未验不能标PASS；S2总Gate仍要按实际范围判断，不进入S3。

完成→更新PROGRESS/HANDOFF/TEST_REPORT/ADR/API差异/PHASE-GATES与证据→原分支/PR保存→核完整SHA/一次即时CI后退出，不等待、不自动审批/合并/发布。

---

历史计划：

# 当前执行：独立D盘冷启动目录修复；FAST/FULL仅规划（2026-10-22）

本地代码/专项20/pipeline182/quality273与协议21已完成；FAST/FULL完整设计已保存，分级未实施；Windows独立D新路径待新CI。

起点a8b4d61ea43093d86f38a28659351ef16568fffc已核，Run39759121731 Ubuntu成功、Windows test:pipeline失败/pr-gate失败；当前pr-trust failure→39759353663。用户授权在原分支/PR修复。Artifact12417536862已读取：A(C)120045.7208ms超时、118802.5741ms成功；B(D)10420.721ms、10469.9876ms成功，完整lock/cache/env相同。继承目录关联证据，不再跑四次调查，不认定物理磁盘或AV根因。旧B位于源码树内，其成功不可替代真正隔离验收。

顺序：新增测试临时根选择与隔离检查（Windows优先实际D盘RUNNER_TEMP，否则源码外D盘同级目录；拒绝源码树内/任何祖先node_modules/非D候选）→ 旧四次完整安装对照代码移至显式专项入口，保留每日合成单测和全部历史证据 → 正常一次全锁offline ci，安装前ESM与三模式真实缺yaml、安装后锁/yaml本地解析/三模式/完整诊断；120000ms/4MiB严格退出约束不变 → 专项、正常pipeline、必要质量回归 → 文档/证据/原分支保存核SHA与一次即时CI后退出。

FAST/FULL本轮只做完整测试映射、重复安装边界与Required Checks安全方案，暂不实施分级、修改workflow/可信/发布/仓库保护规则。用户随后给出完整修正版，已补齐全部两级设计要求；以该最新指令和当前真实代码为准，不再依赖外部未提交文档。FAST不得替代最新完整SHA的FULL，S2/T05保持BLOCKED、不处理Crepe、不进入S3。

---

历史计划：

# 当前执行：Windows冷启动同机目录对照（2026-10-22）

本地实现/必要验证已完成，Windows对照NOT_RUN/待新CI；本轮只记录一次新SHA即时状态后退出。

本轮用户明确授权在当前红色CI上继续测试侧调查。PR13最新HEAD e3051b0d95c418c348d3ac725c98e8c8ffacd9f2，Run39749260681失败；指定Artifact12413335363的bootstrap/run-zMZeQH/child-t3NvEM已读：C临时目录安装120023.6397ms，ETIMEDOUT、SIGTERM、status=null，最后完成reifyNode @milkdown/crepe112667ms。继承证据，不泛查、不认定平台/杀毒/物理磁盘根因。

实现同一test:pipeline Job内A(os.tmpdir)→B(workspace)顺序完整锁离线安装；固定相同Node/npm、manifest/hash、cache/env、原ci参数、120000ms/4MiB；物理无node_modules，均中文/空格专用新目录。A失败仍B；明显差异（成功/失败分歧，或两次均成功但≥2倍且差≥10秒）仅追加B→A新目录复核，总计最多4次完整锁对照安装。汇总全部记录后统一断言，任一次失败仍FAIL。成功组核锁/yaml/三模式，保留旧负向/独立worktree用例。实际盘符非C/D明确记录；不自动把路径调整当已修复。

输出现有validation-results/bootstrap/run-*/directory-comparison.json/.md（路径/顺序/版本/hash/耗时/error/signal/status/npm最后阶段/安装后校验），复用现有always上传，无workflow或业务改动。完成本地专项/必要回归、更新交接与测试账本、同分支保存/核SHA/一次即时CI后退出。Windows对照待CI，Linux不能冒充；S2/T05保持BLOCKED，不处理Crepe、不进入S3。

---

历史计划：

# 当前执行：S2 检查点 Windows 冷启动CI定向调查（2026-10-22）

用户授权仅处理46e404a8a7224946854ae7be3c8a18fa062d82d1的Windows Run39745482071 / Job119712802877失败。已核PR最新HEAD未变；Ubuntu success、Windows test:pipeline失败、pr-gate失败，最新有效pr-trust failure（39745800696）。不等待/重跑当前CI，不进入S3，不重做S0/S1或重设计流水线。

原始日志确认Node24.21.0/npm11.19.0；顶层npm ci25秒成功；嵌套真实离线npm ci在120015.5683ms返回status=null。原封装只断言status，没有输出error/signal/stdout、没有保留npm日志；Windows没有报告artifact。缺yaml/损坏lock为已通过的负向测试，不是此故障。底层原因未定，不能按这几项就扩大超时。

当前完成：仅修复诊断丢失，底层Windows根因仍UNKNOWN；保持原120000ms/4MiB。npm11.19本地真实离线4.738/4.906秒、pipeline167/quality273/协议21/build PASS。新Windows记录尚待CI，不能认定已恢复。

顺序：保留原始故障 → 同参数/版本的有界隔离Linux对照、缓存/耗时/npm日志 → 为原spawnSync封装补持久诊断及自测（原120000ms、4MiB、真实全量锁安装/严格退出0断言不变）→ 证据足够才做根因最小修复；缺Windows证据则保存诊断检查点，不宣称CI恢复 → 必要本地回归/三份记录 → 原分支PR保存/核SHA/一次即时CI退出。

Crepe原生表格竞态/T05 FAIL、S2 BLOCKED以及真实IME/剪贴板/Base64/Win编辑器实机NOT_RUN保持。不改审批、发布、workflow/依赖；不降低冷启动验证。以下为历史计划。

---

# 当前执行：S2 MarkdownEditor + Media 独立验证（2026-10-22）

已读取 PR #13 的完整 HEAD 19ab62dfe806174060478ffdb05fe955bea223bd：quality 39726201464 的 Ubuntu/Windows/pr-gate 全部 success；最新有效 pr-trust status success，target 39730661706。S1 自动化 Gate DONE；真实旧 RC、Win10/11、真实断电等 NOT_RUN/BLOCKED 保留。未发现新增完整性阻塞，生产默认604且不自动升级。

当前：实现与必要回归完成，S2 BLOCKED。原生Crepe7.22.3表格异步旧事务竞态最小复现FAIL；保留专项失败，不最终选型、不进入S3。真实IME/系统剪贴板/Win离线/单MD Base64仍待验证。详见MARKDOWN-EDITOR-ADR。

执行顺序：原包编辑器评审/协议/v3.7 UI → 锁定 Milkdown/Crepe 并实测 → 独立懒加载入口与共享组件/资源适配器 → T05–T08（往返、30%/80%、数学/颜色、安全、离线、多实例、保存失败）→ 必要全量/协议/build/Electron 回归 → 更新记录 → 原分支/PR保存 → 一次即时CI快照并退出。

仅S2；不接正式编辑/发布/评分页面，不改迁移模块、数据库保护、流水线或可信策略。真实中文 IME/Win 离线不能冒充自动化通过；关键要求未验证或失败则 S2 不放行 S3。

---

历史计划（状态以本节为准）：

# 当前执行：S1.c（2026-10-22）

已核精确f24c6b05e10e925a52a7ff57c62f300a40597d25：quality39721268828的Ubuntu/Windows/scope/pr-gate成功，pr-trust提交状态success（owner审核39723537044）。沿用现有分支/PR和S0/S1.a/S1.b证据。

本轮实现与本地验证DONE：606 no-op/回滚、604/606全备份、显式隔离协调器、旧写同事务adapter/水位、30项专项及全量267/协议21/build/Electron4+5通过；当前新SHA远端门禁待核。更新记录/同分支保存/一次即时CI后退出，S1整体IN_PROGRESS，不进入S2。

安全边界：不接自动启动升级，不操作真实用户库；仅显式协调器在合成/隔离目录验证完整激活路径。openDatabase默认仍不接受606；606只有协调器持有唯一租约、验证日志/指针/epoch并安装事务adapter后才可创建协议。旧Application仍唯一业务写入所有者；新表为同事务投影，异常必须回滚旧写/回执。S2及编辑器/发布/评分UI不进入。不改流水线、可信策略或测试门禁。

---

# 当前执行：S1.b（2026-10-22）

沿用PR #13与原分支；S1.a d334d91a26478c2ea4e899126f172138da91ebfe 的quality 39718272521 completed/success，精确SHA pr-trust success（owner审核39719132662）。S0/S1.a证据有效，不重复设计/全量审计。

本轮模型/协议实现和本地测试DONE（237/237、协议21/21、build、Electron4+5）；更新记录并保存同分支后取即时CI快照退出。S1.b远端门禁待核，S1.c尚未执行。

605已被origin/feature/unified-image-recovery占用，选择目标606。S1.b在隔离合成副本建立Card/不可变ContentVersion/单模式Draft/StudyCycle/ReviewEvent；生产openDatabase仍604，不在恢复验证前触发自动升级。只读API通过旧表adapter提供最新数据；旧Application/协议事务仍唯一写入所有者。S1.c完成备份、幂等/中断/重开及原子升级接入后，才能激活新持久化读取，不能把隔离副本当已升级用户库。

不实现新编辑器、draft切换/发布入口、新评分/FSRS或S2–S9；不改流水线/可信/发布门禁。保留全部旧数据、旧入口和测试。

---

# 当前执行：S1.a（2026-10-22）

沿用同一任务/分支/PR #13，不运行task:init、不重做S0。S0最终SHA acf8556bf5691ce49d380cac93842f9804c065ac 的PR质量39715355519、可信39715352908均completed/success；当前head/base未前移。

S1状态IN_PROGRESS；S1.a本地已完成且测试通过，当前代码检查点CI待核实。按原ADR已完成S1.a：冻结schema604合成fixture → 只读源库/历史/媒体fingerprint与异常拒绝 → 现有ZIP备份的无损恢复基线/WAL/故障验证。S1.b正式schema/统一模型/协议在此基线Gate之后；S1.c幂等迁移与回滚随后，S2–S9不进入。

本轮新增数据保护代码和fixture属于首个跨平台前置检查点；在动真实schema前，需确认此检查点Windows/Linux必要CI真实通过。若本轮保存后CI未结束，按用户机制退出并交接S1.b，不轮询。无DDL升级/旧历史重解释/活动路径切换/发布审批变更。

以下S0记录保留作历史，当前执行范围以上述S1为准。

---

# PLAN

任务：GankSoft v0.7.5 S0 baseline and ADR
分支：feature/v075-unified-learning-workspace
基线：7970896c0306833e3b2f54a843f388d2e380618f

状态：DONE（仅S0；新回执提交的CI待核实）。仅执行 S0；S1–S9 均 NOT_STARTED。

1. DONE：完整读取用户包的 START/权威决策/主指令/路线/验收/S0及架构；校验包完整性。
2. DONE：核对真实 develop HEAD、分支/开放PR/CI/架构/字段/协议；实际打开 v3.7 HTML 参考。
3. DONE：docs/v075 的架构、完整 schema604 字段清单、迁移 ADR、真实 API 差异和阶段 Gate；不改业务/schema/依赖/流水线。
4. DONE：npm ci --include=dev、npm test、check:protocol、build 与必要 Electron 启动/复盘 smoke。测试和限制见 TEST_REPORT。
5. DONE：文档/归档校验、GitHub接口保存与tree读回、Draft PR #13、实现检查点Actions核实。本次补最终交接回执，再即时核最终SHA/Actions并退出，不等待。

下一轮最小任务是 S1.a：先核本分支最终 SHA/CI，然后生成含旧事件/图片/知识/回收站的 schema604 合成 fixture 和迁移前 fingerprint/可恢复快照。后续扩展统一 Card/ContentVersion/Cycle/Event 合同；详细边界见 docs/v075/PHASE-GATES.md。

禁止本轮实现 S1–S9；禁止合并/发布/审批、修改门禁或重新引入流水线试点；根拖整图暂缓；保护原始评分/历史/媒体。
