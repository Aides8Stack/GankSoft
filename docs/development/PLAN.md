# S5.b 本地完成，准备连续进入 S6（2026-10-24）

S4自动化DONE：1bd1c6d57b49dc3d44e026be980beca406c71db5 / Run40091194554四Job success。S5.a原创源码和合成测试已保存a630f3348f13c1672be5d4feb54133936259f5b2（tree7b476f1b255e8649f31c9f047e755f27c6781682），CI40091904743 success；当前S5.b合并/回收/UI新改动需要自身CI，不能继承S5.a为其通过。

新增S5.b：同deck节点合并独立预览/确认，默认保留目标正文，可替换/追加；子树迁移、关联去重、过期预览拒绝、回执失败整体回滚，原始attempt_faults和ReviewEvent不改。整棵子树软删，恢复预览处理重名、缺父、显式新挂载/重命名，原身份/正文/关联/顺序保留；合并来源恢复只恢复来源节点，已迁移的子节点/关联留在目标，界面明确说明。

现有MindMapWorkspace增加606 opt-in typed adapter，保留MindElixir原生拖拽/undo-redo及空白pan；持久化同级顺序，虚拟根不入库；新增根/同级、上移/下移、展开/收起与详情Markdown复用Crepe。结构与正文分别CAS；过期稿保留；未知提交使用稳定请求，锁编辑/关闭并核对；保存成功但刷新失败独立恢复。原App604继续旧入口。没有替换图谱/编辑器依赖。

本地PASS：知识专项11/11、保存控制器7/7（含新增相同快照不自动清除失败状态）、完整业务340/340、协议21与边界/类型/111方法、应用和隔离构建、真实Electron图谱7场景（errors/external=[]）、旧完整编辑器18、Linux ASAR13组107项和infra5。UI曾真实发现失败按钮状态跳变、全屏头部隐藏合并入口、select缺少稳定可访问名称，已最小修正并保持全部断言；可选headless截图超时BLOCKED，未冒充视觉/真实Win验收。测试退出销毁仅用于合成进程清理，关闭保护另有真实UI方法断言。

S5本地T23–T27通过，整体IN_PROGRESS等待新SHA的Windows/Linux/新增图谱7场景CI。新图谱smoke已最小加入现有Windows quality编排，原测试不改不降门禁。知识正文图片仍显式拒绝，交给S6统一媒体闭包；根拖整图按原包暂缓。Win10/11真实IME/物理操作/最终便携同包仍NOT_RUN，生产604不自动激活606。

下一步不等待CI：按原S6-MARKDOWN-KNOWLEDGE-EXCHANGE，先严格状态化解析/序列化和标记转义/代码块/外部MD消歧，再导入导出预览事务、Base64图片/独立宽度和大纲。S6→S7→S8→S9继续，推送仅检查点，不结束任务，不再逐阶段确认；不审批trust/合并/发布，不访问真实库。自身提交由git/PR head解析，前序远端a630f334。

---

# S4 DONE；S5.a 数据基础已验证（2026-10-24）

S4精确1bd1c6d57b49dc3d44e026be980beca406c71db5、CI40091194554四Job全success，Windows原始日志证实328业务/98方法/统一复盘UI6且errors/external=[]。本地182流水线已PASS，初次离线缓存缺包已填充锁定tarball后原命令通过，未改测试/门禁。T16–T22/T27自动化开发验收DONE，详见S4-ACCEPTANCE.json；不是Win10/11人工或正式启用批准。

S5 IN_PROGRESS，先保存S5.a：树元数据与正文按需分离、持久化同级顺序、完整树摘要CAS、多根/默认名、循环/跨集/重名/虚拟根拒绝、节点正文revision与失败回滚、原生卡真实关联adapter。发布/Prompt/列表/掌握度/队列统一读取该adapter；不创建fake question/memory，不重写历史快照。606已冻结DDL保持；现有knowledge持有身份/父级/版本，settings用严格显式封套补正文和顺序及原生关系，备份/恢复完整性同步检查。legacy卡关系仍复用原表，原生卡只用专属封套；旧图谱破坏性编辑入口在新所有者出现后拒绝。

本地S5.a专项7/7、完整业务335/335、协议21/边界/类型/105方法、应用构建PASS。测试备份参数与返回值最初误用（含SIGSEGV负例）已修正为实际三参数调用和显式目标路径，恢复/重开/拒绝旧正文覆盖断言均保留；关联封套多传expectedRevision已修正为显式字段投影。新能力尚未做Windows/图谱UI验收，不能把S4 CI当作S5通过。

下一步继续S5.b：节点合并独立preview/confirm（默认保留正文）、子树软删/冲突恢复、历史快照永久不改，真实MindElixir拖拽/平移/undo-redo和Markdown编辑接线。知识正文图片暂显式拒绝，资源与MD往返按原S6实施，不允许先保存未跟踪引用。S5完整T23–T27后再进入S6→S9。推送只是检查点，任务继续，不逐阶段确认；不审批trust/合并/发布、不访问真实用户库。

当前分支和Draft PR13不变，自身SHA从git历史/PR head读取；上一远端为1bd1c6d5。当前源码/文档/合成记录逐项检查后保存；原始日志、数据库、私人文件和无关归档不上传。

---

# S5 当前独立实施（2026-10-24）

S4 队列检查点远端1bd1c6d57b49dc3d44e026be980beca406c71db5已读回；新CI首次尚未列出，不等待，S4整体仍IN_PROGRESS。S5先分块做知识树/节点正文/卡片关联，再做合并、回收恢复、现有MindElixir接线与UI验收，不把未实现项标完成。

复用原knowledge身份/父关系/版本及settings严格显式封套，持久化sibling order与单节点Markdown，不改已冻结606不可变DDL，不创建平行知识树或伪legacy卡。树视图只传元数据，正文按需读取；每个写命令校验完整树摘要/节点revision，并与回执同事务。原生卡关联采用单一存储adapter（原生专属关系封套，legacy卡仍复用原关联表），供发布/Prompt/当前掌握度/队列统一读取。历史ReviewEvent永久不改。后续节点合并预览绑定完整作用域，子树删除和冲突恢复原子处理。生产604保持旧入口，新能力仅606合成隔离验证。

---

# S4 本地验收与队列检查点（2026-10-24）

原PR13、原feature/v075-unified-learning-workspace。S4前序源码已远程保存5578f141df1f28e0bd2178e0fb03c5301e5bf67b（tree fa3ac7f02cb49802b403a5c198444cc4affe2b3b），CI40090576841 scope/Windows/Linux/pr-gate全部completed/success。本地8304af7与该远程tree一致，c531633仅保留等价本地历史，未合并PR。

本检查点进一步补齐统一队列：复用StudyFilters、日预算、知识随机抽样和selectCandidates；三模式、当前周期证据、现行FSRS due、多页占用、日期/知识/所选卡筛选、专项和同日重学预算。旧604入口保留；只输出轻量元数据，不夹带正文/图片/全部历史。原生知识关联接口将随S5完成，目前沿用真实legacy关联，绝不伪造旧题载体。现有Windows quality.mjs增加真实复盘六场景，原全部检查保留。

本地PASS：S4专项17/17、完整业务328/328、协议21/边界/类型/98方法、应用构建、隔离构建、旧编辑器18、统一复盘Electron6（errors/external=[]）、Linux ASAR13组107项（含系统交换备份5）。最初两项新增测试失败分别是夹具多传字段和当日legacy真实预算未排除，已通过调整夹具输入与独立测试日期修复，未删除历史或放宽断言。队列类型推导编译错误已显式字段投影修复。

本地test:pipeline初次182项中179通过/3失败：离线冷安装缺缓存zwitch包导致随后yaml不可解析，正在填充锁定依赖缓存后原命令复验；没有改测试或门禁。本检查点新队列与Windows复盘步骤仍需自身CI核验，S4整体IN_PROGRESS，核心5578的绿灯不能冒充新检查点。Win10/11人工IME/物理交互/最终便携同包仍NOT_RUN，生产604不启用606。

下一步：核对缓存补齐后的流水线结果，保存本次S4；不等待CI，实施S5中独立知识树/顺序/Markdown/合并与原生卡关联模块。新CI成功后归档S4 T16–T22/T27。按原Work-Handoff连续S5→S9，推送不结束任务；不新分支/PR、不自动trust/合并/发布、不访问真实库。当前自身SHA由git历史解析，禁止文档回执循环。

---

# 恢复检查点：S4 实施中（2026-10-24）

恢复原 PR #13 / feature/v075-unified-learning-workspace。上次额度中断前的 S4 工作树仍完整，本检查点先保存既有实现，不能当成 S4 完成。S3/T09–T15 自动化已在精确 7e7ab75787b2c309d3672de018d5ae2161670377、CI39914725269 四 Job success 归档；本次再次读回确认。旧 AUDIT.md 属于早期基础设施任务，仅作历史，不是当前业务审计。

S4 已实现：三模式整数评分、冻结版本/周期/选项/知识路径的会话、幂等事件及同事务回执/FSRS、旧版本或排期冲突归档、暂停计时和恢复、分页历史、当前周期掌握度、知识 cardId 去重、单卡政策和主动重算预览/确认/撤销；真实隔离 Electron 复盘界面六场景通过，错误和外部请求均为零。生产仍604，606仅合成隔离，不访问真实用户库。

有效验证边界：上次专项13/13、业务324/324、协议21和97方法、隔离界面6场景 PASS；本次已重跑应用类型/构建 PASS。本次当前工作树完整业务回归324/324 PASS（0失败/跳过），旧编辑器/系统/ASAR回归尚未重跑，Windows 尚无 S4 结果。不能继承 S3 CI 为 S4 PASS。

接续操作：完成当前业务回归；为原生卡补统一队列与知识/时间筛选、预算及多页占用衔接；补列表排期与旧 session.finish 保护测试；将复盘六场景接入现有 Windows quality 编排，保留原测试；执行协议、构建及必要编辑器/系统/ASAR回归。按 T16–T22/T27 收束 S4 后保存并自动进入原 Work-Handoff-v1.0 的 S5→S9。推送只是检查点，不结束任务，不逐阶段询问；只有用户明确暂停或实际平台/安全/决策阻塞才停止。不自动审批pr-trust、合并或发布。

原始指令在 handoff-original/GankSoft-v0.7.5-Work-Handoff-v1.0/04-work-prompts/phases/；当前 API 见 registry 与 docs/protocol。当前文档提交由 git log -1 -- docs/development 解析，前序远端为7e7ab757。每次上传仅含审查过的原创源码/文档/合成记录，无真实库、私人文件、密钥、压缩包或原始日志。

---

以下为历史记录；冲突时以上方最新状态为准。

# 连续执行恢复：S3归档与S4（2026-10-23）

按用户最新纠正规则：保存检查点后继续实际代码开发，不退出。精确7e7ab757/Run39914725269的Windows与Ubuntu质量Job已success，Windows日志确认草稿19及launcher/原生A-B/完整行列拖拽通过；pr-gate当前queued，S3归档暂IN_PROGRESS，不能提前宣称整次CI通过。

S4按原包S4-REVIEW-FSRS-ASSESSMENT实施。先抽取ts-fsrs纯推进函数并增加整数scoreTenths映射（旧604评分路径保留），再实现统一冻结会话/事件与调度CAS保护、当前周期证据和知识聚合、主动重算，按T16–T22/T27逐项验证。原606不可变内容/事件表复用，完整ReviewEvent通过显式native扩展携带答题/用时/规则/政策快照，历史legacy编码不改。调度复用scheduling/schedule_events，每个card唯一规范kind（有legacyKind沿用，否则card），不建第二份FSRS状态；会话复用study_sessions显式新encoding，当前题正文按需读取。生产604和真实数据不启用。

先实现/专项/协议/build，再必要UI和备份回归。每阶段审差异并推原分支/PR13；保存后继续S5→S9，不自动合并/发布/审批，不扩大S2重测。

---

# 本轮收束计划：S3.b.3 与已知CI失败（2026-10-23）

新卡草稿/首次发布/备份/恢复列表、旧题显式整理完成本地验证后保存。先修CI39910429399的旧AI配置回归与Windows拖拽夹具，保留真实失败及Windows待复验限制。先完成必要本地回归，逐文件公开披露检查，再保存原分支/PR13；读取一次新CI快照后退出。不以本地PASS宣称Windows修复或S3完整DONE，不进入S4。

AI设置清理属于既定EX-06/R04：外部Prompt范围为完整目录/本卡已确认节点及父路径，均默认关；保留消息/主题/导航和窗口关闭回归。拖拽修改仅使用公开DOM和真实鼠标，保持断言及超时，不接管上游实现。

---

# 当前S3.b.3：未发布新卡草稿（2026-10-23）

已保存远端5b9bb81acd063bc54efc99b18884d32adb803fff，tree72b70f87fa190fe858bca766decc776b33e4504e与本地9accdb9一致；CI39910429399首次in_progress。后续本地用同内容合并提交d1381c5保留两条提交祖先，没有修改PR状态或业务tree。

- 复用settings中显式独立的new-card-draft命名空间，不修改606表DDL，不创建空正式Card/ContentVersion/StudyCycle。严格封套保存deckId和单模式草稿；正式修订0仅表示尚未发布，origin明确unpublished且versionId=null，不伪造版本。
- draft.create仅建立草稿；get/save/预览/确认/图片复制复用现有服务。首次发布在同一个外层回执事务中创建正式卡/内容/模式/首次周期并移除新草稿封套；重试不重复；失败保留草稿。首次周期沿用606既有explicit-relearn技术枚举作为显式开启周期，审计reason=initial-publication且resetStudyCycle=false，绝不记录用户勾选了重学或伪造历史。
- 未发布草稿不出现在正式列表，也不能被旧学习入口读取。隔离UI提供新卡入口，普通App604不启用。类型转换只有一份草稿、确认才替换，origin记录未发布来源。
- 在完整性/媒体引用/备份恢复/同集隔离上加入显式封套验证；未知损坏拒绝而非静默忽略。新增卡片集永久删除关联待统一S8处理，当前606不可变卡等已有危险旧删除入口保持阻断，不扩大破坏性写入。
- 专项覆盖三模式新建、无伪发布、保存/切换/粘贴/首次发布/回执失败/重开/备份/跨集和生产604拒绝；UI覆盖新建到发布。通过后继续原阶段，不提前称S3全部DONE。

---

前序计划：

# 当前实施：S3.b连续恢复（2026-10-23）

1. S3.b.1：核原publish/ownership/Prompt与文字clipboard，修真实失败，验证事务、系统剪贴板与丢响应恢复，保存检查点。
2. S3.b.2：补复制媒体的自包含交换、目标资产/Placement重映射、确认预览失效/失败回滚；现有2MB IPC预算保持，不把Base64塞常规DTO。
3. S3.b.3：补新卡单类型未发布草稿，不能创建空的已发布卡假装草稿；复用已有协议/事务/备份并补完整性、恢复、不同卡片集测试。
4. 完整T09–T15本地通过后进入原S4；统一卡知识关联按原S5服务落实。正常604用户库与人工启用门禁保持。

不重做S0–S3.a。原Draft PR13/分支，定期保存且不等待CI，不审批/合并/发布。

---

历史计划：

# 当前实施检查点：S3.a（2026-10-23）

起点 `18d0f7fab53e4ef6c8011bc129067016b3496d9b`，原 PR13 / 分支不变。继承 S2 自动化准入与连续工作授权；本轮先 T09–T12，专项通过后推进原包 S3.b，不因 pr-trust 或异步 CI 等待停工。

- 已审查 606 六列草稿表、内容/模式指针、owner 提交校验、协议幂等/epoch 和媒体备份闭包。维持生产604，不自动激活用户库。
- S3 草稿用显式 `ganksoft.card-draft/1` JSON 封套保存标题、单类型正文、媒体放置、来源及列修订镜像，复用现有表及约束；S1 裸正文草稿只读适配。未知封套/身份不一致拒绝。备份及完整性校验同步识别。
- question→qa：材料/题干→front，正确项显示文本/解析→back，原选项/首次错思路→supplement；question→direct：保留背景/原选项/结论/解析/误区。旧604原选项与答案标记原样保留并要求人工核对。
- qa→question：front→stem，back/supplement→analysis；direct→question：body→stem/analysis；两者选项空、正确项null，必须人工补齐。qa→direct：问题/答案/补充；direct→qa：body→back、front空。目标曾发布时恢复该目标，不重算覆盖。
- draft.previewSwitch 是只读，token 绑定当前发布、草稿全文/修订、epoch、目标内容；确认时事务内重验。保存拒绝隐式跨模式，revision 单调递增，取消不调用写接口。保存/切换不改发布、cycle、排期、旧事件及关联。
- 测试：六向/选项身份与重排、缺字段草稿、CAS/epoch/幂等、注入失败回滚、跨集/跨卡媒体、重开与备份；轻量隔离编辑接线及异步保存状态验证。实际断电/Win10/11 IME仍NOT_RUN。

---

# Work 连续多阶段执行授权（2026-10-23；覆盖旧“每阶段需单独授权”的执行方式）

用户已要求 Work 在**一次会话内尽可能连续实施多阶段、分阶段测试**，完成 S3.a 后不再暂停询问是否进入 S3.b，后续按 S4–S9 原计划推进；跨会话由 GitHub 交接检查点恢复。详细执行指令见 [docs/v075/CONTINUOUS-WORK-MODE.md](../v075/CONTINUOUS-WORK-MODE.md)。阶段 Gate 的业务测试及安全限制不放宽；pr-trust、合并、发布仍由用户决定。S3.a 业务代码尚未实现；本次授权文档不冒称实际完成。

---

# 当前执行：S3.a 单卡草稿与三模式首次映射（用户已授权，2026-10-23）

上一阶段 S2 自动化开发准入 **DONE**：测试源 SHA `0b8b96bf857b43e42087e7d621084326cffacbf1`，CI [39876037722](https://github.com/Aides8Stack/GankSoft/actions/runs/39876037722) Windows/Ubuntu/pr-gate PASS；Windows 原生/扩展 A/B 表格拖拽、真实系统 PNG Clipboard、受控离线均 PASS。旧负向原生事务控制保留。用户已明确批准将真实 IME 等人工验收后置至正式编辑器启用前，**NOT_RUN 不能写 PASS**；pr-trust 仍待独立所有者审核。

**本提交只更新阶段文档，S3.a 实现 NOT_STARTED。后续开发直接开始 S3.a，不重做 S2，除非新的变更引出真实回归。**

## S3.a 执行顺序

1. 对照 S1 606 隔离模型/604 保护、既有 ContentVersion/mediaRefs、`ganksoft.editor/1`；审查所有 API、数据库、历史与 deck 隔离影响。先输出简洁字段映射表及冲突规则。
2. 实现单卡单模式 Draft 的后端事务/修订服务及公共 DTO/API；事务原子、幂等与失效拒绝，保护已发布内容和历史。禁止静默迁移真实数据库。
3. 三模式 question、QA、direct 的六向首次内容映射：先预览损失或缺失字段，不自动覆盖已存在目标；对图片 Asset/Placement、引用、来源进行统一校验。用户取消不改变数据。
4. 模式切换的确认状态机和轻量 UI/API 接线，仅实现 S3.a 必要范围；复用已有 MarkdownEditor 与原生能力，不提前铺开整套页面。
5. 最小有意义回归：单元/协议/SQLite+媒体事务/并发/重开/跨 deck/草稿失败恢复；测试用隔离数据，不接触真实用户库。
6. 更新本分支执行记录，原 PR13 检查点推送后记录 SHA 与初始 CI，立即结束，不等待 CI、不审批/合并/发布。

**正式启用限制**：Windows 真正中文 IME、真人拖拽/图片、长文/撤销保存及实际便携 ASAR 未验证，必须在编辑器接入真实用户数据之前完成相应验收；完整发布签核仍在 S9。不得因为这次开发准入批准而默认安全放行。

---

历史计划（以下旧 S2 BLOCKED 判定已被新用户授权取代）：

# 当前执行：S2 原生编辑器优先改造（2026-10-23）

起点PR13/feature/v075-unified-learning-workspace完整HEAD c892378c094080c537e1017430b1957f75a60e4f，Run39810159802 Windows119934026750与pr-gate失败；Artifact12440650734（SHA256 fe39c77d64eee73108730f14105dc8ae8f159099216bafe79f6f193fba74fb32）真实系统剪贴板/离线PASS，拖拽dragstart/dragover存在、drop缺失、行顺序未变。57/完整editor含11均PASS，继承不重查图片异步/冷启动。

先读取锁定7.22.3原生TableNodeView/表格组件、ImageBlock/onUpload/plugin-upload与Clipboard插件源码；官方文档网页只有导航时以实际安装源码为准。原生/自定义逐项对照写现有ADR，不换框架/协议/工作流，不新增依赖。

同一窗口、数据、固定host、真实鼠标路径隔离A原生Crepe与B仅加载当前公开表格扩展；分别记录DOM/原生事件/完整行列顺序。现有全编辑器拖拽断言保留，复用同一鼠标函数；先确认落点/指示线/最后原生dragover是否实际到达再释放，不用内部move或合成拖拽。Windows沿现有launcher入口执行A/B，不在Work等待CI。原生旧事务竞态单独复验留FAIL控制，不能带回生产。

优先删除重复能力：评估普通文本粘贴是否可通过原生Clipboard插件完成，保留对不可信HTML和业务资产的安全校验/可见错误；图片ImageBlock的ratio/alt/说明、原生上传的placeholder映射和错误/销毁/选区行为需与ganksoft.editor/1严格对照，不能只凭有onUpload就替换。仅有真实收益且原57/11/30-80/保存重开/安全回归不退化才实施简化；否则保留最小适配并说明理由。

运行本地构建/类型、57、完整editor含11、系统平台A/B/剪贴板/离线和必要新增安全用例；继承无关业务/流水线证据。更新ADR与必要三份记录/TASK/Gate，提交原分支、核SHA/tree与一次即时CI后退出；S2 BLOCKED，不进入S3，不审批/合并/发布。

---

历史计划：

# 当前执行：S2剩余自动化与S3准入评估（2026-10-22）

核PR13最新e73f9e46ae62ce11c4d859a6bbeeb3e4b2a5ce68，仅新增STANDARDS组件复用规范；继承已通过的图片恢复/57/11/17/启动自检。Run39796684980 Windows Artifact12434645198 quality.json为同SHA PASS全部9步；初始checks Windows仍in_progress但pr-gate/Ubuntu/scope success，pr-trust failure39796682060，保留快照差异，不轮询。

只在原launcher --verify-launcher接入剩余平台检查，沿既有Windows质量调用，不改workflow/quality。实际Electron系统clipboard.write/read及浏览器Ctrl+V（不替换read）、两引用宽度/保存重开；真实鼠标拖原生行列handle并断言文档重排、记录trusted drag事件，不用commands；Chromium离线+禁止外网、清新测试profile验证字体/数学/图片；只读检查Runner OS/已装语言，不用合成中文冒充OS IME。每项PASS/FAIL/NOT_RUN，真正失败保持exit1。先本地验证可覆盖路径，Windows结果待新CI，不重跑无关57/11/业务全套。

真实鼠标路径确认两个不同问题：原TableNodeView.update对内容不变返回false，CellSelection装饰更新会重建表格DOM并移除拖拽源。只增加公开update()中node.eq保持DOM的7行修复，新增DOM身份断言；旧实现同夹具FAIL、新实现57/57通过。原组件外层已有dragover.preventDefault，因此不增加事件补丁。测试鼠标必须等待原生指示线到目标，再对异步移动后的预览层做一次真实鼠标命中，最后释放；未调用编辑器move命令、未注入drag/drop事件。此前缺drop失败原样保留，最终行列可信drag/drop与完整重排PASS。离线有可达本地HTTP负向对照证明网络模拟有效；没有修改navigator.onLine。

读取现有PHASE-GATES/人工清单/T05–T08，写短准入报告，区分S2必须人工、可自动化与S3/S6/S9后续；不自行调整Gate，不进入S3。仅修真实故障，保存原分支/PR并读一次即时CI退出，不审批/合并/发布。

---

历史计划：

# 当前执行：S2异步图片目标恢复修复（2026-10-22）

核da4dca3a4c2fcc64d77fe3c9288fe308ba7aab28及Artifact12430638209：read PNG/stage成功，MEDIA_INSERTION_MOVED_RETRY、0节点0文档assets。旧报告未拆beforeDoc/selection，不伪造单次Windows分支结论；原代码纯选区变化必拒绝且插入使用当前选区，受控回归应明确复现。

采用公开ProseMirror SelectionBookmark/Plugin state：捕获原selection/bookmark和正文事务版本；纯焦点/选择允许，成功时用当前state新事务恢复bookmark目标；任何docChanged（含改后撤销）、无效目标、销毁拒绝；同实例pending时第二次明确忙碌拒绝，首次完成后可重试，多实例独立。多资源一次插入/先校验所有Asset，保留既有媒体API与30/80/资源重开。现有full editor smoke内加入可控异步stage专项，沿原Windows Runner执行，不新工作流/改quality。先验证旧版纯选择失败，再修复和运行专项/57/完整集成/必要业务协议类型构建及启动自检，保存原分支/PR并一次即时CI退出。Windows通过前S2 BLOCKED、不进入S3。

---

历史计划：

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
