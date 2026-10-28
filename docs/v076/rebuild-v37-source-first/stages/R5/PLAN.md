# 当前Work：R5.c → R5.d（2026-10-28）

基线0b0fa99789833d695c4708d0fb168832d98cda1c，原分支/PR15 Draft→develop。R5.a/b有效证据继承，不进入R6。原media.stage/draftImage、Crepe插图及媒体文件服务复用；media.remove已退役，缺统一引用查询/安全退役接口。

新增media.library list/impact/delete typedAPI：扫描当前/所有发布版本（含非当前模式、回收卡）、草稿、新卡草稿、知识正文（含回收）、学习历史、其他保留settings与旧快照。保守保留未知引用，不能把没有显示的引用当未引用。完整影响哈希/修订执行前重查；任何不可变引用直接拒绝。只允许知识正文/卡片草稿的AST图片引用清除，复用saveNode/saveWorkspaceDraft与现有CAS/协议原子事务/原requestId回执。删除元数据与持久退役标记同事务，物理文件仅在回执提交后清理；文件清理失败保留字节并在后续操作重试，清理前重查引用与文件别名，不造成悬空引用。恢复字节不使用SQL回滚幻想。

卡片图片小模块复用原生NodeSelection定位及已有insertImage；知识正文使用同一模块。卡片集独立MediaLibrary提供分页搜索/预览/引用/二次确认与未知原请求冻结。已发布/历史禁止删除并解释。允许同集question/knowledge资源共享，继续拒绝跨集。

在tests/fixtures/ganksoft最小生成器上增量生成少量共享/孤立/发布/草稿/跨集图片，固定命令自动缺失缓存重建，不上传库或租约。先服务负例/混合回滚/并发/持久化，再正式Electron卡片与集级UI→IPC→606及正常新进程。c必要Gate通过即连接器保存核验，然后直接d全协作/受影响三宽/原型对照，全部必要项通过才R5 DONE。原始失败保留；无关门禁不重跑，不等CI/合并/发布。

---

# 2026-10-28 R5.b — DONE（B1/B2/B3/B4全部DONE）

B3已通过GitHub连接器保存为 3a65527e35ae313802aa6c4cef1577585c254817；完整tree 278a170b67a7a921140b04785c4d90904da08fc2与本地逐项树一致，8关键文件blob独立读回一致，原分支/PR15 Draft→develop保持。按最新用户授权保存后连续B4，没有提前退出。

B3正式Electron10组、服务28/28、协议21项及边界/类型/148方法导出PASS；B4最终正式Electron7组、生产build及受影响三宽6图/6DOM PASS。B4验证真实Crepe编辑→保存→文件导出/导入，精确多根/9层/顺序/正文/图片hash-width-title；部分深树挂载、keep零正文修改、取消零写、正常退出后不同PID逐项读回。发布表、非空学习历史、调度、卡片关联、无关节点与旧图片字节不变。B3错误/并发/事务回滚/未知回执证据按影响继承，未重跑未受影响B1/B2/R5.a。

B4只修明确UI结构问题：全局小弹窗max-width480px覆盖交换弹窗；新增专用宽度覆盖，900/1366/1500均可正常显示。旧截图保留为修复前证据；最终final-*六图真实Noto Sans CJK字体、边界/横向溢出断言并逐张人工审阅PASS。integration-attempt0误计原生占位图片，已改用B2既有img[data-gank-placement]身份选择器并保留失败；attempt1功能7组PASS但视觉审阅FAIL限宽；integration-final7组与修复后6图PASS。原始失败和断言保留。

长期入口：tests/fixtures/ganksoft/README.md。固定npm run test:knowledge-exchange（28项），npm run validate:knowledge-exchange（B3），npm run validate:knowledge-markdown（build+B3+B4）。版本定义/生成/校验/实际API ID已集中；缓存缺失/已消费自动新隔离库，不上传SQLite/租约或重建242卡。

下一Work仅在用户授权后进入R5.c图片资源管理：先核实最新HEAD，读R5/PLAN.md的c范围、CAPABILITIES.md与现有knowledge-unified/media及卡片媒体API；继承B1–B4，不重新开发编辑器或知识交换。R5整体IN_PROGRESS，R5.a/b DONE，c/d/R6 NOT_STARTED。Windows/IME/物理剪贴板/全应用严格视觉仍R7/R8 NOT_RUN，不以Linux局部视觉代替。最终连接器保存并独立核验后主动结束，不等CI、不合并/发布。当前文档自身SHA由Git历史和远端读回解析。

---

# 当前 Work：B3 知识交换（2026-10-28）

起始远端 dfee4c7ae2fe3df14adb88fe10de597326b366c7，原分支/PR15。按最新用户授权本轮连续B3+B4，B1/B2/R5.a有效证据继承，c/d/R6不进入。

1. 复用既有Markdown状态机/事务/媒体/typed API：浅树仍v1，深树使用明确v2深度标记（标准Markdown显示标题最多六级，真实知识层级独立无损保存）；解析校验父级/深度/路径/正文封套。不得改真实树来凑六级。
2. 扩展现有diff DTO：单独有界待导入正文、策略、逐图片引用摘要（不向renderer回传Base64）；默认keep仍展示incoming，结果正文沿既有after。补UI范围/路径搜索/全选清空/冲突和图片/分页说明；未知回执锁住导航，复用原requestId。
3. 整合tests/fixtures/ganksoft最小606可再生定义/脚本/版本及校验，复用B2生成工具，不上传SQLite/租约/真实数据。固定B3测试命令自动检查缓存，缺失或上次已改动则在新隔离目录生成，不删活动租约。
4. 服务专项与正式Electron UI→IPC→606覆盖完整/局部/深树、挂载路径、正文策略、取消、混合回滚、未知原请求及实际新进程精确读回；仅受影响UI补验。记录真实失败。完成B3才DONE，连接器完整base tree/parent/expected_sha/force=false保存及独立核验后直接B4；集成验证编辑→导出→导入、图谱/大纲同步、受影响三宽、错误安全/新进程。R5.b必要门槛全过才DONE并最终保存结束。

---

# 2026-10-28 R5.b B2 — DONE（B2.2/B2.3均DONE）

本Work起始远端06ebccc3c59e78d6425dc4fe6eefa0bc4f12b8c4、原分支/PR15 Draft已核验。按最新用户授权连续完成B2，不因小检查点退出。B2.1既有成果继承；B2.2正式Electron两组、B2.3最终八组及最终生产build PASS。完整证据`stages/R5/evidence/b2-final/`、B2-ACCEPTANCE.md；命令和可再生小型夹具见B2-VALIDATION.md。B1 26、B2.1正式7/编辑器7/三宽、既有真实Vue生命周期2和R5.a未受影响证据继承，没有重跑无关全量。

旧/tmp缓存确实缺失后，按用户明确授权复用prepareFreshUnified/现有API生成3知识点、1发布卡、1真实学习事件与小图片。b2-fixture.ts保存实际ID/参数，检查Schema606/integrity/cache；缓存缺失可再次生成，不依赖跨Work/tmp，不重建242卡。失败回归仅重置已确认合成节点正文；有效写租约不删除，显式旧租约恢复走已有coordinator的存活校验。

实际产品修复：KnowledgeMarkdownPanel未知回执核对复用原请求和SaveController同一代，不再手动改revision后重复提交；真实CAS冲突保留双方正文，新增明确放弃草稿/重新读取及取消保护；Electron释放协议/数据库服务由before-quit移至will-quit，允许beforeunload完成最后保存。复用Crepe/原生undo-redo/既有保存控制器和CAS，未改Schema606/FSRS/协议/历史/正常布局。

最终验收：快速并发节点切换、图谱大纲切换、原生格式/图片宽度undo-redo、全程最多1可写实例；明确失败保留并重试、未知请求冻结且同requestId只提交1个revision、关闭详情/离页/通过既有返回卡片入口切集保存；正常退出后新Electron进程，在任何清理前精确核对nodeId/完整Markdown/revision/层级/关联。其他节点、发布版本、非空历史、调度及图片字节完全不变。测试故障仅独立验证bootstrap包裹公开IPC注册，生产main/preload/服务/SQLite仍真实；没有往生产添加故障入口。

失败记录未删：夹具污染/占位img选择器/隐藏全屏导航等测试归因，与未知核对重复写、提前关库、CAS缺恢复入口等真实问题分别保留。早期退出等待中断exit130也保留；最终八组正常退出，不用强制销毁冒充成功。新CAS确认截图因当前Linux缺CJK字体仅作诊断，不宣称视觉PASS；B2.1三宽有效视觉继承，Windows/物理剪贴板/IME/全应用严格视觉仍R7/R8 NOT_RUN，不作本B2无关阻塞。

R5.b整体仍IN_PROGRESS：B1/B2 DONE，B3/B4 NOT_STARTED；R5.a DONE，c/d/R6不进入。下一Work先核实新HEAD，读R5 PLAN/B2-ACCEPTANCE/B1能力表，再按用户新范围进入B3；七级导出限制仍归B3。本Work到B2即止，连接器保存实际HEAD/base tree/parent、force=false/expected SHA，独立读回完整树/源码/测试/恢复文件后主动结束。不等CI、不合并/发布。当前提交自身SHA从Git历史与远端读回解析。

---

# 当前Work：连续完成B2.2与B2.3（2026-10-28）

基线06ebccc3c59e78d6425dc4fe6eefa0bc4f12b8c4。用户明确授权确认旧缓存失效后重建小型606夹具，复用原工具/真实API/实际ID，禁止重建242卡。生成器每次验证缓存存在及schema，丢失则重新生成；代码/参数入GitHub，不依赖跨Work的/tmp。继承原B1/B2.1/R5.a及已通过销毁期只读/最小启动，不重复环境调查。

先跑正式Electron B2.2：快速并发节点/图谱大纲切换、原生格式/图片undo/redo、节点身份和唯一可写实例；只对实际失败最小修复。通过后直接B2.3：明确失败/真实CAS并发/响应丢失后原requestId核对，关闭详情/离页/切集/退出及新Electron精确读回，核验其他节点/发布版本/关联/非空历史不变。测试故障仅独立bootstrap包裹公开IPC注册，实际服务和SQLite不替换；请求记录入证据，区分故障注入与系统故障。

每稳定检查点可连接器保存，但本Work不因此结束；B2.2/B2.3通过后B2才DONE，再最终保存读回并主动结束。不进入B3/c/d/R6，不等CI/合并/发布。仅不可继续的真实环境或额度风险提前保存WIP。

---

# 2026-10-28 B2.2 最小启动恢复 — 已完成安全检查点，B2.2仍BLOCKED

起始远端edeb335fbe7c76a6ee155221fed8bc58f7096547，原分支/PR15 Draft已核实。两次有界最小Electron44.9.1窗口均启动并正常exit0；与B2.1相同运行时、headless/no-sandbox参数，无依赖重装/参数绕过。启动前后无Electron残留，TCP监听集合不增；历史SIGTRAP未复现，不能猜定其根因。当前本地元数据保留，但原`/tmp/gank-b2-lifecycle-GNPISt/synthetic606-control606`及真实数据库/active指针已不存在，不是活动租约阻塞；没有删除租约/清理库/自动重建夹具。

首个预检在启动前遇到ENOENT（preflight.txt），修正诊断器按缺失记录而非崩溃后才开始两次实际启动。第一次最小窗口内两个一次性测试门均返回，无死锁：销毁等待期间原生编辑器仍可写被真实复现；另一个WIP测试使用生产接口没有的AbortSignal，属于不适用合同，不能据此修改产品或声称竞态。保留原失败，改用真实Vue MarkdownEditor初始化中卸载/替代节点挂载验证，检查旧实例只读、新实例唯一可写、正文独立及零陈旧变更。

唯一生产修改：`milkdown-adapter.destroy()`在异步Crepe销毁前调用公开`crepe.setReadonly(true)`同步撤销可写。第二次同运行时窗口内真实Vue生命周期及原生销毁两项PASS（加最小启动共3项）；旧可写0、新可写1、陈旧通知0。生产build（vue-tsc/tsc/Vite）PASS，未改SaveController、CAS/revision/requestId、B2.1快速快照、布局、原生历史/图片服务或Schema606。证据`stages/R5/evidence/b2-2-recovery/verification.json`、minimal前后JSON和构建输出；旧失败不覆盖。

B2.2完整正式UI→IPC/快速切节点/格式与图片历史专项仍NOT_RUN，因原三节点合成库丢失保持BLOCKED；启动环境阻塞本身已解除。B2.3/B3/c/d/R6未进入。继承B1 26、B2.1正式7/编辑器7/三宽与未受影响R5.a，不重新运行；没有布局变化，不重拍截图。

下一Work：先核实HEAD，读B2-ACCEPTANCE和b2-2-recovery/verification.json，**先从现有持久缓存/备份恢复原三节点606库**（metadata在validation-results/r5-b2-2/fixture.json），不要直接运行旧runner让缺失数据冒充通过。若找不到原库，明确记录缺失、按下一Work范围决定最小合成数据恢复；不得重建242卡完整夹具或删有效租约。原库恢复后用`b2-startup-recovery.ts application`验证正式启动（缺库/有租约会显式停止），再运行b2-lifecycle.ts正式B2.2专项；不重复已通过生命周期门或三宽，除非变更影响。WindowsGUI仍NOT_RUN，不把最小空窗口当正式数据库验收。

本安全检查点仅通过GitHub连接器真实HEAD/base tree/parent、force=false、expected SHA保存，独立核验源码/证据/恢复文件后主动结束。不等待CI、不合并/发布。当前完整SHA由Git历史和独立读回解析。

---

# 当前Work：B2.2优先，保存后再评估B2.3（2026-10-28）

起始远端28cc2ad4f0a92401b410907ff51a5755f2437db8，原分支/PR15 Draft。B1/B2.1及未受影响R5.a证据继承，不改文档大纲布局。

B2.2检查：Crepe公开setReadonly/create/destroy与AbortSignal生命周期；异步初始化/销毁时至多一个可写实例，旧回调不能污染新节点；快速节点/图谱大纲切换保存原节点或明确阻止；原生撤销重做/格式历史不跨节点，已有图片placement和资源保持。先用可控初始化/销毁Promise构造适配层复现，再正式Electron真实606/IPC验证快速切换及原生历史；保留B2.1快速快照保护。必要修复仅适配层，不自建历史栈、不更换框架/协议/Schema。无布局变化不重拍三宽。

B2.2通过后立即连接器保存（真实base tree/parent/expected SHA/force=false）并独立核验；再按环境/额度评估B2.3。B2.3仅保存失败/冲突/未知回执、关闭详情/离页/切集、退出并新Electron精确读取nodeId/正文/revision/层级，保护其他节点/卡片关联/历史。缺证据保留IN_PROGRESS/NOT_RUN，不以同进程数据库重开代替新进程。不进入B3/R5.c/d/R6；七级导出仍归B3。

---

# 当前 Work：R5.b B2（2026-10-28）

基线 `2bfd6246b90cc84cd81393c9b0358fec2c368995`。按用户本轮范围优先执行 B2.1 → B2.2 → B2.3；每个稳定检查点立即通过连接器保存，完成当前安全检查点后主动结束。旧“本Work仅B1”段落为历史。

- B2.1：复用 Mind Elixir 的同一真实树视图，迁移冻结原型261–288、365–384行和 knowledgeOutlineNav/treeOutline 的文档分组、分级目录与定位。当前节点仅一个活动 KnowledgeMarkdownPanel；其他正文按需只读展开，使用已有 MarkdownContent/Crepe，不另写转换器。正式Electron合成多根/七层数据、目录折叠/定位、只读零写和900/1366/1500视觉补证。
- B2.2：核实并补强单一可写实例、节点/视图切换与正文同步；复用 SaveController/revision/requestId/CAS；验证原生标题/列表/表格/公式/撤销重做/既有图片路径，不重跑无影响B1交换测试。
- B2.3：保存失败/重试、未知结果冻结、详情关闭/离页/Electron退出与新进程/数据库重开持久化。未运行保持NOT_RUN，不能以B2.1几何或只读证据替代。

不进入B3/R5.c/d/R6；不修第七级导出限制、不改Schema606/FSRS/学习历史/锁文件；Windows真机验收仍由R7/R8负责。

---

# R5 分阶段计划（2026-10-28，原生框架优先）

恢复基线：2dffad3434105f04e7439527751a93edb22bbe8c；原分支 feature/v075-unified-learning-workspace，Draft PR #15 → develop。GitHub connector 已确认 pull/push/admin 权限。R0/R2/R3/R4 DONE，R1保留全局遗留；R5.a已于0eaedd4c4c260d8d008ff3d1f1372ef54be1fc10完成；本Work仅R5.b B1。不得重复初始化、重做已验功能或进入R6。版本0.7.6-rc.1、Schema606、FSRS、历史、三种卡片模式、草稿/发布机制保持原合同。

## 实施原则

先核对锁定依赖、官方资料和本地公开类型/实现。NATIVE → CONFIG → 最小 ADAPTER → 有证据的 GAP；禁止未验证私有API、修改依赖、重复工具栏或状态系统、替换框架。Mind Elixir负责布局/连线/折叠/画布/适用节点操作；Crepe负责Markdown、表格、公式、图片等原生编辑；Vue/现有协议负责业务状态和事务。

## R5.a 知识图谱（DONE，继承C1–C4，不重复开发）

1. 自动布局：节点坐标、分支间距、连线由Mind Elixir自动计算；新增/删除/重命名/折叠/层级变化后原生布局。不允许自由拖动节点定位、自由排列、用户间距/坐标保存或自制布局引擎。早先自由画布方案作废。
2. 明确的父子/同级顺序操作改变真实树；平移/缩放仅改变视口，不写树。多根森林复用knowledgeView展示容器gank-root，它不是知识数据，不得提交到606；保留真实parentId=null。优先原生方向与theme间距配置，不强制左右对称。
3. 按冻结v3.7 knowledgeScreen/knowledgeSide及toolbar最终CSS迁移：充分使用内容工作区、保留现有导航；连续工具栏，搜索定位、选择、展开/收起、增子/同级/根、重命名、结构调整、删除和恢复入口；右侧详情、真实路径/摘要、Markdown正文入口、卡片关联。解决节点/工具栏/侧栏遮挡与异常缩放。
4. 核实版本实际支持的自动布局、方向、折叠、缩放平移、选中定位、新增删除、结构变更、事件、加载刷新。复用事务/CAS/幂等回执/保存失败保护，不能把框架临时状态当持久化成功。
5. 验收：真实Schema606合成多根多层树；900/1366/1500宽正式Electron（真实IPC/SQLite）截图+DOM/computed CSS+冻结原型对照；新增自动布局、折叠展开后节点连线可见、不能自由定位、明确层级修改真实保存、平移缩放树hash不变、编辑保存退出及新Electron进程重启读回、无越界/遮挡/不可操作区。记录合理视觉差异；不能单图或静态截图冒充可用功能。

检查点：C1 能力核对与计划 → C2 正式UI/工具栏与结构适配 → C3 交互/重启/三宽及必要回归。每个稳定检查点立即提交推送、独立读回SHA/tree/文件与证据；不等待整个R5.a结束才保存。容量/连接/环境故障立即停新增，保存真实WIP、精确恢复入口；推送不可用时保存完整Git备份。不强推/新分支/新PR/审批/合并/发布/等CI。

## R5.b Markdown与知识点交换（IN_PROGRESS，本Work仅B1）

复用Crepe及现有知识服务；知识Markdown编辑、层级大纲和正文同步；整体/局部树导入导出；新根或挂接指定节点；完整路径识别冲突；导入前预览；保留/替换/追加，默认保护已有正文；导入失败回滚、重启持久化。逐项UI→IPC→606、取消无写、冲突/失败/重启验收。不重写编辑器或已有Markdown基础功能，本Work核实B1能力与数据边界，B2–B4按后续检查点执行。

## R5.c 图片资源管理（NOT_STARTED，后续Work）

两级独立模块，经API联系卡片与知识点，复用现有媒体存储/解码/编辑器图片/IPC，不重建存储或替换Crepe。

- 卡片级：现有编辑器简洁入口、缩略图、放大预览、定位正文引用、重新插入、查询引用关系、安全删除。
- 卡片集级：集内图片列表、搜索预览、跨卡片/知识点引用查询及引用数量、识别未引用资源、清理无用图片、删除前预览所有受影响内容。
- 安全验收：被引用图片禁止直接删除；删除引用与资源明确确认；不误删其他使用内容；失败回滚；无悬空引用；保护已发布版本和历史。现有退役删除端点不能冒充引用感知删除API。

## R5.d 整体验收（NOT_STARTED，仅a–c完成后）

完整图谱、Markdown编辑/导入/导出、图片管理及安全删除；真实UI→IPC→606；失败回滚/重启；三宽同状态对照；模块回归/性能。未执行NOT_RUN，真实阻断BLOCKED，不虚报PASS。

## 保留规则和交付

单选批量输入一行一项、用户手选唯一答案、替换清旧答案、无复杂自动解析/多选恢复。各模块低耦合、卡片集中心、真实数据/合法空态；不制作虚假入口/演示统计。R7/R8继续负责Windows10/11、物理图片剪贴板、中文IME、全应用严格视觉与便携ZIP；Linux证据不冒充Windows。禁止上传真实库/凭据/密钥。

同步本目录PLAN/PROGRESS/TEST_REPORT/ACCEPTANCE、阶段tracker、RECOVERY-NEXT、TASK、STATUS和必要交接。当前Work完成R5.b B1安全检查点后保存核验主动结束，不进入c/d/R6。

## C4 历史最小收尾（2026-10-28，已完成）

基线9810ed8189bd4be712273e2b25b9cba8ffe586a1，PR15 Draft已复核。仅公开theme.palette/cssVar与容器CSS对齐原型绿色节点/原生selected类；处理原生刷新后业务选择恢复；右侧Crepe布局/可见现有格式栏，保留原生编辑功能；图谱关联意图通过明确Vue事件交Unified已有筛选页/StudyFilters/queue API，不扩协议或后端。保留真实修改节点、父子、正文和卡片关联，关闭后新Electron精确读回。继承21领域/11交互/9几何证据，只补受影响专项和三宽截图；最终必要Gate过后R5.a才DONE。b/c/d不开发；连接器非强推提交并独立核验后结束。


## R5.b B1–B4 执行计划（2026-10-28）

基线0eaedd4c4c260d8d008ff3d1f1372ef54be1fc10，远端HEAD/原分支/PR15 Draft已核验。仅R5.b；R5.a及R0–R4未受影响证据继承。每完成稳定检查点连接器保存、独立读回后主动结束，不进入c/d/R6。

- B1 能力核对与数据边界：读现有Crepe公开配置、知识正文/Markdown/媒体服务及冻结原型对应片段；建立NATIVE/CONFIG/ADAPTER/GAP表，逐项区分已实现与尚待正式UI验收。补完整路径/挂载隔离、预览取消无写、混合正文/节点/图片事务失败回滚边界测试；只跑相关Markdown测试，不改Schema606、不重建夹具或编辑器。
- B2 Markdown大纲与正文：图谱/目录共享真实节点身份和层级；选择正确正文、仅修改当前节点；切换节点/视图/关闭窗口走保存保护；保留Crepe原生撤销重做；失败草稿保留及重试。按v3.7文档式大纲和分级目录补必要适配，禁止仿制原型的contenteditable编辑器。正式Electron验证读取、编辑、保存、重新打开和新进程持久化；本B1检查点不实施B2。
- B3 知识交换：完整树/部分子树导出，必要祖先标题与正文选项明确；新根/挂到指定节点导入；预览层级、正文、图片引用、完整路径冲突及新增/更新/保留范围；保留/替换/追加，默认保护原正文；取消零写入；失败回滚节点/正文/图片文件，保护原关联和版本。复用既有token/分页/差异/确认/幂等API，仅补真实缺口。不增加R5.c图片管理。
- B4 验收：真实Schema606合成数据、正式Electron UI→IPC→数据库，整树/局部/两种挂载、冲突预览/取消/确认、失败回滚和图片引用完整性、编辑与导入的新进程持久化；受影响界面必要视觉补验。未运行NOT_RUN，实际环境阻断BLOCKED。B1服务测试不能代替B2–B4正式UI验收。

B1交付：B1-CAPABILITIES.md、增量边界测试、实际命令输出与指纹、进度/验收/tracker/恢复记录。B2–B4尚未执行时R5.b保持IN_PROGRESS。
