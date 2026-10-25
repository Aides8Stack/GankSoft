## 2026-10-25 中断恢复检查点

保留全部 S7.d 未提交实现与历史。远端仍3ce4dda，Windows质量成功，Linux/pr-gate失败的原始Job121094083655已读：smoke-v070:246仍要求全屏static。将v070/v071验收同步到整窗几何和工具栏返回，保留原15/14场景与真实保存/冲突/导航操作；同步明确的场景名称合同，没有删减门禁。当前源码Linux完整ASAR13组107项PASS，完成标记0eb49c2c-2528-4382-b950-34b3b3a1955d。379业务、129方法、16工作台场景继承同一未改源码的上一轮有效证据。S7整体IN_PROGRESS；继续S7.e批量导出及配套导入，不进入S8；截图BLOCKED、Win10/11人工NOT_RUN。新检查点CI推送后即时观察，不轮询。

# 2026-10-25 S7.b/c/d 验证与 S7.e 恢复（当前）

PASS：业务379/379（0失败/跳过）、工作台6、生命周期5、分析/目录/媒体备份闭包5、协议21/129方法/边界/类型/导出、build/spike、真实Electron16（两次重启，errors/external=[]）、旧图谱7。原有断言和CI900s未变。最终ASAR PENDING；截图BLOCKED，Win10/11人工/最终便携同包NOT_RUN。测试输入全部合成。

详见 `RECOVERY-NEXT.md`；以下历史不覆盖本节。

---

# 2026-10-25 连续开发恢复（当前）

PASS：整窗统一UI9、旧图谱7、工作台专项6、批量生命周期5、协议21/127方法/边界/类型/导出与构建。完整业务374/374 PASS（0失败/跳过）；最新扩展UI PENDING；截图BLOCKED，Win10/11人工及最终同包NOT_RUN。测试输入全部合成，无删弱测试。

详见 `RECOVERY-NEXT.md`；当前提交SHA由Git/远端解析。

---

以下为历史记录。

# 2026-10-25 紧急停止保存：S7.b WIP（最新状态，优先于下方历史）

用户最新明确要求“不要再实现任务，立马保存任务进度”。已停止开发与正在运行的界面复验；只保存、推送、读回，不进入S8，不等待CI。原仓库Aides8Stack/GankSoft，唯一分支feature/v075-unified-learning-workspace，原Draft PR #13，不新分支/PR、不自动审批/合并/发布、不强推。

## 准确检查点与现状

保存前远端HEAD：0eda6c02572f532bcfc7f8fd3610dbdca9499697，tree fc38f40a6e79df195ab9fcd686ef50ae70a3afe8。本地HEAD 24eec85与该远端tree完全相同，保留等价本地历史，不重置/覆盖。此保存提交的完整SHA请从远端HEAD或git log -1 -- docs/development/RECOVERY-NEXT.md读取；提交无法在自身内容中包含自身SHA，不为回填回执反复提交。

S3–S6自动化DONE，继承既有验收文件；S7.a本地DONE，S7整体IN_PROGRESS。本次保存S7.b筛选/调度实现及全屏WIP，不能标整个S7或Windows验收DONE。生产schema仍604，606仅既有合成隔离，不自动迁移或访问真实用户库。

已实现：UnifiedStudyPlanner知识路径/包含下级/日期/随机知识点及真实只读队列预览；UnifiedScheduleSettings全局/单卡设置、独立重算预览/确认/撤销及未知原请求恢复入口；现有AdaptiveReviewSettings统一接线；队列/重算输出轻量标题；无关键词时不读取全部正文字段，旧复盘仅取所需统计字段；专项会话practiceMode持久化，跨重启/下一卡保持仅练习，UI禁止取消且服务端拒绝取消，提交仍校验已保存草稿。

全屏WIP：已读取原型OPEN-ME-v3.7.html及原S7/UI参考指南；原型最终.knowledge-fullscreen为inset:0,width:100vw,height:100dvh，旧CSS后置覆盖仍扣48px/200px。MindMapWorkspace新增局部高优先级整窗及画布高度样式，UnifiedWorkspace补主容器高度，smoke新增1366/720宽度下实际画布边界断言及工具栏返回。构建已通过，但最新真实Electron复验被用户立即停止（退出130、无完成输出），**全屏修复尚未验证，不可宣称已通过**；截图/完整视觉验收仍BLOCKED。

## 已有测试与本次边界

- 中断前有效日志：完整业务369/369 PASS（/tmp/gank-s7b-business-final.log）；协议21及124方法/边界/类型/导出PASS（/tmp/gank-s7b-protocol-final.log）；S7.b Electron9场景PASS，errors/external=[]（/tmp/gank-s7b-ui-final.log）。该9场景发生于最新全屏样式/边界断言之前，不能替代全屏验收。
- 本次实际PASS：npm run build（/tmp/gank-s7b-save-build.log）、npm run build:editor-spike（/tmp/gank-s7b-save-spike.log）；node --experimental-strip-types --test tests/unified-workspace-v075.test.ts 6/6（/tmp/gank-s7b-save-targeted.log），0失败/跳过；git diff --check。
- 本次最新Electron：node --experimental-strip-types tools/workspace-spike/smoke.ts，用户要求立即停止，退出130，未完成，不记PASS。宽窄全屏边界及视觉仍待复验。
- 继承S7.a pipeline182/182、ASAR13组107项，不在紧急保存时重跑。Win10/11人工IME、物理操作及最终便携同包NOT_RUN。
- 临时日志/合成数据库/截图/附件ZIP均不上传；以上精简证据随源码保存，即使/tmp丢失也不虚构原始日志。

## 真实CI，不能继承绿灯

保存前远端0eda6c02572f532bcfc7f8fd3610dbdca9499697 / Run40145081439：scope及Linux success；Windows及pr-gate failure。已读Windows Job121024604891原始日志：editor-launcher-selftest-windows失败；table-mouse-drag在table-mouse-drag.mjs:83等待5000ms超时，offline-local-resources在manual-acceptance.mjs launch等待window事件5000ms超时。Artifact12580431392。没有改编辑器/门禁来绕过；具体根因与修复仍未完成，不能仅认定随机故障。S7.a Windows新增工作台步骤在launcher之前，需恢复时按原日志逐项确认，不能以整个Job失败推断各步均未运行。

此新保存提交CI：PENDING_NOT_OBSERVED，推送后只即时读取一次新完整SHA的runs并在最终回执报告；不等待、不轮询。前序失败不代表新SHA已测试，前序S6绿灯也不代表S7通过。

## 下次Work首个未完成任务（直接从GitHub恢复）

1. 读取本文件、TASK.json、PROGRESS/HANDOFF/TEST_REPORT及实际远端HEAD；保护全部WIP。当前任务元数据在docs/development/TASK.json，根目录没有TASK.json，不重复初始化任务。
2. 只查当前保存SHA的一次CI结果。若Windows仍失败，读具体Job/Artifact，最小定位上述拖拽/离线重启失败；不重做S2–S6、不削弱断言/超时/质量门禁。该阻断与下面全屏复验均未完成。
3. 按顺序构建完成后再运行smoke，禁止构建和界面测试共享资源并发：npm run build；npm run build:editor-spike；node --experimental-strip-types tools/workspace-spike/smoke.ts。首个本地未验证项为**S7.b整窗图谱WIP在1366/720宽度的边界与工具栏返回复验**。旧9场景已PASS，无需重写。失败保留现场最小修复；截图超时如实BLOCKED。
4. 完成当前筛选/调度子任务剩余交互覆盖（重算确认/撤销、异常回执、专项启动/恢复），再继续S7剩余：原生卡批量导出/删除/移动及回收入口；学习分析；卡片集/文件夹管理；草稿/会话分页、多页跨重启、焦点/窗口状态；三模式总流程、宽窄视觉与T33–T37。不得直接用旧content.bulk按deck.kind处理原生卡，先复用统一生命周期/归属/回执服务。
5. S7未完整验收，不标DONE；不重复S0–S6。仅当用户恢复连续开发后，原后续范围为S8完整恢复/独立追加卡片集/活动数据库目录迁移/回收删除恢复（新旧隔离、媒体闭包、预览/事务/回滚）→S9全量回归和Win10/11同包人工验收/交接，不自动发布。此次保存后立即停止，不继续这些阶段。

核心入口：src/unified/{UnifiedWorkspace,UnifiedStudyPlanner,UnifiedScheduleSettings,UnifiedCardDetail}.vue；src/components/{MindMapWorkspace,AdaptiveReviewSettings}.vue；src/review/UnifiedReviewForm.vue；electron/modules/cards-unified/{queue,recompute,review-session}.ts；shared/protocol/{unified-review,review-details}.ts；src/services.ts；tests/unified-workspace-v075.test.ts；tools/workspace-spike/smoke.ts。

原业务原型/阶段包仍作为参考，未将私人附件或整个ZIP提交GitHub；本文件已写明当前完整可执行恢复起点和后续范围，不依赖旧/tmp或聊天来找未完成项。任何原型差异保护既有有效实现，不直接回滚。

---

以下为历史记录；冲突时以上方最新状态为准。

# 2026-10-25 S6 已归档；S7.a 本地检查点

S6精确 `7b5dbd49cec8aeb86bc987a3fd0bd5373d536908` / tree `3878b012554378c73516aa85fcce8f1f15147bdf` / Run40143926508，scope/Windows/Linux/pr-gate全部completed success。已读Windows Job121021213096原日志，确认363业务、122方法、T32媒体6及知识界面10（errors/external=[]）。S6/T28–T32/T36自动化DONE，S6-ACCEPTANCE.json已更新；真实Win10/11人工和最终便携同包仍NOT_RUN。

S7.a已实现：轻量分页卡片集/文件夹/面包屑与计数、服务端标题与模式筛选/游标、会话摘要与同题集精确定位；启动只读识别实际模型，604仍原App，已激活606才使用统一工作台，没有新自动迁移或真实用户激活。统一目录→列表/当前模式详情→草稿/发布→复盘标签→图谱/大纲连通；查询/勾选/滚动恢复，离开复盘持久暂停，草稿收件箱保留身份；详情分页历史及按需原事件/当时版本，评分和用时复用原折线图。卡片集显示名称，工具栏新增子/同级位于全屏操作之后且按选中展示。所有大组件懒加载，未调用旧全库workspace.read。复用原编辑、复盘、媒体、MindElixir和评估服务。

本地PASS：workspace专项4/4（目录SQL与DTO不含正文/资产/历史、604不激活、会话隔离/同题集、搜索游标）、完整业务367/367、协议21与124方法/边界/类型/导出、应用及隔离构建、真实Electron统一导航6场景（errors/external=[]，列表API字节/方法追踪）、test:pipeline182/182、Linux ASAR13组107项及完成标记。知识10场景继承S6精确CI；当前S7新检查点Windows尚未验证，已向现有Windows quality编排最小添加统一工作台smoke，原门禁全部保留。

真实发现：动态入口拆分暴露默认内嵌小字体被原CSP拒绝，已采用与既有隔离构建相同的assetsInlineLimit0输出同源字体，未放宽CSP；原ASAR全107项通过。流水线原offline安装先因本地缺少zwitch/zod等锁定tarball失败，已在源码外隔离目录用原manifest/lock预热381包，原182项通过，未改依赖/锁/测试。最初详情断言早于异步只读编辑器完成渲染，已改成等真实目标文字后继续，断言不变。Linux headless screenshot超时，截图/视觉验收BLOCKED，不能据布局DOM断言冒称视觉通过。

S7整体IN_PROGRESS。未完成S7.b：完整批量导出/删除/移动与回收入口、知识/时间/随机筛选、学习分析/调度设置统一UI、卡片集目录管理、分页/多页恢复和窗口状态收尾、三模式总流程与宽窄截图。之后按原包继续S8独立追加/活动路径/完整恢复/回收站，最后S9；不得把S7.a记整个S7完成。新提交SHA通过git/远端读取；当前前序远端7b5dbd49。保存原分支/PR13后继续，不等待/轮询CI、不自动审批/合并/发布，不操作真实用户库。

---

# 2026-10-25 S6.c 本地实现及验收检查点

恢复起点：`b3a37ff3a9a29f68d5cb10385a988d51aa0af96d`，原分支 `feature/v075-unified-learning-workspace`、原 Draft PR #13。S3–S5继承已归档证据，未重复实现。起始CI40142358877只读一次即时状态：Linux/scope success，Windows in_progress；没有等待或轮询。当前文档提交自身SHA通过Git历史解析。

已实现：CommonMark图片识别（含引用式图片和代码上下文），规范Base64/MIME/20MiB/40MP完整解码，目标集内hash去重、每处stable placement/独立1–100%宽度及原图片title；知识专属purpose/归属/hash封套与媒体读取；预览不写文件，确认连同回执原子化，已知回滚清理本次文件、未知提交保留；缺失/损坏/跨集图片拒绝；正文/回收节点图片进入备份闭包。复用既有解码、staging、事务、Crepe、MindElixir公开接口，无DDL或发布工作流变动。

已接线：文件/剪贴板/文本来源、普通标题显式消歧、左图挂载、只读路径/正文差异、默认keep与显式replace/append、多分支导出/必要祖先/子树选项、同序列化复制/保存；Markdown大纲复用同一节点保存控制器，一次按需读一个正文，右侧缩进/可折叠目录，导图右侧不重复导航；未知导入回执锁关闭并重用原请求核对。生产仍schema604，新页面只在既有合成606入口验证。

实际验证（Linux，合成隔离）：`npm test` PASS363/363，0失败/跳过；媒体专项6、文本存储专项6、既有解析专项11；`npm run check:protocol` PASS21/122方法及类型/边界/导出；`npm run build`及隔离构建PASS；知识Electron10场景PASS，errors/external均[]（含响应/状态丢失恢复）；`node tools/validation/package-check.mjs` PASS13组107项，GANKSOFT_ASAR_COMPLETE。最终更严格keep源图校验另跑媒体+文本12/12通过，未重复无关阶段。

开发中真实失败及修正：协议DTO跨目录依赖被边界检查拒绝，已将DTO移入protocol；最初全备份预检过宽，提前拦截原有故障夹具，已收窄为新增知识媒体闭包检查并保留原恢复损坏断言；旧S5“接口未开放”错误码改为同一无效引用的永久拒绝码，未删/skip/弱化测试。

当前S6整体IN_PROGRESS（当前新SHA远端双平台CI尚待核实），本地实现及自动化验收PASS；Windows当前改动/Win10–11人工IME/最终同包验收NOT_RUN。S7–S9尚未完成。保存原分支后继续原包S7 UI与按需加载，不以commit/push为结束，不等CI；必要CI失败按具体Job最小修复。不审批trust、不合并/发布/强推、不访问真实用户库。下一项：新增轻量导航/卡片集入口与统一列表/编辑/复盘页面接线，复用S3–S6真实typed API，避免旧全库store携带正文/历史/图片。

---

# S5 已归档，S6.a 协议基础检查点（2026-10-24）

S5精确297a0bea2397950f419e8d37eb0ee8782589261d / Run40094187621 scope、Windows、Linux、pr-gate全部success；Windows原始日志确认340业务、111方法、图谱7场景且errors/external=[]。S5/T23–T27自动化DONE，S5-ACCEPTANCE.json已归档。原PR13保持Draft，未审批trust/合并/发布。

S6 IN_PROGRESS：已实现shared/knowledge/markdown.ts，复用mdast-util-from-markdown2.1.0 CommonMark AST + GankSoft结构状态机，原文切片保留正文；字面结构标记单行Base64URL转义/单次解码，代码/引用/跨行注释上下文保护，BOM/CRLF边界规范，正文BOM及尾随空行保留。支持多根、同路径唯一、一至六级标题、深度/缺父/循环/错序/缺失诊断；不能表示的未闭合代码/HTML块拒绝输出，绝不扁平化或输出不可恢复结构。普通MD仅列候选，必须显式确认标题行，未选标题仍是正文。

原依赖树已有锁定2.1.0，现提升为明确生产依赖，没有升级版本；package-lock仅根依赖声明及传递dev标志变化。Windows和Linux ASAR复制入口同步包含该运行依赖。新增两份原包纯合成Markdown示例fixture。S6.a专项11/11、完整业务351/351、应用类型/构建、流水线182/182 PASS；首次TS空值缩窄错误已通过明确never函数声明修正。

范围边界：这只是协议基础，真实知识导入/导出事务、文件/剪贴板、Base64解码资源落库/宽度闭包、UI大纲尚未实现或验证。T32只有公式/颜色/逻辑图片URI文本往返，不能标真实图片测试PASS。当前知识正文图片保护仍生效。schema604生产入口不启用606，所有测试仅合成隔离；Win10/11人工/最终便携同包仍NOT_RUN。

下一项立即S6.b：复用现有知识API和protocol事务实现只读导入差异预览、同完整路径keep/replace/append、确认前树/正文/epoch重验与幂等/回执回滚；再接共享媒体校验/自主位置宽度、文件/剪贴板和Markdown大纲。完成S6后继续S7→S8→S9，不因推送/CI未结束或trust待审结束任务。原始阶段指令S6-MARKDOWN-KNOWLEDGE-EXCHANGE.md；精确语法/限制见KNOWLEDGE-MARKDOWN-ADR.md。自身SHA通过git/PR head解析，前序远端297a0bea。

---

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

# S3自动化验收归档，S4持续实施（2026-10-23）

用户已明确纠正旧节奏：GitHub commit/push仅为保存检查点，不结束本次任务。原分支/PR13、S3–S9连续授权，完成本地验证和保存后直接进入下一可执行阶段；不等待CI，不审批pr-trust、不合并或发布、不访问真实用户库。AGENTS/STANDARDS/CONTINUOUS-WORK-MODE的旧退出条款已修正。

精确 `7e7ab75787b2c309d3672de018d5ae2161670377` / [Run39914725269](https://github.com/Aides8Stack/GankSoft/actions/runs/39914725269) 实际scope、Windows、Linux、pr-gate全部completed/success。Windows原始日志确认草稿19（errors/external=[]）、editor18/表格57、launcher完整行列拖拽/原生-扩展A-B/系统PNG与受控离线PASS；Linux质量与ASAR Job PASS。S3/T09–T15开发自动化验收DONE，逐项证据S3-ACCEPTANCE.json；旧39910429399失败保留，不能据新通过捏造其确切Windows根因。真实Win10/11 IME/人工作业仍NOT_RUN，正式启用限制保持。

S4 IN_PROGRESS：已实现整数评分/ts-fsrs共用适配，冻结版本/cycle/选项/知识路径与时区的三模式会话，幂等事件、回执原子回滚、旧版本/新周期/排期CAS冲突只归档而不覆盖当前状态；会话暂停/总计时/断点、跨页去重、分页历史、当前周期掌握度及知识聚合cardId去重、单卡配置/只读重算预览-确认-撤销。复用scheduling/schedule_events和study_sessions；原606 DDL不改，新增严格native事件/会话/策略封套，备份同步验证。S4专项13/13、业务324/324已PASS；界面及最终回归仍在执行，当前不记S4 DONE。

正在接真实隔离Electron复盘UI，三模式按需正文、只读Crepe、0.1自评与客观正误独立、失败保稿/未知结果锁定与原请求重试、已保存但刷新失败的明确状态。完成UI/协议/build及必要回归后保存S4检查点并自动进入S5原阶段指令，不在推送后结束。

---

以下为历史记录，旧“退出/等待下一会话”不作为当前执行规则。

# 远程保存回执（2026-10-23，优先于下方历史状态）

S3.b.3源码已保存原分支/PR13：`346a677cc4e06243055f4cc003736cc067a7c7f7`，tree `43ed6ed755e1fd4574a428b99e467e5d5ae0eb73`；与本地被测提交611d420内容完全一致，git fetch/差异及PR head读回已确认。保留本地历史的同内容合并8e99ba7不是PR合并。

新质量[Run 39914513527](https://github.com/Aides8Stack/GankSoft/actions/runs/39914513527)一次即时快照 **in_progress / conclusion=null**；未等待、未轮询，Windows修复仍待核实。此后仅追加本回执；回执提交自身完整SHA从原PR最新head/Git历史解析，不将源码提交CI冒充文档提交已通过。31个源码/文档/合成证据文件检查未发现密钥/令牌/真实库/私人信息，原始日志和ZIP未上传。下一次先核最新SHA真实CI，再按下方S3恢复步骤继续；本轮不自动审核、合并或发布。

---

# S3.b.3 与 CI 失败修复验证（2026-10-23）

被测：前序本地d1381c5之后的本次工作树；源码指纹 `f4b50ca8592c474ea3502a299c6a5e4a6b15796df7deb1ed8de59a02fdf62df3`，逐源码hash/合成UI场景见 `docs/v075/S3-NEW-DRAFT-VALIDATION.json`。本次提交由Git历史解析，前序远端5b9bb81不是本轮被测源码。环境Linux / Node24.19.0 / Electron44.7.2，隔离合成库606，正常App604保护保持。

| 命令/验证 | 结果 | 实际范围 |
| --- | --- | --- |
| npm test | PASS 311/311，skip/cancel=0 | 含草稿38，新卡三模式/CAS/首发回滚/幂等/重开/备份/跨集/604拒绝/回收保护/旧题人工整理 |
| npm run check:protocol | PASS 21；89方法 | 边界、严格输入输出、类型、合同导出 |
| npm run build；npm run build:editor-spike | PASS | 最后设置说明措辞校正后再次构建 |
| node --experimental-strip-types tools/card-draft-spike/smoke.ts | PASS 19，errors/external=[] | 真实Electron IPC/SQLite、剪贴板图片、新卡首次发布/重开、列表恢复、旧题选项整理/重排 |
| node tools/smoke-v071.mjs | PASS 14，errors=[] | 外部AI说明/无凭据/停用命令拒绝、导航、消息历史/已读、主题重开与正常关闭保存 |
| node tools/validation/package-check.mjs | PASS 13组107项，完整完成标记已核 | 真实Linux ASAR全套；此后仅校正设置说明中的两个知识范围用语，单独重建并重跑v07114 PASS |
| node tools/smoke-editor-v075.mjs | PASS 18记录，errors/external=[] | 含异步图片11与原生文字粘贴3 |
| node tools/editor-spike/check-table-interactions.mjs | PASS 57，errors=[] | 原有三轮表格交互断言 |
| node tools/editor-spike/manual-acceptance.mjs --verify-launcher | PASS 自动化 | OS PNG API、原生/适配A/B及完整编辑器行列拖拽、受控离线；真实IME保持NOT_RUN |
| 临时1084×681视口launcher探针（已删除） | PASS 修前/修后Linux | 旧Windows故障未在本地复现，不把此探针当根因证明 |
| node tools/smoke-system-v060.mjs | PASS 5 | 图片、内容交换、备份/epoch、回收站与取消 |
| node --test tools/ci/core.test.mjs | PASS 5 | 原基础设施 |

前序精确5b9bb81的Run39910429399 **FAIL**。Linux旧AI模型保存断言失败；Windows57/editor/草稿14通过，但launcher完整表格列拖指示线5秒超时，原生/扩展A/B、系统图片与离线通过。已读原始Job及Artifact12482802266的截图/HTML。补齐既定AI退役UI和相应行为合同；仅将鼠标测试改用实时目标DOM与居中，保留5秒、8像素、真实drop、精确重排及DOM身份检查。**Windows根因未证实、新SHA未验证，不能宣称已恢复。** 不删除旧失败证据，不修改生产拖拽/依赖/流水线权限。

定位中曾因build清理dist-electron与系统smoke并行出现main.js缺失，已按构建→smoke顺序重跑系统5 PASS。旧AI表单移除后原消息测试依赖的两条保存通知消失，改为显式合成success/error消息样本，保留历史/已读/重开断言；标题选择器收敛为h2避免h1/h2同名歧义，最终14 PASS。无测试skip或continue-on-error。

当前S3.b.3本地DONE，完整S3 IN_PROGRESS；S4–S9未开始。原生知识关联受S5保护；Win10/11人工IME/物理断网/最终便携ASAR同包验收NOT_RUN。保存新SHA后只取一次CI即时状态并交接，不等待/轮询、不审批/合并/发布。

---

历史账本（以顶部为准）：

# S3.b.2 本地闭环完成（2026-10-23）

本地代码检查点67eec97f3039fe412a7a47dea3edc601ec8c48d0，恢复自79d2815；原PR13/分支保持。本轮业务305/305、专项32/32、协议21与边界/类型/87方法导出、应用及隔离build、真实Electron草稿/发布/图片剪贴板14场景（errors/external均空）、系统图片交换备份5、infra5 PASS。图片预览取消无写、丢失提交与状态响应后原请求重试只导入一次、30/80宽度、跨集新资源与放置身份、草稿及发布进程重开实际渲染已验证。Node另验证跨独立数据库/完整备份恢复、并发独立剪贴板快照、损坏/缺失图片拒绝、回执失败仅清本次新文件。

**仅S3.b.2现有卡片闭环本地DONE，S3整体IN_PROGRESS。** 新卡未发布草稿入口尚未实施，T14新草稿分支仍NOT_STARTED；原生卡知识关联待统一服务，不伪造legacy卡；S4–S9未开始。Windows本SHA CI待远端保存后核实，人工Win10/11 IME/物理断网/最终ASAR仍NOT_RUN。正常App604未启用新编辑器。

用户本轮明确公开推送授权已生效，差异检查0密钥/令牌/私人路径或真实数据库/二进制/无关归档；当前源码上传已被平台接受。远程最终SHA与一次CI快照见回执；API提交元数据不同于本地时必须tree一致、真实parent、force=false，保留全部本地提交。

下一项按原包连续授权实施S3.b.3：新卡仅草稿、成功发布才进入学习列表，不创建空已发布卡，接入同一编辑器/媒体/备份/协议并验证失败重开。完整T09–T15满足后才进入S4；不等待CI，不审批pr-trust，不合并/发布。

---

前序记录：

# 当前恢复与保存：S3.b.2（2026-10-23）

已核实工作区79d2815287f37556f480fd196b4f7e268f5fadc5与用户恢复包一致，原PR13远端仍50314953b9b905d7ae7b688fe6181fbe46d1d3cb。用户本轮已明确授权将项目原创源码/文档/不含私人信息的合成测试记录上传公开原仓库/原分支；逐差异检查密钥/令牌/数据库/私人路径/无关压缩包后，平台create_blob已接受本项目源码。旧授权阻塞不再代表当前状态。

S3.b.2实现：自包含图片剪贴板留在主进程，预览/确认跨typed IPC仅传正文/引用/token；跨数据库/卡片集复制生成新Asset/Placement，不继承历史/知识关联；宽度30/80独立；保存/回执失败清理只属于本请求的新文件；成功回执不依赖后来的剪贴板。原正式内容/周期与历史保持。修复并发读取共享缓存（每请求独立快照）、预览正文/媒体宽度校验、未知粘贴时禁止编辑/解析/取消/Escape/关闭及延迟预览取消保护。

实际本地：专项32/32、业务305/305、protocol21及边界/类型/87方法导出、应用与隔离build PASS。系统图片交换/备份5与infra5已PASS。新Electron图片剪贴板完整闭环仍在验证，**此检查点暂记IN_PROGRESS**，不把源代码/Node通过冒称UI通过或S3全部完成；最终结果见后续回执/TEST_REPORT。此前11场景已验证，新媒体测试发现Linux headless进程退出清空clipboard（目标进程仅Linux经真实OS API重新设置已复制合成archive，Windows保留OS原生跨进程断言），以及测量预览前应先保存编辑器规范化快照；测试修正未降低预览无写断言。

本地git与GitHub API创建提交可能使用不同提交元数据；远端API父提交必须为核实的远端HEAD，tree必须与本地被测tree一致，force=false。保留所有原本地提交，不重置/改写/新建分支；核验本地/远端tree及对应关系，不把本地旧SHA当作API远端SHA。无CI轮询、无自动pr-trust/合并/发布。

下一项：完成图片真实Electron预览取消/丢响应锁定/目标渲染与草稿和发布重开；通过后补S3.b.3新卡未发布草稿（不能伪造空已发布卡）及统一知识关联接线，原包T09–T15全满足后才进S4。S3整体IN_PROGRESS；S4–S9 NOT_STARTED；真实Win10/11人工IME/断电/最终ASAR NOT_RUN；正常App604未启用新编辑器。

---

历史记录：

# 用户要求立即暂停并保存（2026-10-23，最新）

本地已保存检查点78c73b71470d95b0dda0078e2398d9ab3394a9d0（S3.b.1发布/文字复制/Prompt）；其后S3.b.2图片剪贴板WIP随本次暂停提交保存。当前提交SHA以git log -1解析。**均未远程保存**：普通git push无凭据；GitHub create_blob被自动审批审查拒绝，理由为未确认向公开仓库披露代码/文档的授权；缩小为单源码文件并核对授权/扫描后仍拒绝。未绕过、未改远程ref。远端最后已核实50314953b9b905d7ae7b688fe6181fbe46d1d3cb，PR13仍Draft。下一轮要补充明确的公开仓库上传授权后再正常保存，不要误当远端已有本轮代码。

实际验证：S3.b.1业务301/301、protocol21及边界/类型/84方法导出、应用/隔离build、Electron11场景（包含系统文字剪贴板、发布回滚、提交/状态响应均丢失后的原请求重试、显式重学重开）、原学习4/系统图片交换备份5/infra5全部PASS。最后界面发布消息清理也已重建并复验Electron11 PASS。S3.a精确d9e312a质量Run39882141281success已核，不代表本轮本地提交CI。

S3.b.2新增：主进程自包含图片剪贴板、异步Electron44协调器、只读预览token、目标Asset/Placement重映射、30/80独立宽度、完整host回滚后清理本次新文件、回执重试不依赖后来剪贴板内容；UI含图片预览接线；持久暂存图片重开读取适配。新卡未发布草稿仍未实现，S3整体IN_PROGRESS，S4–S9 NOT_STARTED，正常604和人工启用门禁保留。

S3.b.2证据与未测：新增后端专项19项中18 PASS、1 FAIL（测试恢复库读取把expected修订字段传入strict DraftScope；已只修测试scope，**尚未重跑**）。第一版类型检查发现Electron44 clipboard异步签名，已改异步协调器；之后应用build及隔离build PASS。此后UI接线、readyToApply防护、stageImage onWrite失败清理及测试scope修复的**最终源码未完成重跑**，不得声明PASS。新图片UI闭环尚未运行。不要进入S4。

恢复最小步骤：读取原包91和CONTINUOUS-WORK-MODE、核本地commit/远端状态；先运行node --experimental-strip-types --test tests/card-drafts-v075.test.ts tests/card-draft-controller-v075.test.ts tests/card-transfer-v075.test.ts；npm run build / check:protocol / build:editor-spike；补实际系统图片剪贴板预览确认/取消/失败/重开smoke。重点审查新媒体协调器与输出/回执失败文件清理，以及UI未知粘贴响应期间编辑/取消/关闭保护（尚需完善）。通过后再全量及必要回归。不重做S0–S3.a，不降低门禁。

恢复入口：docs/development/RECOVERY-NEXT.md。当前用户要求尽快停止，不再新增开发或等待测试/CI。无审批/合并/发布。

---

历史记录：

# S3.b.1 恢复与实际测试（2026-10-23）

恢复50314953b9b905d7ae7b688fe6181fbe46d1d3cb + 本轮工作树；Linux Node24.19.0/Electron44.7.2，全部合成临时库。

| 检查 | 结果 | 范围 |
| --- | --- | --- |
| npm test | PASS301/301，skip0/cancel0 | 原290+发布/Prompt/内容交换11；事务失败、历史/排期保留、幂等、重开、归属、AI网络拒绝 |
| draft/controller/transfer专项 | PASS28/28 | 原17+新增11；其后全量301覆盖 |
| npm run check:protocol | PASS21及边界/类型/导出84方法 | 未更改检查或放宽资源预算 |
| npm run build + build:editor-spike | PASS | 应用与隔离编辑器，正常App未启用新路由 |
| tools/card-draft-spike/smoke.ts | PASS11，errors/external=[] | 原7+系统文字剪贴板预览/确认/重开、Prompt两开关、失败回滚/丢响应且状态查询失败后原请求重试、显式重学重开 |
| tools/ci/core.test.mjs | PASS5/5 | 原基础设施自检 |
| tools/smoke-v060.mjs | PASS4/4 | 原启动/学习/题目及记忆流程 |
| tools/smoke-system-v060.mjs | PASS5/5 | 原图片解码/二进制交换/备份恢复epoch/回收站/平台journal |
| S3.a精确SHA CI | PASS | d9e312a63c9d81714f1a7a053c9921d98c5745c8，Run39882141281success |
| 当前新SHA Windows/CI | NOT_RUN本地，PENDING_NOT_OBSERVED | 保存后一次即时快照，不能以旧SHA成功代替 |
| Win10/11人工IME/断电/最终ASAR | NOT_RUN | 原生产启用/发布门禁保留 |

实际失败与修复：退休AI拒绝handler被平台占位覆盖，修为禁止覆盖；S1查询测试旧断言把所有未来card.*误当query，改为显式检查原3查询仍query且新增publish是command，实际只读/无写断言保持。UI丢响应测试最初被现有services operation.status自动恢复而未进入未知状态；改同时注入一次状态查询失败，验证未知状态不能关闭、原请求重试只发布一次，没有修改生产回执机制或削弱断言。粘贴后原编辑实例未刷新会覆盖新内容，已修复重建并验证重开。

本检查点仅S3.b.1，不是T14跨集图片/新卡完整通过；S3整体IN_PROGRESS。最终消息状态清理属于界面小改，提交前重建/同闭环复验，以回执为准。

---

历史记录（以顶部为准）：

# 环境中断恢复记录（2026-10-23，优先于下方旧状态）

**当前执行环境 unavailable，无法再读取工作区或运行测试。** 远端已核验业务检查点：`d9e312a63c9d81714f1a7a053c9921d98c5745c8`，tree `39101b042fead718fc6094cc83d46cdf746d6b28`，原分支/Draft PR13。S3.a代码及交接已远程保存，Node290/协议21/专项17/草稿Electron7/原编辑器18记录本地PASS。质量Run39882141281首次快照in_progress；pr-trust Run39882138000首次pending，未等待或审批。

之后已开始S3.b，但以下改动**仅本地未提交、未远程保存，环境中断后无法确认仍可恢复**：原子publish/默认保留周期/显式重学、legacy所有权保护、复制粘贴预览与Prompt纯函数、Prompt路径查询与旧AI调用拒绝、新编辑页发布/内容交换接线。不能把它们当作此远端SHA已有功能。

已实际读到的本地测试：最初publish专项15/15（含原草稿12+新增发布3），内容交换/Prompt纯函数7/7 PASS。随后新增Prompt路径/AI拒绝测试以及发布/内容交换UI，最后的专项与vue-tsc命令已启动，**结果未读到，NOT_VERIFIED**；不能沿用前一源码测试宣称最终S3.b通过。S3.b整体IN_PROGRESS，S4–S9 NOT_STARTED。真实Win10/11 IME/人工/便携ASAR仍NOT_RUN。

恢复：按原包91，先检查 `/workspace/scratch/edd748788110/GankSoft` 的git diff及本地未提交S3.b，保护现存修改。若仍在，先读PLAN和原S3 prompt，核对变更后运行专项、npm test、check:protocol、build、build:editor-spike及草稿Electron smoke；先修实际失败，再提交推送原PR。若工作区已丢失，从上述远端S3.a检查点恢复，**只重做未保存的S3.b，不重做S0–S3.a**。

S3.b尚需完善/验证：发布UI及响应丢失处理；粘贴/Prompt实际剪贴板闭环；跨卡片集/跨数据库图片复制尚未完成（当前纯函数只携带本地引用并警告，后端必须继续拒绝不属于目标范围的资源）；新原生卡片知识关联仍需要S5数据服务，不能伪造legacy承载行。不得因局部publish测试PASS跳过完整T13–T15进入S4。按原包继续连续实施；不自动审核pr-trust、不合并、不发布。

---

# S3.a 本地测试账本（2026-10-23）

被测起点18d0f7fab53e4ef6c8011bc129067016b3496d9b + 本次工作树；Linux/Node24.19.0/Electron44.7.2，仅合成临时目录，无真实用户库。最终文件hash与摘要见docs/v075/S3-DRAFT-VALIDATION.json。

| 检查 | 结果 | 实际范围 |
| --- | --- | --- |
| npm ci --include=dev | PASS381包 | 未改lock/依赖；Electron首次按现有包安装 |
| npm test | PASS290/290 | 既有273+新增17；无skip/cancel；不是Windows结果 |
| 新草稿/控制器最终专项 | PASS17/17 | 六向、2–100选项/重排、取消/确认、恢复目标、CAS/epoch/幂等、事务注入失败回滚与重开、草稿独有媒体30/80/跨集拒绝/备份恢复/缺图；未知响应同请求重试、并发新编辑、组合输入暂停、冲突保留 |
| npm run check:protocol | PASS21/21及边界/类型 | 新DTO归协议目录；82方法文档导出，无放宽边界 |
| npm run build; build:editor-spike | PASS | vue-tsc/Electron tsc/Vite；正常App不引入新界面 |
| tools/card-draft-spike/smoke.ts | PASS7场景 | 真实Electron/preload/typed IPC/SQLite606：Ctrl+S、取消、确认/自动保存、进程重开、立即输入Ctrl+S/关闭快照、写入故障/保留/重试、正式指针不变；errors/external=[] |
| tools/smoke-editor-v075.mjs | PASS18记录 | 原断言含11异步/3原生粘贴/独立30-80/安全/重开；errors/browserErrors/external=[]；1原生颜色限制探针不是新增PASS数 |
| tools/ci/core.test.mjs | PASS5/5 | 既有基础设施自检；只增加既有Windows质量内草稿UI步骤，无新增workflow |
| 新Windows/新SHA CI | NOT_RUN本地 / PENDING_NOT_OBSERVED | 推送后一次即时状态记录于回执；不能继承为新SHA通过 |
| Win10/11人工IME、物理断电、便携ASAR | NOT_RUN | 保持生产启用与发布门禁；本轮不合并/发布 |

开发中实际失败及修复：初版内部调用把扩展字段传给strict Scope（收敛为显式scope）；API DTO错误目录被原边界检查拒绝（移至protocol，不改检查）；新确认框依赖非响应式controller属性导致内容未刷新（shallowReactive修正）；native markdownUpdated有200ms原生debounce，初次UI断言过早看到旧clean（改为字段及耐久回执断言，并在实际保存/切换/关闭前读取公开snapshot，立即Ctrl+S与进程重开通过）。headless旧viewport外点击改固定1366×900，不用force或合成点击。最初ESM测试host改CJS启动，实际应用模块仍ESM。没有删除/skip/弱化断言。

S3.a本地开发验证DONE；S3整体/S3.b仍NOT_STARTED，后续自动继续。以上记录区分既有全量290与最后专项/界面重测，不把所有历史命令冒充最终源码全量重跑。

---

历史记录（当前状态以上节为准）：

# S2 开发准入审核账本（2026-10-23）

本轮为**用户授权阶段审核与纯文档交接**；未运行新代码测试。继承经核实的精确测试 SHA `0b8b96bf857b43e42087e7d621084326cffacbf1`：

| 检查 | 结论 | 来源/界限 |
| --- | --- | --- |
| GitHub Actions Run 39876037722 | PASS | completed/success，严格对应测试 SHA `0b8b96bf857b43e42087e7d621084326cffacbf1` |
| scope / Ubuntu quality / Windows quality / pr-gate | PASS | 四 Job completed/success |
| Windows 表格 57 / 原生 A-B 拖拽 / 全编辑器鼠标拖拽 | PASS | Windows Job 120161827790；Artifact 12468398489；旧原生竞态负向 FAIL 控制保留 |
| 系统剪贴板 PNG、可信 Ctrl+V、图片独立30/80及重开 | PASS | Windows 平台集成日志 |
| 受控离线本地字体/公式/图片及编辑器回归 | PASS | Windows 平台集成日志；不等于物理拔网线或便携包 |
| 真实 Win10/11 中文输入法 / 真人手势 / 最终 ASAR | NOT_RUN | 真实使用及发布验收仍待补证，禁止标 PASS |
| pr-trust 所有者审核 | BLOCKED | 当前提交相关可信门禁 failure / 需要所有者审核；不同于代码质量结果 |
| S2 开发准入 | DONE | 用户明确授权，批准开展 S3.a 业务开发；不代表生产启用 |
| S3.a 代码实现 | NOT_RUN | 仅阶段记录更新，无业务代码/功能测试 |

测试门禁未降低；开发与真实用户数据启用门禁重新分开。本轮文档提交后的新 SHA 须以其自身 PR check 状态核实，不宣称它重新跑过旧 Windows 验证。

---

历史测试账本：

# 当前测试账本：S2 原生组件优先（2026-10-23，Asia/Shanghai）

被测父c892378c094080c537e1017430b1957f75a60e4f+本轮工作树；Linux Node24.19.0/Electron44.7.2/Chrome152.0.7977.149。源码/原生包hash和原始结果见S2-ADMISSION-EVIDENCE.json.nativePriority。

| 项目 | 结果 | 环境/证据与限制 |
| --- | --- | --- |
| 原Windows Job119934026750及Artifact12440650734 | PASS读取；原整体FAIL | Artifact原始hash已核；57/完整editor含11、系统Clipboard/30-80重开、离线PASS，行拖缺drop，quality/pr-gate FAIL；不是新图片故障 |
| 原生Crepe A / 当前公开扩展 B | PASS / PASS Linux | 同7.22.3/表格/官方主题/host/1100×720/DPR1/鼠标函数，reload隔离；可信行列dragstart/drop与完整重排，DOM A重建/B保持 |
| 完整编辑器鼠标路径 | PASS Linux | 原内容顺序/drop/保存断言保留，新加最终落点已被接纳dragover等待，非固定延时/合成事件/内部move |
| 原生旧事务竞态 | FAIL exit1（预期负向控制） | reproduce-table-race.mjs仍Applying a mismatched transaction，原生失败不作为生产通过前置；原点击保护保留 |
| npm run build；build:editor-spike | PASS | 最终格式化源码、类型/应用/独立入口构建，原CSP与同源资源保留 |
| check-table-interactions.mjs | PASS57/57 | 原19×3及DOM身份断言保留，生产表格扩展无新增补丁 |
| smoke-editor-v075.mjs | PASS18记录 | 原完整断言含11异步、30-80/存储重开/冲突/销毁/undo等保留；新增原生粘贴3项；errors/browserErrors/external为空 |
| 新原生普通粘贴 | PASS3/3 | 纯文本Markdown加粗/列表、代码块字面HTML文本、危险纯文本拒绝不改正文；原生结果重建一致 |
| node tests/editor-v075.test.ts | PASS6/6 | 保存/安全/编码相关单测，未重复无关业务全套 |
| launcher --verify-launcher | PASS Linux | 原失败保存/重试/进程重开、原生A/B、完整鼠标、系统Clipboard两图30-80、受控离线均通过，产品errors/browserErrors/external为空 |
| 夹具开发失败 | FAIL保留、最终已纠正 | capture/microtask过早读defaultPrevented、分数坐标、未加载官方CSS、销毁悬浮原生插件后的dropIndicatorState错误；改成bubble观测/整数落点/官方CSS/页面reload隔离；未吞异常。新窗口隔离尝试未完成，已撤除，最终无新窗口基础设施 |
| 新SHA Windows A/B/完整鼠标/新原生粘贴 | NOT_RUN本地 | 原quality既有editor及launcher入口自动执行，不建新workflow，必须读新SHA真CI |
| Win10/11原生中文IME及人工清单 | NOT_RUN | S2仍BLOCKED，不进入S3，不以Linux或Runner伪报人工验收 |

本轮继承原精确SHA有效的无关273/协议21/流水线证据；没有无依据重跑全部。ImageBlock与官方upload已按锁定源码评估，未正式接入，不承诺原生caption/resize已满足现有协议。提交后只读一次即时CI，结束本轮。

---

历史记录（当前状态以上节为准）：

# 当前测试账本：S2 系统操作自动化与准入（2026-10-22，Asia/Shanghai）

被测父e73f9e46ae62ce11c4d859a6bbeeb3e4b2a5ce68+当前工作树；Linux Node24.19.0/Electron44.7.2，完整证据与源码hash见docs/v075/S2-ADMISSION-EVIDENCE.json。最终仅prettier格式化新脚本，无语义改动；报告内保留执行时原hash，证据另记提交源hash。

| 验证 | 结果 | 范围与限制 |
| --- | --- | --- |
| 父SHA真实CI/Windows Artifact | PASS | Run39796684980最终双平台quality/pr-gate/scope success，Windows57/完整editor含11/launcher PASS；pr-trust failure39796682060 |
| 旧公开NodeView控制 | FAIL（预期控制，保留） | CellSelection装饰更新重建DOM；新增身份断言稳定报TABLE_REGRESSION，非mismatched transaction复发 |
| npm run build → build:editor-spike | PASS | 当前最终生产补丁，类型及原应用/独立入口构建 |
| check-table-interactions.mjs | PASS57/57 | 原19×3不删，另加CellSelection/TextSelection后表格DOM保持同一实例断言 |
| smoke-editor-v075.mjs | PASS | 完整17记录含11异步，原30/80/媒体/保存/重开等断言保留；errors/browserErrors/external为空 |
| manual-acceptance.mjs --verify-launcher | PASS Linux | 原失败保存保留/重试/进程重开自检；三项平台检查PASS，真实IME NOT_RUN，未填写human结果 |
| system-clipboard-png | PASS Linux | 实际系统Clipboard API未替换read，2次可信Ctrl+V、真实IPC/PNG/独立30-80、保存重开；不是Windows截图工具人工验收 |
| table-mouse-drag | PASS Linux | 可信行列dragstart/drop、完整顺序与保存后重开；无内部move命令或注入drag事件 |
| 拖拽夹具失败 | FAIL保留，最终修正 | 初次dragTo无dragstart，后续列拖有dragstart/指示线但无drop；等待指示线后重新命中已移动预览层再释放，原生行列drop和顺序PASS；非延长等待/吞错/重跑碰运气 |
| offline-local-resources | PASS Linux | 新profile，受控HTTP200→ERR_INTERNET_DISCONNECTED，KaTeX字体/公式/两图与完整JSON重开；navigator.onLine仍true，未伪造OS脱网 |
| 业务273/协议21 | PASS（同任务恢复前日志） | /tmp/gank-close-business.log、gank-close-protocol.log；恢复后未无依据重跑，不冒称新SHA全量验证 |
| 新SHA Windows系统检查 | NOT_RUN本地 | 原quality现有launcher步骤会执行；新结果必须从对应SHA Artifact读取 |
| 真实Win10/11 OS IME/截图工具/人工拖拽/物理脱网 | NOT_RUN | Runner自动化不填人工PASS；S2仍BLOCKED，不进入S3 |
| 正式Draft / Base64 / 最终便携ASAR | NOT_RUN | 分别属于S3 / S6 / S9后续实施或验收；不以POC快照冒充 |

不新建工作流、不减门禁、不更换技术方案；本轮不等待新CI。若任何平台检查失败，原launcher exit1保留并阻断quality。

---

历史记录（当前状态以上节为准）：

# 当前测试账本：异步图片bookmark目标恢复（2026-10-22，Asia/Shanghai）

被测da4dca3a4c2fcc64d77fe3c9288fe308ba7aab28+本轮4份实现/测试工作树；Linux Node24.19.0/Electron44.7.2。S2-ASYNC-IMAGE-VALIDATION.json含四文件hash/Windows旧失败/旧adapter对照/最终结果。

| 验证 | 实际结果 | 范围/限制 |
| --- | --- | --- |
| 基线HEAD/真实CI/Artifact12430638209 | PASS读取；旧Windows FAIL | Run39789987983 Ubuntu success，Windows/pr-gate fail，latest pr-trust failure39790212181；PNG和stage成功、MEDIA_INSERTION_MOVED_RETRY、无节点/assets。旧记录未拆正文/选区分支 |
| 精确旧adapter回归敏感性 | FAIL（必须保留的控制） | 临时使用git HEAD原adapter及新fixture，正文不改、仅选区2→4，报MEDIA_INSERTION_MOVED_RETRY；此前完整图片断言通过。测试后恢复修复源码并核字节相同 |
| 新异步目标专项 | PASS11/11 | 纯选区原目标、失焦不抢焦点、原范围替换、真编辑/编辑撤销/目标替换拒绝、批次冲突无部分写、忙碌重试/两引用30-80/重开、销毁、切换、双实例。真实媒体Asset，控制staging Promise；不是系统剪贴板人工验收 |
| 完整editor smoke | PASS17记录 | 原15PASS+原生颜色限制探针+11专项汇总；原首次真实paste→IPC→decode/store、30/80、保存/销毁重建/进程重开、数学/颜色/安全断言保留；errors/browserErrors/external[] |
| 原表格专项 | PASS57/57 | 固定3×19，原断言不改、不禁表格 |
| npm run ci:quality | PASS退出0 | 业务273（含editor6）、协议21、基础设施5、UnicodeZIP1、边界/类型/78导出、Vue/Electron/Vite构建；最终完整quality重跑通过 |
| build:editor-spike | PASS | 在最终普通build之后单独构建；原Windows质量入口无需更改 |
| launcher --verify-launcher | PASS Linux | 失败保存原文保留/重试/真正关闭重启进程与全文一致；合成工具自检 |
| 新夹具开发失败 | FAIL保留原因，最终修正 | 首次全img加载断言误含无src的ProseMirror-separator；现按现有data-gank-placement核2张真实图自然宽度/完整JSON/30-80。TS长度窄化/DOM类型问题修正后最终quality PASS，未删旧断言 |
| Windows新SHA验证 | NOT_RUN本地，待既有CI | 新11专项已在现有完整smoke内，Windows57/editor/launcher仍强制。Linux不能代替Windows恢复 |
| 全pipeline/默认Electron/fullASAR另重跑 | NOT_RUN本轮 | 无流程/生产页面/依赖更改；既有CI负责全门禁，未把继承结果说成本轮新跑 |
| 真实中文OS IME/系统剪贴板/人工拖拽 | NOT_RUN | S2总Gate仍BLOCKED，不进入S3 |

实现使用公开SelectionBookmark/Plugin状态/当前state事务；不接收跨正文编辑的映射，不删除状态保护、不固定延时、不吞错误。首次PNG仍必须原粘贴路径产生。保存原分支、核新SHA/一次即时CI后退出，不等待。

---

历史账本（当前状态以上节为准）：

# 当前测试账本：Windows PNG粘贴失败分段诊断（2026-10-22，Asia/Shanghai）

受测41a2d89cae627d4ea001204f6b9252d967c2c57a+两份验证工作树，Linux Node24.19.0；Windows原Artifact是Node24.22.1。根因UNCONFIRMED；本轮交付诊断，不虚报业务修复。小结/原报告/实现hash：docs/v075/S2-WINDOWS-PASTE-DIAGNOSTICS.json。

| 验证 | 实际结果 | 范围与限制 |
| --- | --- | --- |
| 旧精确SHA远端 | Ubuntu PASS，Windows/pr-gate FAIL，trust FAIL | Run39785588369及commit status真实读取；Windows表格57 PASS，完整editor FAIL、启动自检NOT_RUN |
| Windows原日志/Artifact12428893855 | PASS（读取）；粘贴FAIL | img waitFor30秒超时/errors[]/external[]；缺clipboard/stage/alert/DOM，HTML未上传。不能归因测试时序或平台 |
| npm run build；build:editor-spike | PASS | Vue/TS/Electron/独立入口构建，未改依赖/协议/业务模块 |
| 完整editor smoke（本轮Linux） | PASS16记录 | 15PASS+原生颜色限制探针，pageerror/browserErrors/external[]；原真实paste/IPC资源/30-80/保存重建/进程重开/公式安全等断言保留并增强链路断言 |
| 分段观测（Linux正常） | PASS | PNG事件观察且prevented，mock installed/read1/getType image/png，stage resolved返回Asset，app-media HTTP200；不是Windows修复证据 |
| 故意getType故障诊断 | 预期FAIL；诊断校验PASS | 单次stdin临时副本故意抛S2_CLIPBOARD_PROBE_FAILURE，原30秒超时且exit1；stage rejected/原错误/alert/空Asset空图片与HTML保留，源码未加开关；未将故意失败计为粘贴PASS |
| 57表格专项 | PASS57/57 Linux | 固定3×19，无删/skip/放宽；Windows57仅继承旧SHA实际PASS，新SHA仍待CI |
| Node编辑器测试 | PASS6/6 | node --test --experimental-strip-types tests/editor-v075.test.ts |
| 启动恢复工具自检 | PASS Linux | 失败内容保留/重试/实际进程重开，合成工具自检不等于人工操作 |
| 全业务273/协议21/full pipeline另重跑 | NOT_RUN本轮 | 旧精确SHA基础质量已通过，业务/API/流水线未改；本轮必要类型构建已跑，不冒充全量重跑 |
| 新SHA Windows专项 | NOT_RUN本地，待CI | 已接入原quality.mjs流程完全保留，无新增/重写workflow；下一次按新完整SHA实际结果判定 |
| 真实中文OS IME/系统剪贴板/人工拖拽 | NOT_RUN | 原合成paste不改写成人工验收；S2 BLOCKED，不进入S3 |

新CI若本次未复现也不能将纯诊断改动写成已确认根因修复。失败继续读pasteDiagnostics/main日志/HTML后定向最小修，不能延长等待或解除插入位置保护。提交后一次即时CI写PR回执退出。

---

历史账本（当前状态以上节为准）：

# 当前测试账本：S2最终验收工具与字体修复（2026-10-22，Asia/Shanghai）

受测326572b6e46982ac74223547874956ee7f967a28+本轮测试工具/独立构建工作树，Linux Node24.19.0/Electron44.7.2；格式化后仅空白变更，node --check通过。小结及hash见docs/v075/S2-ACCEPTANCE-CHECKPOINT.json，不重复生成大证据包。

| 项目 | 实际结果 | 范围/限制 |
| --- | --- | --- |
| 当前基线远端 | PASS质量；可信FAIL | Run39776290661 Ubuntu119816032219、Windows119816032326、pr-gate119817726034和scope成功；pr-trust failure→39776475352，真实owner exact SHA review required |
| 当前环境 | Linux；Windows NOT_RUN | 无pwsh/wine/powershell.exe/cmd.exe；不能执行Windows、真实系统IME/剪贴板/拖拽验收 |
| npm run build / build:editor-spike | PASS | TypeScript/Vue/Electron及独立页面构建，源码/依赖协议不改 |
| 初次人工工具自检 | FAIL（保留原因） | 非焦点h1 locator.press未把Ctrl+S送入编辑区域；修正为ProseMirror.focus再键盘，未改保存代码。日志同时揭露CSP阻止内联data:font |
| 字体修复 | PASS Linux资源范围 | 仅独立vite assetsInlineLimit:0，40本地字体，CSS内data:font为0；CSP不变，自检4次capture failedFonts均[]、browserErrors[] |
| node tools/editor-spike/manual-acceptance.mjs --verify-launcher | PASS | 原页面真实Electron，隔离目录；快照/注入保存失败原文保留/重试/关闭进程再开全文一致；pageerror/browserErrors/external[]。输入是合成自检，不是人工验收 |
| node tools/editor-spike/check-table-interactions.mjs | PASS57/57 | 本轮因字体/布局产物变化重新跑固定3×19，errors[]，没有删除/放宽断言 |
| node tools/smoke-editor-v075.mjs | PASS | 本轮16记录=15PASS+原生颜色限制探针、errors/external[]，已有媒体30/80/重开/公式/保存失败与安全断言保留；失败HTML路径使用专用dir以兼容Windows |
| 业务273/协议21/默认Electron4+5/全pipeline | NOT_RUN本轮，继承有效基线 | 上轮精确基线CI已通过；只改测试工具/构建资源输出，没有重复全套或冒充本轮运行 |
| Windows57及完整editor smoke | NOT_RUN | Linux结果不代替；原Windowsquality不包含这两个编辑器专项 |
| 真实IME/系统剪贴板/拖拽/Windows脱网/ASAR | NOT_RUN | 清单见S2-WINDOWS-ACCEPTANCE；Win10/11分别记录；Base64交换S6仍待做 |
| 新提交CI | 提交内NOT_RUN | 只收集一次精确新SHA初始状态写原PR回执，不等待 |

结论：S2/T05–T08总Gate BLOCKED，已提供可运行人工入口，未进入S3。不改业务编辑器、不换技术方案、不改可信/发布/保护规则。

---

历史账本（当前状态以上节为准）：

# 当前测试账本：S2/T05表格当前意图扩展（2026-10-22）

父SHA 4aebc2682c9e8b46c57bf311e9479432e9d3004a+本轮6份实现/验证工作树，Linux x64/Node24.19.0/npm11.9.0/Electron44.7.2。指纹e1b078dc5a5a4c52ecf6577f22b55ed29e39cdc5a55f3a393011a1f3cd0c777b；UI测试后仅补MIT声明，最终类型/Node6重验，逻辑未变。完整记录docs/v075/evidence/S2-TABLE-CURRENT-STATE，不以旧/未运行结果冒充本轮。

| 验证 | 实际结果 | 范围/限制 |
| --- | --- | --- |
| 恢复基线真实CI | PASS质量；可信FAIL | 精确4aebc268… Run39763577036 Ubuntu/Windows/pr-gate/scope success；latest pr-trust failure→39763767234；合并门禁未全通过，用户授权局部S2修复 |
| Windows冷启动收尾 | PASS，故障DONE | 真D:\a\_temp源码外安装13962.7299ms，normal-install.status PASS且该Windows quality成功；不重复C/D，不改已验证测试 |
| npm stable查询/环境 | PASS | crepe与kit latest均7.22.3，版本/lock未改；npm rebuild electron恢复本地测试二进制，无新增依赖 |
| 原生最小复现 | FAIL（真实控制） | node tools/editor-spike/reproduce-table-race.mjs exit1，Applying a mismatched transaction；仅原生Crepe默认配置，无新扩展，原复现/旧失败文件不改 |
| 新表格公开扩展专项 | PASS57/57 | node tools/editor-spike/check-table-interactions.mjs；19固定用例x3，各轮都必须通过。输入/新选择同步发生在click之后、回调之前，非等待后输入；errors[]。RAF/CellSelection原20ms、header、最新点击、删除/替换/销毁、行列/对齐/完整JSON重建 |
| T05自动化范围 | PASS；整体BLOCKED | 标题/列表/表格合成中文长文undo/redo、Tab/ShiftTab真实键盘目标通过；真实OS IME/光标/Win编辑器NOT_RUN，不能记T05整体PASS |
| T06本轮组件路径 | PASS（限定） | 同asset独立placement30/80，平台clipboard.read边界注入，真实media.stage IPC/解码/落盘、保存/销毁重建/进程重启PASS；系统剪贴板/Base64 NOT_RUN |
| T07本轮组件路径 | PASS（限定） | 数学编辑/颜色/格式/图片编码、表格Markdown及重建完整JSON一致，失败保存/显式重试PASS；正式Draft/ContentVersion接线未实现，不冒充S3 |
| T08本轮组件路径 | PASS Linux受测范围 | 多实例/销毁、六类恶意Markdown拒绝、errors[]/external[]；Win脱网/ASAR编辑器资源NOT_RUN |
| 完整editor smoke | PASS（16记录） | node tools/smoke-editor-v075.mjs exit0；15 PASS+1原生颜色限制探针，不把原生无color mark标为支持；保留全部pageerror断言，新增Tab目标断言 |
| Node editor6 | PASS6/6 | node --test --experimental-strip-types tests/editor-v075.test.ts，保存串行/冲突/非法正文/组合输入保护和媒体编码；含于273 |
| npm run ci:quality | PASS | 业务273/协议21/基础设施5/UnicodeZIP1/边界/类型/78定义导出/Vue-Electron-Vite构建；最终vue-tsc --noEmit亦通过 |
| 原默认Electron | PASS4+5 | node tools/smoke-v060.mjs和smoke-system-v060.mjs，完成标记及数量有效；均隔离临时数据目录 |
| 新夹具开发失败 | FAIL记录保留，原因已更正 | pointerdown-only非实际鼠标绑定；setAlign正文单格不是列头对齐；selectRow/Col已dispatch却Boolean(void)=false；跨schema Node.eq身份不等但JSON无差异。现核真实事件/选择状态/完整JSON，未弱化旧测试 |
| 流水线与全ASAR本地重跑 | NOT_RUN（本轮） | 源码仅隔离编辑器，工具/工作流/依赖没变，继承父精确SHA双平台pipeline182/原LinuxASAR成功；本轮没有冒称重跑 |
| Windows编辑器/实机/真实IME/系统剪贴板/Base64/真实拖拽 | NOT_RUN | 原拖拽柄和行列命令存在，不等于拖拽手势验收。Runner质量绿不是Win10/11人工验收 |
| 新SHA CI | NOT_RUN（提交内） | 保存后一次即时Run/check/status写原PR描述和最终回执；不等CI；当前workflow不自动跑新57或editor spike，不能外推 |

结论：带公开NodeView扩展的候选消除了本轮自动化交错中的旧事务/旧选择覆盖，未修改上游或提高延时，没有禁用表格。继续候选验证，暂不安装备选。**S2/T05仍BLOCKED，S3不进入**，FAST/FULL分级实施暂缓，媒体/保存/协议/生产数据库保护不变。

---

历史测试账本，以本节为准。

# 当前测试账本：独立D盘冷启动修复（2026-10-22，Asia/Shanghai）

被测a8b4d61ea43093d86f38a28659351ef16568fffc+本轮4份工具/测试工作树；Linux x64/Node24.19.0/npm11.9.0。实现指纹7da3fc0da72851510d259df66be902d796fd7c9204c7e1aa6c62f74e95ced9c9，逐文件hash、完整输出/原Windows Artifact见docs/v075/evidence/S2-COLD-ROOT-FIX。FAST/FULL本轮仅设计，没有实施分级。

| 验证 | 真实结果 | 证据与限制 |
| --- | --- | --- |
| 原HEAD/CI/status真实核对 | FAIL（继承） | 精确a8b4d61…；Run39759121731 Ubuntu success、Windows119758723844 test:pipeline failure、pr-gate failure；latest pr-trust failure→39759353663；用户授权继续修复 |
| 原Windows Artifact12417536862 | PASS（读证据）；原安装FAIL | 同Job C120045.7208ms ETIMEDOUT/null/SIGTERM、118802.5741ms成功；D10420.721/10469.988ms成功，env/hash/cache一致；旧D位于源码子树，不作为隔离证明；原ZIP无损base64+hash保留，不再重复四次调查 |
| 顶层npm ci预热 | PASS | include-dev/ignore-scripts本地准备381包约6秒，manifest/lock不变；生产正常npm ci未改ignore-scripts策略 |
| 隔离/诊断专项 | PASS20/20 | 新6项真实目录/清理/祖先NM/源码别名/ESM-CJS污染拒绝，加原14项process/comparison；Windows路径选择单测不是Windows实际安装 |
| 正常npm run test:pipeline | PASS182/182 | 捕获完整最终计数、无skip/cancel；保留原176全部检查语义并新增6；每日不执行重型4次实验，实验代码保留可显式运行 |
| 正常完整锁离线冷安装 | PASS（Linux） | 1次6001.938141ms；完整项目lock、原ci参数/120000ms/4MiB、严格error无/signal无/status0；中文/空格/物理无node_modules |
| 安装前真实隔离 | PASS（Linux） | /tmp源码外，祖先无node_modules；ESM ERR_MODULE_NOT_FOUND、CJS MODULE_NOT_FOUND，三种batch入口实际缺yaml非0，不仅检查existsSync；前置证明缺失时不执行正向安装 |
| 安装后完整校验 | PASS（Linux） | package/lock hash不变、yaml2.9.1、npm timing；ESM/CJS均落本fixture node_modules，quality/security/package空plan启动全部0；不冒充模式完整业务验收 |
| 原负向/独立worktree/失败阻断 | PASS（含于182） | 缺yaml、错误SHA/版本、Git detached worktree自己安装小yaml夹具、原历史身份/清理断言、坏lock EUSAGE非0不进入batch；不以小夹具替代正向全锁安装 |
| npm run ci:quality | PASS | 基础设施5/ZIP1/业务273/协议21，边界/类型/78方法导出、Vue/Electron/Vite build；quality.json全部step0 |
| 四次C/D安装专项 | NOT_RUN（本轮） | 已有针对证据足够，未重跑；显式入口experiments/directory-comparison.test.mjs仅语法检查及原调度合成单测，旧源码内B不是隔离入口 |
| 新Windows独立D路径及质量恢复 | NOT_RUN（本地） | 待新SHA的Windows CI，当前没有Windows环境。旧D10.4秒仅估算依据，不宣称新目录已测或整套CI已恢复 |
| Linux ASAR/Electron全套重新执行 | NOT_RUN（本轮） | 业务/构建未改，继承原Run Ubuntu package-check成功；本轮没有把旧证据写成重跑。正常冷启动测试不等于Electron功能验收 |
| FAST/FULL设计 | PASS（文档完整性核对） | CI-QUALITY-TIERS.md涵盖37业务文件/21每日pipeline文件、13/107 ASAR、Windows专项、完整SHA/唯一FULL gate/触发与授权；实施NOT_STARTED |
| 保护规则只读核对 | PASS（可见快照）；完整有效枚举BLOCKED | develop ruleset25463281有strict pr-gate/pr-trust source15368；main25463521未列required checks，classic branch checks为空；rules/branches接口HTTP400拒绝，未改规则，不冒称两分支配置相同 |
| 新SHA远端CI | NOT_RUN（提交内） | 保存后只读一次初始Run/check/status，实际SHA/Run/即时结果写原PR描述，不等CI |
| S2/T05及未验证项 | BLOCKED/FAIL（继承） | 原生Crepe竞态、最小复现/失败/pageerror未改，真实IME/系统剪贴板/Base64/Win编辑器实机NOT_RUN；不进入S3 |

Windows原4次安装合计259.739秒；改成独立D正常1次若同旧D约10.5秒，安装部分预计减少约249秒，但新路径尚待WindowsCI实测，本地6.002秒不能代替。没有复制node_modules、删依赖、取消离线/超时、接受null、削弱断言或改workflow/保护/发布/业务。

---

历史账本，当前状态以上节为准。

# 当前测试账本：同机目录对照（2026-10-22，Asia/Shanghai）

被测e3051b0d95c418c348d3ac725c98e8c8ffacd9f2+本轮5份工具/测试工作树；Linux x64、Node24.19.0/npm11.9.0，非Windows Node24.21.0/npm11.19.0。实现指纹91675ee0bfc0a32ec5e8ade79066d9722be2f2d2a3be3ed6f04800f3a144fad2；逐文件hash/完整旧正向诊断/本地输出见docs/v075/evidence/S2-DIRECTORY-COMPARISON。

| 验证 | 真实结果 | 限制与证据 |
| --- | --- | --- |
| 原HEAD/质量/可信读取 | FAIL | 精确e3051b0…；质量39749260681/Windows119725473546失败，最新有效pr-trust failure→39749485110；本轮授权继续调查，不作为门禁通过 |
| 原Artifact正向诊断 | FAIL；根因BLOCKED | Artifact12413335363/child-t3NvEM；C临时目录120023.6397ms ETIMEDOUT/SIGTERM/null；最后reifyNode Crepe112667ms；保留4份原字节与hash，没有timing JSON，未把缺yaml/坏lock负向混淆 |
| 一次顶层npm ci预热 | PASS | npm11.9安装381包13秒；完整lock未变，仅本地准备 |
| 新专项 | PASS14/14 | 顺序/最多4次/失败仍B/反向失败不能抹除/阈值/实际根非C-D/环境hash一致与逐子进程日志保留；含原5项真实timeout、ENOBUFS、null拒绝与完整诊断测试。Windows路径是合成单测，不是真实Windows |
| npm run test:pipeline | PASS（退出0） | 两次本地执行，最终执行含当前14项专项；捕获的spec日志缺总计，未把预期176推算为实际观测。正向及负向子进程均有持久结果 |
| 其余pipeline文件明确TAP | PASS168/168 | 19文件（排除已实际执行的bootstrap.test.mjs）；无skip/cancel，退出0，不另触发完整锁安装 |
| 最终Linux真实A/B | PASS（仅Linux） | A4283.317817ms/B4195.231366ms，均status0/error无/signal无，实际根/与/，不是C-D；相同完整package/lock与环境hash/cache，physical no node_modules；两次安装无反向；全部manifest/lock/yaml2.9.1/timing/三模式PASS；完整表见LINUX-DIRECTORY-COMPARISON.md/json |
| 本地初始实现验证 | PASS（历史于本轮） | A5519.638ms/B5234.429ms；随后补packageCount和实际盘符解析单测后再验证最终代码，共两次各2安装，非无依据重跑Windows |
| npm run ci:quality | PASS | 业务273/协议21/基础设施5/ZIP1，边界/类型/78方法导出及Vue/Electron/Vite build，quality.json各step退出0；不含新编辑器专项 |
| 120秒/4MiB/完整断言及旧控制 | PASS（保留） | 完整锁ci离线include-dev/ignore-scripts；不复用node_modules、不删依赖、不装小yaml代替全锁；缺yaml、坏lock、独立worktree与全部模式保留；A失败继续B后统一失败 |
| Windows同Job目录对照 | NOT_RUN（本地） | 待新SHA现有Windows CI实际执行；不能用Linux或旧WindowsArtifact替代，慢的底层原因未确认，未调timeout/目录默认生产行为 |
| 新SHA远端CI | NOT_RUN（提交内） | 保存后仅取一次即时Run/status，原PR描述和最终回执记录真实状态，不等待/不轮询 |
| S2/T05及未验证编辑器项 | BLOCKED / NOT_RUN（继承） | 原生Crepe竞态FAIL、最小复现/失败日志/pageerror均不改；真实IME/系统剪贴板/Base64/Win实机未执行；不进入S3 |

本轮完成的是有界对照实现和Linux实现验证；未宣称Windows恢复、未确定目录相关性，更未宣称物理磁盘/AV/平台原因。S1有效基线继承，S2/T05继续BLOCKED。

---

以下历史账本状态以上节为准。

# 当前测试账本：Windows bootstrap CI定向调查（2026-10-22，Asia/Shanghai）

被测为46e404a8a7224946854ae7be3c8a18fa062d82d1 + 本轮3份工具/测试工作树，Linux x64/Node24.19.0。3文件指纹 **8b5d6ec7b62e257dd7f32422377a20502f274ed2342784798b5175c0ae7532ad**；逐文件hash、npm日志及输出见evidence/S2-WINDOWS-BOOTSTRAP-TEST-OUTPUT.txt。原Windows为Node24.21.0/npm11.19.0，不能混称本地相同环境。

| 验证 | 真实结果 | 证据/限制 |
| --- | --- | --- |
| 原PR/Run/Job真实读取 | FAIL（已确认） | 精确SHA46e404a8a7224946854ae7be3c8a18fa062d82d1；Run39745482071 Ubuntu success、Windows119712802877 test:pipeline失败、pr-gate失败；pr-trust最新failure→39745800696 |
| 原Windows失败定位 | FAIL；底层BLOCKED | 顶层npm ci25秒成功，嵌套全锁offline ci120015.5683ms、status=null；旧error/signal/完整输出/npm日志缺失，不能直接判定缓存或超时预算。原日志保存于ORIGINAL-JOB.txt |
| 本地初始离线缓存不足对照 | FAIL（预热前） | Linux npm11.9与11.19均<1秒ENOTCACHED，无子进程error/signal，退出1；不是Windows原故障复现 |
| 单次npm11.19在线ci预热 | PASS | 381包约12秒；仅本地测试准备，不改项目依赖/lock，不触发旧CI重跑 |
| npm11.19隔离真实offline ci | PASS | 同--include=dev/--ignore-scripts/--offline/--no-audit/--no-fund、生产/omit-dev默认、Unicode/空格路径；4737.976ms，status0/error无/signal无；保留npm timing/debug，未复用node_modules |
| npm11.19全量npm run test:pipeline | PASS167/167 | 原162+新增5，无skip/cancel；包含真实冷安装4906.314ms、锁hash/yaml版本不变、三模式启动、独立worktree、缺yaml/损坏lock拒绝；缺yaml和EUSAGE不是此故障 |
| 新诊断专项5项（含于167） | PASS5/5 | stdout/stderr/日志不随源清理消失、不序列化环境、非0拒绝；真实ETIMEDOUT保留null/error/signal、真实ENOBUFS区分、预算不允许取消/扩大、证据独立；均不接受null成功 |
| npm run ci:quality | PASS | 业务273/273、协议21/21、基础设施5/5、UnicodeZIP1/1、边界/类型/78定义导出、Vue/Electron/Vite build |
| 原120000ms与4MiB及全部断言 | PASS（保留/加强） | 无workflow/依赖/审批/发布变更；冷启动依旧物理无node_modules，仍安装完整项目锁，不换小fixture；正向多检查无error/无signal/status0 |
| 本轮新Windows诊断/恢复结论 | NOT_RUN/BLOCKED | 当前Linux不能替代Windows；原始error/signal缺失，**Windows底层根因仍未知，仅修复诊断丢失**。没有证据调整超时，也没有宣称WindowsCI已恢复 |
| S2/T05及其它未验证项 | FAIL / NOT_RUN（继承） | Crepe原生竞态、最小复现、失败日志/pageerror断言均未改；真实IME/剪贴板/Base64/Win编辑器实机保持未验证，不重跑也不顺带标PASS |
| 新SHA远端CI | NOT_RUN（提交内） | 保存后只读一次即时Run/status，实际SHA/状态写原PR描述和最终回执；不等待、不轮询 |

调试：最初独立探针使用不存在的npm路径，属于探针配置错误、未作故障原因证据；按原封装的CLI定位后执行上述真实对照。缓存缺失与预热成功都保存真实退出/耗时/npm日志。诊断测试中ETIMEDOUT/ENOBUFS是主动故障注入，不能冒充原Windows已观测error代码。bootstrap.test仅恢复了无关格式差异，原功能/断言未变。

阶段结论：本地诊断工具与回归通过；原Windows根因及恢复仍BLOCKED，需要下一提交的Windows证据。S1有效基线继承；S2/T05继续BLOCKED/FAIL，不能进入S3。以下为历史账本。

---

# 当前测试账本：S2（2026-10-22，Asia/Shanghai）

环境Linux x64 / Node24.19.0 / npm11.9.0 / Electron44.7.2；npm ci实际安装381包，随后将同版本两个候选移至devDependencies（版本不变）。被测为19ab62dfe806174060478ffdb05fe955bea223bd + 本轮工作树；不是宣称未来提交SHA预先已测。14份实现/依赖/测试文件指纹 **f0b8f3bf2d272e72b9eb18a9034084f0831828375fa9950d82de9bac9f25d4bb**；逐文件hash及输出见S2-TEST-OUTPUT.txt。

| 检查 | 真实结果 | 范围/限制 |
| --- | --- | --- |
| S1.c精确SHA前置门禁 | PASS | quality39726201464 Ubuntu/Windows/pr-gate/scope成功，最新有效pr-trust success→39730661706。S1自动化DONE；真实旧RC/断电/Win实机仍未验收 |
| 最终npm run ci:quality | PASS | 273/273（新增6+旧267），协议21/21，基础设施5/5、UnicodeZIP1/1、边界/类型/78定义导出、Vue/Electron/Vite构建 |
| Node S2六项（含于273） | PASS6/6 | placement双宽度/独立SQLite JSON、非法引用/缺资源、并发保存响应顺序、失败/冲突/销毁、无效文档阻断旧保存、组合输入暂停保存 |
| node tools/smoke-v060.mjs | PASS4/4 | 真实Electron默认604原有启动/集/错题/记忆复盘，完成标记有效 |
| node tools/smoke-system-v060.mjs | PASS5/5 | 原有文件图片/内容交换/604备份恢复/回收站/取消；不能替代新编辑器606草稿或单MD验证 |
| T05 | FAIL / NOT_RUN | 合成composition在标题/列表/表格长文逐字及undo/redo断言通过；但表格点击后即时输入触发原生库异步事务异常。真实中文OS IME/光标与Win10/11均NOT_RUN，不能称T05通过 |
| T06 | PASS（限定路径） | 平台clipboard.read边界注入合法PNG；真实media.stage IPC/解码/文件与settings持久化；同asset不同placement经宽度UI30/80保存→销毁重建→进程重启一致、图片可读。系统剪贴板NOT_RUN；单.md Base64往返NOT_RUN |
| T07 | PASS（编码/fixture范围） | 标题/列表/表格/粗斜体、inline math原生tooltip编辑、block math CodeMirror编辑、颜色mark与安全链接、图片Markdown往返；隔离SQLite JSON测试。正式ContentVersion/Draft写API及单.md Base64往返NOT_RUN，不能等同S3发布 |
| T08 | PASS（Linux受测范围） / NOT_RUN | 无外部HTTP请求；本地KaTeX字体、受控app-media读取；六种恶意HTML/URL粘贴明确拒绝且正文不变；实例/销毁通过。Win10/11离线便携/ASAR编辑器入口NOT_RUN |
| 完整node tools/smoke-editor-v075.mjs | FAIL | 有一次完整成功及多次失败；失败保留pageerror断言，mismatched transaction，强化表格测试暴露；不能选择绿结果宣称通过 |
| 原生最小复现reproduce-table-race.mjs | FAIL（诊断exit1） | 默认Crepe、无GankSoft editor adapter；表格mousedown→下一帧前insertText→旧事务dispatch报错。稳定复现证实非仅本项目adapter问题，stack见S2-NATIVE-TABLE-RACE.json |
| 工具栏/增长/保存边界 | PASS（隔离） | focus内外显隐；编辑高度581.33→821.33px；500ms/显式Ctrl+S、失败保留/重试、单实例销毁与双实例隔离。未实现正式Draft持久恢复 |
| npm run build:editor-spike | PASS | 正常App bundle无编辑器；仅独立入口按需加载。1.1MB大chunk警告保留；不冒充S7性能验收 |
| 候选对照 | BLOCKED / NOT_RUN | 原生颜色不成mark，已受限适配；原生表格竞态未解。Vditor/Cherry仅官方资料对照，未安装/实测，不宣布最终选型 |
| 新完整SHA远端CI | NOT_RUN（提交内） | 保存后只取即时状态，真实SHA/Run写原PR描述/最终回执；不等、不轮询 |
| S1保留未验证项 | NOT_RUN/BLOCKED | 真实旧RC、Win10/11、真实断电/磁盘耗尽/ACL、Windows目录fsync/未知恢复锁；不自动操作真实库 |

调试记录：原始测试误计Crepe表格辅助空table（实际正文table.children一张），改查实际正文/两行；GFM长单元格会重排表格填充，改逐字DOM及完整undo/redo而非仅比较Markdown字符增量。旧测试未改。首次PNG fixture不能解码，被真实host拒绝，随后用@napi-rs/image生成合法PNG；Vue深ref导致structuredClone拒绝，验证页改shallowRef。真实无桌面剪贴板写后read无图，明确保留NOT_RUN并只在平台读取边界注入。表格异步竞态未修复，没有用等待、skip或吞错制造通过。

阶段结论：S1自动化DONE；S2 BLOCKED（明确FAIL存在），不具备S3准入。不对真实用户数据库做升级或新写入。以下历史账本不是本轮重跑。

---

# 当前测试账本：S1.c（2026-10-22，Asia/Shanghai）

环境Linux x64 / Node24.19.0 / npm11.9.0；同环境锁依赖不变。被测为f24c6b05e10e925a52a7ff57c62f300a40597d25加本轮12份实现/测试工作树，指纹 **8bab4d7db5666b02cbf6d091f0efacbe7bd68938e0958394a1faa34ddaa953f6**。逐文件SHA256和最终输出见docs/v075/evidence/S1C-TEST-OUTPUT.txt；不是声称提前测试未来提交SHA。

| 检查/命令 | 结果 | 实际范围与限制 |
| --- | --- | --- |
| 前序精确SHA门禁 | PASS | f24c6b05e10e925a52a7ff57c62f300a40597d25；quality39721268828 Ubuntu/Windows/scope/pr-gate成功；pr-trust success，target39723537044 |
| 最终npm run ci:quality | PASS | 267/267（新增30+全部旧237），协议21/21，基础设施5/5，UnicodeZIP1/1，边界/类型/78合同导出及Vue/Electron/Vite构建exit0，无skip/cancel |
| T02 no-op/指纹/来源 | PASS（合成Linux） | 604→606、两次no-op逻辑全表/媒体digest不变，独立副本同ID/版本/cycle/event；缺历史unknown/partial和原0–4/9.3/null不改；源库不被修复 |
| T02 同事务adapter/重开 | PASS | 原question.save/memory.submit与projection/watermark/receipt同commit，重放只一次；起始及逐卡投影中途故障均回滚旧写、新版本、回执和revision；旧事件原文逐条保留；重开/606再备份恢复/新epoch通过 |
| T03 新混合集 | PASS（合成Linux） | 一个全新deck保留旧kind元数据且三模式共存，原question/memory deck映射不变；编辑Draft/新版本独有图片30%字段无损606备份恢复并受控激活/协议读取。不是S2编辑器交互验收 |
| T04 模型回滚 | PASS8项 | DDL/逐卡/逐事件/commit前各一次异常及一次子进程exit43，WAL重开仍604原指纹，之后重跑606/no-op成功 |
| T04 协调中断 | PASS9项 | frozen/source-backed-up/model:card/event/before-commit/model-ready/prepared/pointer/committed各一次子进程exit47，恢复源或目标准确且再次恢复/重开一致；无两个合法活动写者 |
| T04 备份/闭包 | PASS | 604与606都实测还原；606当前/历史/作答/暂存/版本独有缺图（重算合法manifest后）拒绝；清单错schema、不可变约束缺失拒绝；已有目录文件保留 |
| T04 写屏障/路径错误 | PASS | 原协议/旧句柄冻结、外部SQLite写被reserved lock阻断、同进程/子进程争租约及活PID不可回收；epoch篡改拒绝；真实目标EEXIST、注入ENOSPC、提交后响应丢失、已提交目标丢失不回旧路径 |
| node tools/smoke-v060.mjs | PASS4/4 | 真实Electron启动/API、deck UI、错题揭示提交、记忆复盘，完成标记有效；默认604路径 |
| node tools/smoke-system-v060.mjs | PASS5/5 | 图片/对话框、二进制内容交换、604备份恢复/epoch、回收站/取消/操作日志；606证据另由专项提供 |
| 旧测试/协议/依赖/流水线保留 | PASS | 旧测试源码、registry/共享合同/前端、依赖/lock、.github/tools均无改动；未删/skip/弱化；仅新增S1.c专项 |
| 当前新提交远端CI | PENDING_NOT_OBSERVED（提交内） | 保存后只即时读取一次，真实SHA/Run/状态写原PR描述和最终回执，不等待/轮询 |
| 当前新SHA Windows/Ubuntu Runner/ASAR | NOT_RUN | 本地Linux不代替Runner；进入S2前按新完整SHA核实 |
| 本轮pipeline162项/完整本地ASAR | NOT_RUN | 流水线未改，继承S1.a pipeline证据及S1.b远端门禁；本轮基础设施5项实际重跑 |
| Win10/11实机、真实旧RC样本 | NOT_RUN | 没有用户私人DB；合成和隔离目录不可冒充实机或真实RC迁移 |
| 真实断电/磁盘耗尽/ACL、Windows目录fsync、恢复进程再崩溃 | NOT_RUN/BLOCKED | ENOSPC是注入，process.exit不是断电；未知recovery.lock保守阻断，不自动删锁。电源/目录迁移扩大验收归S8 |
| 生产真实库自动激活 | NOT_RUN（未接入） | 仅显式受控后端路径端到端验证；默认604，未自动迁移；整个S1未放行S2 |

调试：最初tsc指出3处nullable路径未缩窄，修正never函数声明后通过；新增30项最终全部PASS，旧237项保持PASS。未通过删测试、降低解码/审批门禁制造成功。604旧备份继续保留opaque附件字节的原语义；迁移604和606图片预检严格解码，所有604/606完整备份补齐引用闭包校验。

阶段结论：S1.c本地实现/验证DONE；T02–T04上述自动化范围PASS。当前完整SHA远端质量/可信仍待核，因此S1整体IN_PROGRESS，本轮不进入S2，也不宣称生产升级/全部存储故障场景已验收。以下为历史证据。

---

# 当前测试账本：S1.b（2026-10-22，Asia/Shanghai）

环境：Linux x64 / Node24.19.0 / npm11.9.0；依赖沿用S0同环境锁安装，package/lock自S1.a无变化。被测为d334d91a26478c2ea4e899126f172138da91ebfe + 本轮实现工作树；实现13文件规范JSON(path/sha256)指纹 **9ded731c398b2027f069801b3a5f6de5c0d2a319e053b1524b97676da8483006**，见S1B-TEST-OUTPUT.txt。不能把quality.json的基线SHA误当未来提交已测。

| 检查/命令 | 实际结果 | 范围/限制 |
| --- | --- | --- |
| 前序精确SHA GitHub质量/信任 | PASS | d334d91；39718272521的Windows/Linux/scope/pr-gate均success；pr-trust status=success，target39719132662 |
| 远端schema占用核对 | PASS | 全部已fetch origin分支仅图片恢复分支605，其余604；606未占用；生产未升级 |
| 最终npm run ci:quality | PASS | 237/237业务（旧227+新增10），协议21/21，基础设施5/5，UnicodeZIP1/1，协议边界/类型，78定义导出，Vue/Electron/Vite构建exit0 |
| 新增S1.b专项（含于237） | PASS10/10 | 原42表+sqlite_sequence逐行/媒体字节保留、3card/7version/5cycle/4event映射与unknown/raw9.3/空新分、pending/未知结构/源路径阻断、不可变/跨卡FK/事件唯一、单模式Draft CAS、混合同deck三类型与独立模式版本、旧token歧义/跨集隔离、DTO非法选项/分数拒绝、独立正误/0–100存储与索引、真实protocol只读/旧写路径回归、分页/revision/epoch/预算 |
| 摘要规模与预算 | PASS | 106卡，每卡3万字符正文；50条/页最大13497 bytes；没有正文/历史字段；遍历无重复/遗漏；606使用learning_cards_deck索引，不读版本document |
| 旧合同/门禁/依赖保留 | PASS | 原75个方法的全部JSON schema及envelope/semantics逐项相等；仅新增3个query。旧测试源码不改，无workflows/tools/pipeline/发布门禁/依赖改动 |
| node tools/smoke-v060.mjs | PASS4/4 | 真实Electron启动、deck UI、错题揭示提交、记忆复盘；完成标记有效 |
| node tools/smoke-system-v060.mjs | PASS5/5 | 图片解码/对话框、二进制内容交换、完整604备份恢复/epoch、回收站、取消及操作日志；不是606备份验证 |
| 当前提交GitHub CI | PENDING_NOT_OBSERVED（提交内） | 保存后即时读取并记精确SHA/Run/状态到PR描述及最终回执，不等CI |
| 当前提交Windows/Linux远端完整quality/ASAR | NOT_RUN | 本地不能替代Runner；下次按精确HEAD核实 |
| 本轮npm run test:pipeline | NOT_RUN | 流水线未改，继承S1.a的162/162证据；本轮ci:quality基础设施5项实际重跑 |
| Win10/11人工、真实旧RC用户库 | NOT_RUN | 仅合成隔离库，无私人数据 |
| S1.c幂等/中断回滚/重开/606备份和激活 | NOT_RUN | 未实现完整恢复协调/启动升级，stage副本不能作活动库；T02–T04及整个S1未通过 |

调试：首次新增9项为8/9，失败是测试把client的本地Zod校验误认作host错误码；改为向真实gateway传非法limit并精确断言VALIDATION_ERROR，未放宽任何断言/协议或旧测试。随后补独立新事件/索引专项，最终10项及全量237全部PASS，无skip/cancel/fail。当前实现测试后未改；后续只有执行文档和证据。

旧评分0–4/原自评9.3/空值、旧实际rating、原fault/evidence/schedule留存；新scoreTenths/rating保持null。没有启用新评分行为或重算排期。已验证模型约束和一次隔离构建，不把它当作S1.c幂等/故障/恢复验收。

审阅：AUDIT.md为旧infra任务的0.7.3/a0fb65d记录，不能替代S0实测基线；只继承仍有效证据。当前最终SHA从远端PR/head解析，提交不能包含自身SHA。

以下为历史测试账本，不冒充本轮重跑。

---

# 当前测试账本：S1.a（2026-10-22，Asia/Shanghai）

环境延续S0：Linux x64 / Node24.19.0 / npm11.9.0。被测基线为acf8556bf5691ce49d380cac93842f9804c065ac加本轮7份实现/fixture/版本文件工作树；不是声称已测试未来提交SHA。实现文件指纹：e166e3f25d85a17b7b9740be69e36e0900590d13a399f48bbd75f058c737fffc（规范JSON(path/sha256)列表见证据文件）。

| 检查/命令 | 真实结果 | 范围 |
| --- | --- | --- |
| S0远程HEAD/CI/继承证据核对 | PASS | acf8556；39715355519/39715352908 success；无源码前移，不重复S0全审计 |
| 冻结fixture的schemaHash | PASS | 355c28a533579ffed5ad3c007bb7406eabe3c0cbff0d63950446d89b8f81c0ad，与S0一致；42用户表+sqlite_sequence；全合成 |
| 最终npm run ci:quality | PASS | 基础设施5/5、UnicodeZIP1/1、业务227/227（旧202+新增25）、协议21/21、边界/类型、75定义导出、Vue/Electron/Vite构建全部exit0 |
| 25项S1.a专项 | PASS（含于227） | schema/marker/缺表、元数据只读、WAL恢复/重复制作、所有表行和媒体hash、原始空自评/缺快照、AUTOINCREMENT/重复行/大整数/BLOB、ID碰撞/空ID、缺历史/未绑定/会话图片、跨集/循环、坏JSON/FK/图片、并发变化、3故障点/重试、不覆盖目标/错误源路径/未结束事务、ZIP损坏、独立子进程exit37 |
| npm run test:pipeline | PASS162/162 | 原审批/门禁/RC/版本/便携回归保持；无工作流改动 |
| npm run version:check -- origin/develop | PASS | 0.7.5-rc.1高于0.7.4-rc.6，Tag/Release未占用；只改根版本，不改依赖 |
| node tools/smoke-v060.mjs | PASS4/4 | 真实Electron启动、deck、错题复盘、记忆复盘；完成标记有效 |
| node tools/smoke-system-v060.mjs | PASS5/5 | 图片对话框/解码、二进制内容交换、备份恢复/epoch、回收站、取消/操作日志；完成标记有效 |
| 最终diff/敏感信息/版本锁/原测试保留核验 | PASS | git diff --check、允许文件/敏感信息/锁版本/旧测试保留核验；不提交DB/图片/zip/构建产物 |
| 当前S1.a检查点GitHub CI | PENDING_NOT_OBSERVED（提交内） | 推进远端后即时查询，完整SHA/Run记最终回执和原PR描述；不等CI |
| Windows/Linux远程本轮完整quality/ASAR | NOT_RUN | 本地GUI不能替代Runner；后续按精确SHA核实 |
| Win10/Win11人工/真实旧RC用户库 | NOT_RUN | 无私人数据库；没有把合成fixture冒充真实RC样本 |
| S1.b/S1.c增量迁移、混合三模式模型/新typed API、迁移幂等/回滚 | NOT_RUN | 未实现；本轮只完成T02/T04前置，不宣称整个S1/T02–T04通过 |

调试记录：初次专项20/22，两个ID碰撞fixture同时破坏了旧回执引用，先被已有完整性检查拒绝。仅修正合成fixture的依赖引用以隔离碰撞缺陷，保留精确错误码断言；22/22通过。后续补源schema标签/空ID/会话媒体验证，最终新增25项并入227全部通过。最终源码无测试失败/跳过/取消；旧测试/断言未删除或放宽。

依赖沿用S0同环境的锁安装；本轮lock除两处根版本外与S0完全相同，不重新做无变化的安装/审计。前期check/quality结果只作调试过程；最后一次ci:quality对上面最终实现指纹完整执行。持久输出与各实现SHA256见docs/v075/evidence/S1A-TEST-OUTPUT.txt。

以下为S0历史测试记录，不冒充本轮重跑。

---

# TEST_REPORT

任务：GankSoft v0.7.5 S0 baseline and ADR
分支：feature/v075-unified-learning-workspace
基线：7970896c0306833e3b2f54a843f388d2e380618f

阶段 S0；日期2026-10-22（Asia/Shanghai）。被测应用源码/依赖为基线7970896c0306833e3b2f54a843f388d2e380618f；测试时工作树仅任务文档不同，不能声称提前测试了尚未产生的提交SHA。最终文档提交的应用tree/blob与此基线一致，提交前再核。

环境：Linux x64，Node24.19.0/npm11.9.0；锁定Vue3.5.44、Electron44.7.2、TypeScript5.9.3、Vite8.3.4、Mind Elixir6.0.0-next.4、ts-fsrs5.4.2、Zod4.6.7、@napi-rs/image1.15.0。只使用既有测试mkdtemp临时库和S0内存空库，无私人数据库。

| 命令/检查 | 实际结果 | 证据/边界 |
| --- | --- | --- |
| python 包内09-tooling/verify_package.py | PASS | required33、10阶段、manifest/SHA256一致；不是生产测试 |
| 新checkout/status/远端develop/分支/PR/CI核对 | PASS | baseline与来源一致；启动干净；无已有v075分支/PR；旧开放PR不改 |
| npm ci --include=dev | PASS，194包 | 未改lock，未ignore-scripts；Electron首次使用下载二进制后实际smoke成功 |
| npm test | PASS202、FAIL0、skip0、cancel0 | 当前全部tests/*.test.ts，含核心/SQLite/复盘/导入/图片/备份；非覆盖率百分比 |
| npm run check:protocol | PASS21、FAIL0、skip0 | 协议回归另跑21（已含在202中，不重复累计独立数）；边界/tsc/导出75定义均exit0 |
| npm run build | PASS | vue-tsc、Electron tsc、Vite229 modules；构建产物未提交 |
| node tools/smoke-v060.mjs | PASS4/4 | 真实Electron临时库：boot/API、deck UI、错题揭示/提交、记忆复盘；完成标记有效；不是Win/完整ASAR |
| S0 openDatabase(:memory:) + Application + createApplicationProtocol + PRAGMA | PASS | 42张表、integrity=ok、FK0行；SCHEMA604-INVENTORY含所有字段/外键/DDL和fingerprint。只读审计策略未实现迁移 |
| 本地Electron打开OPEN-ME-v3.7.html/审阅主要页DOM | PASS（限参考审阅） | 首页/deck/cards/editor/review/knowledge/settings，附MD大纲/交换DOM检查；无pageerror不代表生产功能通过 |
| 原型headless screenshot/outline物理点击 | BLOCKED | screenshot超时，outline按钮超出该headless视口；没有更改原型/生产代码来掩盖。DOM事件审阅和包内静态截图仅参考，不是鼠标/截图验收 |
| npm run test:ci | PASS5/5，FAIL0，skip0 | 既有基础设施自检，无门禁修改 |
| 新增文档范围/历史归档/决策原文/链接/git diff --check | PASS | 5份归档逐字节一致、3份权威原文一致、T01–T45保留、内部链接有效、git diff --check通过；无数据文件、依赖、测试、工作流变更 |
| 本分支实现检查点GitHub PR CI | PASS（8fa96a0，仅文档CI） | Run39715137420 completed/success；下方完整SHA绑定；最终回执提交是新head，CI保持PENDING待即时核实 |
| 全量ASAR/其余生产GUI smoke | NOT_RUN | S0无应用行为变化，本轮仅必要4项smoke；基线CI成功独立登记 |
| 新schema/新评分/三模式/Markdown POC/迁移回滚 | NOT_RUN | S1–S9未实施，T02–T45尚非通过 |
| Win10/Win11人工及本轮Windows便携验收 | NOT_RUN | Linux与GitHub Runner不能冒充实机签核 |

持久证据：docs/v075/evidence/BASELINE-TEST-OUTPUT.txt（命令输出）；schema清单fingerprint；本目录后续远程回执。原型首次脚本错误使用npm模块路径获取Electron API、后续截图/点击超时均只影响临时参考查看脚本；纠正require('electron')后页面实际可打开。最终应用测试无FAIL，不删/skip/降低现有测试。

文档检查记录：初次暂存检查发现原始DOM输出尾部空白，已在远程保存前规范化；最终相对develop的 git diff --check PASS。应用测试无变更，无重新运行必要。

## S0 远程保存与即时交接回执（2026-10-22）

- 远程实现检查点：`8fa96a06325e047919a8b05d4c69ec6050676c95`；parent=`7970896c0306833e3b2f54a843f388d2e380618f`，tree=`b970098dd0ea16a80de21fd364d6b4eafd79ba5c`，与本地最终文档tree完全一致，PR与git fetch独立读回一致。
- Draft PR：[13](https://github.com/Aides8Stack/GankSoft/pull/13)，head=`feature/v075-unified-learning-workspace`，base=`develop`，draft=true，未合并。
- 已观察到实现检查点PR quality：[39715137420](https://github.com/Aides8Stack/GankSoft/actions/runs/39715137420)，head_sha=`8fa96a06325e047919a8b05d4c69ec6050676c95`，event=pull_request，completed/success。只反映纯文档PR质量检查，不是新版业务/Windows验收。未等CI完成，读取完整head绑定详情时已结束。
- 普通HTTPS git push因没有登录凭据失败；改用已连接GitHub接口，从核实的base tree构建、parent指向真实HEAD、expected_sha核对且force=false推进ref。未覆盖任何远程工作。初始两个本地提交留在本地local/s0-pre-api保存；当前任务分支重新跟踪真实API远程检查点，无强推/重置/历史删除。
- 本次仅补交接回执；最终回执自身SHA不能写入自身文件，从远程PR/head或`git log -1 -- docs/development`解析。**最终新head的CI：PENDING_NOT_OBSERVED（在提交内记录）**；保存后只即时查一次新head的Actions，最终聊天回执报告真实SHA/Run，不无限追加文档提交。前序成功不能代替新head结果。
- S0已完成；下一轮先查最终head的真实CI，再按用户指示进入S1.a。保留全部测试/审批门禁；不自动合并、不发布、不审批；现在退出，不等待CI。
