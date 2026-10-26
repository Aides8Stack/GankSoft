# 检查点 D / S9交付准备（2026-10-26）

当前优先恢复入口。S8.b=CANCELLED_BY_OWNER且完全断开，源码/测试/内部协议保留，不是后续前置条件；S8.c=DONE（开发自动化准入）；S8.d=IN_PROGRESS（实现/本地验收完成，当前新代码Windows尚未验证）；S9=BLOCKED（待S8.d Windows及最终便携同包/真实人工门禁）。不为检查点自身SHA循环提交，不自动合并/发布。

## 有效 Windows 证据

C源码6b90d9f21c0ddfc501bbc66891f62235fb178f85/tree67f1987d35272ac669d5ced6067f6f0a143c6027：CI40318743121的scope、Ubuntu、Windows、pr-gate全部SUCCESS。Windows Job121558176690实际日志和Artifact12648307194已读取，ZIP SHA256=8c16bdc4777631db51696f14cf62b9edaebad0ac7975218e46ea81544d2f7f5d；目录迁移7个真实Electron场景PASS，errors/external空，16项目录业务测试包含跨文件系统及指针前后实际process.exit。720宽Windows中文截图已逐图实看，当前目录/目标/空间中文清晰、换行/滚动/控件无重叠，PASS。Linux截图缺中文字体不充作Windows视觉证据。S8.b Windows实际IPC2场景及依赖图224模块/375构建文件隔离PASS，公开定义/导出无追加方法。原Windows迁移UI超时阻断已在有效通过CI闭环；没有改15分钟门禁或删除断言。

## D实现与范围

复用现有deckAction、统一卡片生命周期和知识子树恢复：整集删除记录当时有效learning_cards并按原子批量软删除，恢复只恢复这份清单，不复活此前单独删除的卡片/知识子树。旧catalog/folder入口也复用同一整集逻辑。新typed分页集摘要/批量CAS接口、统一回收站（卡片集/卡片/知识点）和紧凑全局图标入口；管理集的删除先确认范围，批量恢复采用原请求回执/未知结果锁。知识恢复继续原预览、缺父重挂载、同名重命名和事务服务。保留既有永久删除/不可变历史/图片引用保护，不另造清空/绕过历史能力。

D实际：新增整集专项5/5 PASS（混合模式/原身份、原始复盘证据/FSRS/草稿/未发布草稿/关联图片保留、批量失败回滚、缺父文件夹/重名、未完成复盘保护、整库备份/恢复清单和全媒体一致）；受影响既有卡片5/知识11项均PASS；Electron5场景PASS（实际目录删除确认、批量恢复、此前单删卡片仍独立恢复、子树恢复、720布局），errors空。修复窄屏select margin导致4px溢出，保留断言，复测宽638=scroll638。截图仅Linux捕获，真实Windows新界面待CI。

## 本轮回归与限制

完整npm test=503/503 PASS（此后新增整集备份专项已单独连同该套5/5 PASS，未伪称504全量重跑）；协议21/边界/类型/146方法导出PASS，应用/隔离构建PASS，CI基础5/5 PASS。ASAR13套/107场景PASS，含图片、普通ZIP/JSON交换、整库备份恢复、多页复盘/计时、知识图谱等。最新构建依赖图226模块/621文件无S8.b入口/契约/实现。

npm run test:pipeline实际179/182 PASS、3 FAIL，根因是本地offline npm缓存缺zwitch-2.0.4.tgz（ENOTCACHED）导致冷启动安装及后续yaml/独立worktree断言不能执行；环境依赖项BLOCKED，绝不把整套写PASS，也不改测试或门禁。C同一锁文件的GitHub双平台pipeline有效通过，D新源码由新CI正常安装依赖复验。

最终Win10/11真实人工、物理断电、最终Windows便携同包全部NOT_RUN。版本仍0.7.5-rc.1，不能宣称GankSoft-v0.7.5-win64-portable.zip已生成。既有develop-rc.yml只构建当前develop，原PR未合并且用户禁止自动合并/Release；不dispatch旧develop冒充本分支，不新造发布流程。交付目标ZIP顶层GankSoft/，独立便携文件名不变，见S9-ACCEPTANCE.json。

下一步：保存并核对D完整源码/测试/配置/记录与远端tree，读取新CI首次状态后不等待。后续恢复先核对D Windows实际结果/Artifact的recycle5和S8.b隔离，再满足S8.d准入推进正式S9。没有平台新证据不得标D/S9完成，不访问生产604/真实用户库，不新增首次启动流程。所有原始日志/合成SQLite/大截图仅本地或既有CI artifact，不上传仓库。

---

## 检查点 C：设置内目录迁移故障闭环（2026-10-26）

S8.b最终断开已完整保存62ceb844486ae5caa96b6703bd97f122a805efdd/tree918370e584625b6d8d87cf76d4c1cbc5984b4eda，CI40318191096首次pending。所有S8.b生产契约/导出/控制器/专属兼容路径均移除；状态CANCELLED_BY_OWNER，后续不依赖T39。

本轮C：当前有效目录、目标可用空间与显式迁移状态仅在设置中读取；首次启动行为不变。真实Electron新增确认响应/状态双丢，保留同operationId、锁定取消/恢复/导航，原请求重试跨epoch不重复切换；完整进程重启后当前目录与持久回执一致。7场景PASS，errors/external空；720中文路径截图已捕获待视觉审阅。迁移专项16/16 PASS：含真实不同文件系统、空间不足/预览后容量变化、目标冲突/媒体缺失/旧owner拒写、响应丢失及指针前frozen/prepared真实process.exit恢复原可写库、指针后恢复新库；完整事实/图片/WAL快照保留，无原数据删除。

C实现和本地自动验收已齐；S8.c仍IN_PROGRESS，等待当前源码Windows自动验收及截图实看，不能凭Linux标DONE。真实Win10/11人工、物理断电和最终便携同包NOT_RUN。保持原15分钟质量门禁，没有跳过测试或删断言。继续独立D回收站补齐，不等CI；S9待准入。

# 最终修正检查点：S8.b 完全断开生产调用（2026-10-26）

本节替代所有历史 FEATURE_DISABLED 兼容方案。S8.b = CANCELLED_BY_OWNER，不记DONE/PASS、不作为S8.c/S8.d/S9前置验收。

生产 registry 移除六个方法及专属协议导入；services 不再导出 unifiedAppend，公共 client 无追加特殊处理；restore-session 移除追加控制器、依赖注入、专属调用/回执分支；网关无追加兼容handler或专属拒绝判断。旧请求走通用 METHOD_UNSUPPORTED，不存在契约/handler，不扫描、不转换、不建候选、不写事务或切指针。专属IPC channel/preload原本不存在，唯一通用gank:protocol保持，其公开契约没有追加方法。无追加后台/启动注册。

原 append-*.ts、external-scan.ts、共享内部DTO全文保留；原六条协议定义移至 tests/fixtures/isolated-append-registry.ts，内部协议客户端/会话独立于生产入口。原组件全文不变移至tools/workspace-spike/retained/UnifiedExternalAppend.vue（与048fad4原blob比对完全相同）；原UI smoke和前端实现保留。tsconfig.electron仅排除这些未被引用的专属模块输出，不删除源码。共享协调器/快照/恢复/事务不改。

实际验证：全部保留内部append/external-scan及隔离59/59 PASS；隔离/追加API/恢复API/目录API合计14/14 PASS；生产真实Electron2场景PASS，definedMethods/supportedMethods无六方法，旧IPC无有效路径，数据库/文件不变；构建、隔离构建、协议21/类型/边界/导出144公共方法PASS。构建图审核224可达模块/616产物文件，没有S8.b协议、UI、运行时实现；tools/build/check-production-isolation.mjs已接既有双平台质量门禁。

本检查点一并保留此前C有效WIP：设置内查看当前目录/目标可用空间/迁移状态，新增容量不足/预览后容量变化/目标冲突/媒体缺失/响应丢失/旧owner拒写及实际跨文件系统测试，14项迁移专项PASS（其中4项故障专项、真实/tmp→/dev/shm跨文件系统PASS）。没有首次启动流程。C仍IN_PROGRESS，待扩展UI故障/进程恢复矩阵及Windows证据；D/S9尚未完成。此前B的owner专项实际为3项，旧摘要“5”不准确，以tests输出为准。

原B远端adbc030739c1fb92d22a1061887947df5556dc14/tree c02e39d9a98d3df94b6a836a84aa6a4b530ec21c已核验，CI40316851153首次pending，不等待。所有新Windows/真实Win10/11人工/最终便携同包尚未验证，不能冒称通过。下一步保存本检查点后继续C，再D、S9；不等待CI、不自动审批/合并/发布。生产604和真实用户库未触碰。

---

## 检查点 B：迁移 UI 等待真实提交/重载（2026-10-26）

A已远端完整保存061e5f397d65af5be2b3fb756361cbbb79272d8b，tree c58615474ef44b0534185e2882346316f0658376与本地完全一致；CI40316509135首次in_progress，不等待。

实际下载并阅读Windows40290339566/Job121463867365/Artifact12637610223。原日志只有前三场景及900秒spawnSync ETIMEDOUT。本地追加定点开始/结束诊断复现：确认click已返回，而“学习总览”是设置页仍存在的常驻h1，waitFor立即完成，读到旧活动目录并进入清理；这是测试等待竞态，不能将按钮点击完成当迁移提交完成。改为在click之前注册domcontentloaded等待（15秒，继承既有restore/append同类模式），再断言新活动目录、原数据和真实进程重启。初次及重启都明确设置viewport，避免offscreen自动化窗口坐标不一致。

本地真实Electron5场景PASS（选择取消、中文窄屏预览、候选取消、确认迁移/唯一活动目录/源保留、完整进程重启后持久回执）。保留全部旧断言、900秒门禁和Windows质量步骤，新增逐场景JSON及操作诊断。Windows新修复结果尚未验证；仅证明本地竞态已复现并修复，不能声称已获得Windows根因全部证据或Windows通过。

额外A补验：保留的全部append/external-scan专项59/59 PASS；CI基础5/5 PASS。S8.b仍CANCELLED_BY_OWNER。继续C：仅设置中迁移，补齐当前目录/空间展示与跨盘、容量/恢复失败矩阵；无首次启动要求。

# 当前执行状态：S8 范围调整 / 检查点 A（2026-10-26）

此节覆盖下文历史任务和旧退出条款。原分支 feature/v075-unified-learning-workspace / Draft PR13→develop；恢复基线048fad4afeff3644dac21a15500679a4de4873c8。

- S8.b = CANCELLED_BY_OWNER，不能记 DONE/PASS，也不作为后续准入条件。所有内部实现/协议/原测试及旧UI文件保留。生产设置移除组件、状态和入口；兼容前端 facade 不发请求；公共网关在处理平台/回执/epoch前统一 FEATURE_DISABLED。606 storage session 不导入/初始化追加控制器；只有 tests/fixtures/isolated-append-session.ts 显式注入内部控制器，生产无环境/IPC启用开关。
- Windows质量步骤改为 owner 要求的真实生产隔离验收；原 append-smoke.ts 全文保留，属于已取消的旧生产UI验收，不以继续开放功能让它通过。旧前端实现另存 append-client-preserved.txt，内部服务专项继续执行。
- A实际证据：隔离3 + 内部协议3 + owner8 + 完整恢复API4 + 目录迁移API3 = 21/21 PASS；真实Electron隔离2场景PASS；应用/隔离构建PASS；协议21/边界/类型/149定义导出PASS。禁止请求前后临时库/媒体/控制文件全部hash一致。
- S8.c = IN_PROGRESS，仅设置中主动更改数据存储位置；无首次启动选择/额外检查。已有实现不重写，待Windows超时根因和剩余故障/跨盘验收。
- S8.d = NOT_STARTED，按现有回收站服务补齐；S9 = NOT_STARTED，Win10/11真实人工/最终便携同包NOT_RUN。
- 已实际读取CI40290339566 Windows Job121463867365及Artifact12637610223：Ubuntu PASS，Windows/pr-gate FAIL；迁移UI输出取消选择/中文窄屏/候选取消后900秒spawnSync超时，根因待定位。原始日志仅本地分析不提交。

下一步 B 定位迁移UI停滞并最小修复；再C补齐S8.c、D回收整合、E最终验收。检查点不终止连续任务，不等待/轮询CI；不审批/合并/发布，不触碰生产604或真实用户库。当前保存SHA由Git/远端解析，避免自身SHA循环提交。

---

## 2026-10-26 S8.c只读路径预检（独立检查点）

S8.b最新公共检查点71774e88833b873b59a97e6262fc9b43cd66901a已核对全部810文件一致；前序b2030f6 CI40286846991 Windows/Ubuntu/scope/pr-gate全成功。当前新SHA CI待实际观察，T39/S8.b仍IN_PROGRESS，不将前序结果当新代码通过。

开始S8.c只读预检：relocation-preview.ts在已激活606 owner读取完整SQLite/WAL/媒体baseline并绑定源digest/epoch/revision；目标父目录非符号链接，拒绝已存在、别名、控制/源目录重叠，按目标文件系统保守计算空间。T40专项2/2 PASS，应用构建PASS；此步不复制、不切换、不修改指针。首个未完成是受控跨路径候选/提交/恢复、typed API/UI和跨盘/故障/Windows验收。生产604、真实用户库未访问。

## 2026-10-26 S8.b追加异常与进程重启补验（保存检查点）

在前序b2030f6916c9c92acd0aecff49b7cc44b0ca9eb9之上：现有606 storage session重试旧操作回执后仍保留当前活动epoch；修改后的确认产生确定错误，不误报未知提交。设置页对确认后响应和状态同时丢失保持锁定，同一operationId原请求重试不会重复追加；真实Electron关闭并重启后从持久操作ID查询，默认跳过既有来源。测试host的本地UI回执仅放合成control专属profile，生产604没有启用。

本地：追加API3/3，追加Electron12场景（1366及720，含并发设置变化、响应双丢、相同请求、完整进程重启），恢复UI7/7、设置UI5/5，应用/隔离构建PASS；旧owner追加8/8及协议21/145继承前序检查点。新代码Windows CI未完成，T39/S8.b整体IN_PROGRESS。先读取本检查点Windows/Ubuntu/pr-gate实际结果，失败只修实际问题；通过且必要验收有效后进入S8.c。S8.d/S9尚未开始，Win10/11人工与便携同包NOT_RUN。不等待CI，不自动审核/合并/发布。

## 2026-10-26：S8.b typed API/UI 本地检查点（保存后继续）

基于 de74098290df17b8ce0a94d6a166d64c84c843af，原分支/PR13未改变。新增 append-session.ts 复用现有606 storage session所有者、锁与重开；六个typed方法覆盖只读来源/分页、显式依赖/去重预览、确认、取消、持久状态查询。原请求ID/epoch/确认hash绑定；响应丢失使用原请求或持久控制回执，不在退役DB写回执。统一设置新增独立追加面板；未知结果保留原确认并锁定退出，恢复与追加互斥。生产604及真实用户库未启用/未操作。

本地实际：append-protocol3 + append-owner8 + restore-protocol4 = 15/15 PASS；协议21/145方法边界/类型/导出 PASS；应用及隔离构建 PASS；追加Electron8、完整恢复Electron7 PASS；CI基础设施5 PASS。新增Windows追加UI质量步骤，Windows新代码/人工/最终同包仍NOT_RUN。T39整体暂不标PASS，S8.b IN_PROGRESS。

CI40285070838首次核实：scope/Ubuntu成功，Windows运行中，不等待/轮询。前序40282663401实际日志：editor-launcher-selftest-windows/table-mouse-drag失败，列拖y指示线5000ms超时、data-show=false；target右边935.5，line右侧935.5，最后可信dragover790/280。根因未确认，不声称修复；未改断言或超时。后续需必要Windows证据及异常UI回归，再完成T39准入；后续S8.c活动目录迁移、S8.d回收整合、S9未完成。

保存仅源码/合成测试/必要配置/非敏感摘要，不含原始日志/用户库/令牌。当前提交SHA从Git解析，不循环回填。继续开发，不因提交成功结束。

## 本次中断紧急保存（2026-10-26，停止后结束）

已按用户最新指令停止新增开发与非必要测试。本地有效源码检查点7767ddea700f409745ce2522ba33f3368fbd403d/tree6ae7ea7523c37fca6bb10565db8b4131866af634包含新增append-service.ts、shared/protocol/external-append.ts及append-service-v075.test.ts；8项实际owner专项及构建/边界已通过。中断时这些新增源码和测试尚未更新远端ref；本检查点与恢复文档一起保存，不只上传文档。保存完成以原分支实际HEAD、完整树比对和最终回执为准，不为回填自身SHA循环提交。

已实际核实CI40282663401（来源8ccc570e9f03295326ff92d2b26b52436fd2f834）：Windows Quality Job121439498895 FAILURE，失败步骤npm run ci:quality；Ubuntu Quality121439499111 SUCCESS；scope121439446216 SUCCESS；pr-gate121442259917 FAILURE。本次仅紧急保存，未读取失败日志/Artifact或定位具体原因，不认定为旧拖拽故障或随机失败。上文历史首次in_progress已被此实际失败状态取代，不能宣称Windows通过。

下一恢复步骤：先核对本地/原PR最新SHA与未提交/未推送成果，再读取上述Windows实际失败Job及相关Artifact，只做必要最小修复，不提高超时或降低门禁。然后继续S8.b typed API和统一界面的来源选择、依赖/重复预览、确认/取消/状态查询与真实Electron验收。append-service实际owner追加、四个进程退出恢复、原事实/媒体保留、响应丢失/幂等性已经验证，不重复开发。S7/S8.a DONE；S8.b IN_PROGRESS/T39整体未验收；S8.c/S8.d/S9未完成；真实Win10/11及最终便携同包NOT_RUN。生产604与真实用户库未操作。

本轮保存完成后立即结束，不等待CI、不继续开发。上传仅原创源码/typed DTO/合成测试/必要配置与非敏感摘要，原Draft PR #13→develop保留，不新分支/PR、不强推、不自动审核/合并/发布。若保存受阻须完整Git备份并独立恢复验证，不得遗漏未推送源码和测试。

## S8.b实际owner原子追加检查点（2026-10-26）

append-service.ts已实现原子独立追加：在完整目标固定快照的私有候选中用SQLite事务只INSERT重映射对象/provenance/操作回执；逐表原行分组计数证明已有事实未变（含无主键旧会话），原媒体/结构hash不变。复用既有coordinator恢复点、租约、epoch和唯一活动指针提交；活动目录不逐张发布媒体，不建立第二套指针。确认绑定目标完整digest/epoch/revision、来源与选中范围；取消/失败清理私有候选。指针后响应丢失从持久控制状态及候选回执读取；并发同确认共用结果，提交中不可取消。零可追加项不切换。生产604不启用606。

实际tests/append-service-v075.test.ts8/8 PASS：同ID碰撞的604来源独立追加、606原生历史/草稿/FSRS不重放或重算、逐表旧事实/媒体不变、默认跳过/强制新副本、并发/重开/响应丢失、取消/篡改/过期确认、SQL及缺图失败、4个真实process.exit（候选事务中/冻结/指针前prepared/指针后）。相关provenance4/map3本轮已PASS，owner7+其相关合计14项曾整体PASS；随后补原生606第8项单套PASS。npm run build、protocol boundaries PASS。未接typed API/UI，T39整体仍NOT_RUN；Windows本专项尚未取得，不虚报Windows/人工通过。

首个未完成：将追加服务接入现有已激活606 storage session的typed API，统一设置界面的来源选择/依赖及重复预览/确认/取消/状态查询，完成协议与真实Electron验收。后续S8.c目录迁移、S8.d回收整合及T38–T42，再S9；保存检查点后连续推进。

最近完整远端8ccc570e9f03295326ff92d2b26b52436fd2f834/tree489daa919debb19ef43a5dd73e1c68e8ae47a218（802文件）已独立核验；CI40282663401首次in_progress，不等待/轮询。当前提交自身SHA由Git/原分支解析。

## S8.b逐集来源版本/去重规划检查点（2026-10-26）

append-provenance.ts已实现逐deck事实/关系/媒体版本及typed provenance记录。来源身份是原deck ID+已验证事实版本，不把protocol epoch伪称永久数据库ID；来源epoch/整库snapshot另保留追溯证据。版本不受确认集合扩大、无关集/全局设置或epoch更新影响；选中集真实事实变化则更新。默认重复跳过现存目标副本；若新集依赖被跳过的副本，明确blocked，不能接到可能已编辑的目标对象；显式forceIndependent才计划完整独立复制。已永久不存在的目标副本不掩盖可导入源数据；损坏provenance拒绝。

专项4/4 PASS，含真实606原生复盘/新卡草稿和owner revision更新对其他deck版本不造成影响；npm run build、protocol boundaries PASS。当前只完成版本/记录构造/校验/去重规划，尚未在实际append事务写provenance，不代表T39 DONE。首个未完成：实际owner原子追加、恢复点、事务/媒体补偿、响应丢失与进程中断恢复，再接typed API/UI。原S8.c/S8.d/S9待续。

最近完整远端0d78f7a04333d5699bc677f50eed2edfb9cab31b/treec9480600c938e3155a2cba4a456208b0f6ebc6ba（800文件）已独立核验；CI40281733232仅首次in_progress，不等待/轮询。当前提交自身SHA从Git/原分支解析。源码、测试与恢复状态整体保存后继续。

## S8.b完整对象图转换检查点（2026-10-26）

append-map.ts已组合既有转换器，预留有序实体身份后绑定cycle/全部版本，再转换正式卡、三模式/草稿/复盘/FSRS/会话/知识/回收/媒体及旧元数据。新旧混合606图在独立SQLite实际提交、整库校验及关闭重开PASS；源库全baseline不变。旧正文真实CommonMark图片与placement按身份转换，代码/正文普通ID保留；schedule log仅改cycle/version关系，原before/after证明hash保留。旧会话所含已移动卡片新增明确选择依赖，放弃作答草稿图片缺归属明确拒绝、不静默遗漏。

专项append-map3及相关映射/选择/来源图合计36/36 PASS；npm run build、protocol boundaries PASS。仍未向实际owner追加；逐deck provenance/默认去重、事务/媒体补偿/API/UI是首个未完成任务，T39整体NOT_RUN。源码c002ecc11d5c50a46898cdef4d0fcf73ef22993d/tree1bd5d1dd0f2858c12ea384559b55f69371036d7e（798文件）已独立核验完整保存；CI40280578725首次in_progress，不等待/轮询。本检查点自身SHA由Git/原分支解析，保存后继续。

## S8.b元数据映射检查点（2026-10-26，继续开发）

已新增append-metadata.ts，复用既有身份/typed JSON转换：旧关系/策略/筛选/会话、待提交与放弃草稿、回执、归档命名空间、到期覆盖anchor、媒体元数据、统一知识回收及整集回收。原始请求proof/hash、知识归档artifact正文/checksum、评分/时间及FSRS数值保留；ID仅在已声明关系字段转换，导入会话暂停。未知筛选/回收/设置格式明确拒绝，不静默丢弃。新analysis/namespace/request/operation域操作内稳定、操作间隔离。

实际append-metadata4项、既有相关17项合计21/21 PASS，npm run build、protocol boundaries PASS。合成604所选完整旧图的受测表在新SQLite中提交，foreign_keys开启且foreign_key_check为空，validateBusinessData通过；当前仍仅转换集成验证，没有owner目标追加/去重/API/UI，T39整体NOT_RUN。S7/S8.a DONE，S8.b IN_PROGRESS，S9 NOT_STARTED。源码be2d83e CI40256988173、恢复点41961a4 CI40265875079已真实核验success。

首个未完成：将各转换器接成完整mapped graph，逐deck来源版本/provenance去重及实际owner原子追加/媒体补偿；补齐旧会话历史图片与跨集依赖边界后接typed API/UI。当前保存后继续，不因提交停止，不等待/轮询CI；生产604及真实用户库不操作。

## 紧急保存回执与下一恢复点（2026-10-26）

按用户本轮要求暂停开发，仅保存。执行环境恢复后已重新核验：原分支feature/v075-unified-learning-workspace、原Draft PR #13→develop；源码检查点be2d83e104bdd13732cc906dcf031613d0ea8373，tree5181959b5f2ffdee63d773ed0a24ea521af73751，与本地64b37e79c2a87aedbaa1eb8d80e37e42b65cdfca全部796个文件的路径、模式及blob内容一致。核验时工作区干净，没有尚未上传的源码、测试或必要配置；中断后未产生新功能源码。本次只更新保存回执和恢复记录，不能将文档提交误称为新增功能完成。

状态：S7 DONE；S8.a DONE；S8.b IN_PROGRESS；T39完整追加NOT_RUN；S8.c/S8.d及S9未完成。下一次从完整整图映射剩余项开始：旧元数据/会话/筛选/回收/归档键，逐deck来源版本与provenance默认去重，再实施原子目标追加、媒体补偿、typed API/UI及故障验证。append-legacy.ts的受支持旧表/不可变档案转换已完成，不重复实现；不得将未实施的整图转换或追加事务标DONE。后续按S8准入再推进S9，生产604和真实用户数据库未操作。

继承已通过的17项旧档案/身份/native JSON专项、相关迁移回归、构建及边界证据；本次紧急保存未重跑业务测试。CI40256988173对应上述源码检查点，上次首次观察queued；本次未等待、未轮询、未把旧状态当最新结论。Windows列拖拽旧故障根因仍未确认，真实Win10/11人工及最终便携同包NOT_RUN。

恢复时先检查git status、当前分支/HEAD和原PR最新HEAD，再读本文件、TASK.json、PLAN.md、PROGRESS.md、HANDOFF.md、TEST_REPORT.md及S8-ACCEPTANCE.json。API保存的远端commit元数据与本地不同但树一致，不reset或强推解决；保留全部有效本地提交。当前文档保存提交的自身SHA从Git/原分支解析，不为回填自身SHA循环提交。只上传经检查的源码/测试/配置/必要非敏感摘要，不包含原始CI日志、用户库、令牌或无关文件；不新分支/PR、不自动审核/合并/发布。

## 当前检查点：S8.b旧档案转换（2026-10-26）

新增append-legacy.ts：声明的旧题/记忆/资产/事件/错因/证据/排期行身份转换，以及legacy-current和legacy-event不可变档案转换。复用原canonical投影纯函数；旧current档案使用自己捕获的材料/资产，不能补今日值；source原档案与投影矛盾拒绝。保留未知/部分历史、原始评分/时间/proof与FSRS数值。完整源ID集合可预留有序映射，保留SQL同sort_order/id及faults顺序；预留冲突不部分污染映射。

实际专项append-legacy4+append-identities7+append-json6=17/17 PASS；受纯函数提取影响的原migration-recovery30+原身份6=36/36 PASS（提取后、本次有序预留完善前）；npm run build及protocol boundaries PASS。SQL集成库开启foreign_keys，提交全部受测旧表行后foreign_key_check为空，旧current/event均与真实目标SQL投影逐字段完全一致。仅内部转换验证，不是实际owner目标追加。

尚未完成：其他旧元数据/会话/筛选/回收/归档键等完整整图映射、逐deck来源版本与provenance默认去重、媒体补偿/原子追加、typed API/UI；T39仍NOT_RUN，S8.b IN_PROGRESS。S8.c/S8.d及S9尚未完成。生产604/真实用户库未触碰；原Windows拖拽根因仍未确认，不改质量门禁。

最近完整核验远端67b7f68f35588e92dfb616615b41fda6e03b8fa9/tree1ca419cd5c8b28fa45e2481ea9b4d4c5346ee983（794文件），CI40254871348仅首次in_progress。当前提交自身SHA由Git/远端解析；不为回填自身SHA再空提交。保存后连续推进，不等待/轮询CI。

## S8.b typed JSON身份转换（当前检查点）

新增AppendJsonMap：通过既有typed DTO转换native发布版本、单模式草稿/未发布草稿、知识正文/顺序/关联/策略/回收、native复盘事件/会话、排期元数据和已完成归档页。CommonMark只改实际图片，保留正文/代码字面值及卡内局部optionId，每处宽度独立；保留评分、时间、原始证明hash及FSRS数值，不重放或重算。未完成导入会话暂停；仅原frozen scheduleHash仍匹配来源当前状态时重算新身份的CAS hash，旧冲突仍保留冲突。显式cycle独立映射，legacy cycle需原既有派生规则可证明，不能猜unknown。

append-json专项6+身份回归6=12/12 PASS，应用构建/边界PASS。覆盖真实原生复盘/未完成和完成会话、后续排期改变的旧冲突、图片30/80、代码字面值、缺失媒体/草稿来源拒绝、知识/回收、原始proof哈希与数值不变。该模块仍是内部转换原语，不写目标、没有完整旧表行/legacy raw档案转换、逐deck provenance、媒体补偿/原子追加/API/UI；T39整体未验收。下一步完成这些剩余项，不把native JSON转换当完整追加。

最近已核验edc5392e0fce1b1186688d9b7d651bf7e388d11d/tree4e2d1732eb48093baade3bd075c961fdee825b02（792文件），CI40253641685仅首次in_progress。S7/S8.a DONE（真实Windows证据已存），S8.b IN_PROGRESS，S9 NOT_STARTED；生产604及真实用户库未触碰。

## S8.b来源对象图收集（当前检查点）

新增append-graph.ts及6项专项、应用构建/边界PASS。它仅在固定scan的已明确确认闭包上收集所选集的原始表行/typed-JSON封套/媒体引用：历史证据、旧档案专属图片、作答/未绑定图片、三模式全部版本、现有与新卡草稿、知识/关联/策略/回收/会话/排期。保留复盘JSON及FSRS原字节，不重放事件/不重算。所选集范围graphDigest不受无关全局设置影响；不复制未选集图片、全局偏好/凭据/IPC操作状态；未知表或未知学习元数据前缀明确拒绝，不静默丢弃。源/候选完整指纹保持不变。

此步仅内部数据收集；没有向目标写入，没有完整JSON重映射、逐deck provenance去重、媒体补偿/原子追加及UI。下一步实现typed JSON与表字段的身份转换，并保留旧版本派生/历史原始证据/草稿来源/当前FSRS CAS语义，再做完整目标事务和故障验证。T39整体仍未验收。最近已核验远端6d7af6d23d05d2d17cddfa3b087f06353f4a9ced/tree41c0a9005e89c27a6ec865dde8409f1200bfaed1（790文件），CI40252266384首次in_progress不等待。

# GankSoft v0.7.5 交接

唯一仓库Aides8Stack/GankSoft、分支feature/v075-unified-learning-workspace、原Draft PR13→develop。继续现有工作区，不clone/init/reset/新分支/新PR，不强推、自动trusted审批/合并/发布。生产schema604不自动启用606，代码只通过已有隔离合成606 control验证，不操作真实用户库。AGENTS.md、STANDARDS.md及原工作包仍适用。

当前S7 DONE，S8.a DONE（0fd8f65/CI40249113081、Windows7场景和实看2图，见S8-RESTORE-VALIDATION.json），S8.b IN_PROGRESS，S9 NOT_STARTED。下一入口见RECOVERY-NEXT.md：已完成scan/身份绑定/依赖规划；尚无完整目标追加。依赖规划6项覆盖真实复盘完成→移动→归档页的跨集约束，不能静默丢历史或自动导入未选集。

源码检查点d59cfe23105e2e4a97e73564f4696b5cbf664a4a/tree81d840d2a39940a4d4f271093d802aeda9bf5c40与本地23092fe等树，788文件完全一致，CI40251179477首次运行中。当前新增append-selection.ts/专项6已构建/边界验证并待整体保存。Git API保存以实际最新远端tree/parent为基、expected_sha和force=false；上传前仅审本次diff敏感信息，逐项确认源码/测试/配置/必要摘要，独立fetch对全部路径/模式/blob和内容比对。当前提交自身SHA由Git/PR解析，禁止为回填自身SHA无限提交。

完整恢复成功后旧owner退休，不能继续用旧DB写成功回执；必须关旧连接再按同control重开/重建host。RESTORE_COMMITTED是已提交而非回滚，控制目录status可核对原操作，不自动重复覆盖。活动指针唯一；旧数据目录保留拒写；新目录失联/损坏不能退回旧库。外库追加独立新deck及全面身份映射，不跨库拼历史或重算FSRS。强制重复追加用新operationId。Windows人工及最终同包NOT_RUN，旧列拖拽根因仍开放，详见TEST_REPORT.md。

每个独立功能及时保存源码与测试，不等待/轮询CI，保存后继续授权阶段。额度/连接不足立即停新增并保存；正常上传仍被拒绝时保留全部WIP+Git历史完整备份并独立恢复验证。旧恢复ZIP早于本轮源代码，不可声称包含新成果。历史详细交接在Git既有提交，阶段JSON验收文件未删。
