# R0 收尾结论 — DONE（差异底盘与责任移交）

起始 HEAD cc00f5788ede56865348f64c8099ea50720c32fe。按用户本轮限定，仅核对12节点展开、关联数和900px缩放；24条分类不重复审计，旧索引、源码和有效测试完整保留。R0 DONE 表示迁移底盘完成，不表示生产视觉一致或所有业务验收通过。

- 新脚本 `tools/validation/r0/visual-12-closure.ts`：真实606 typed IPC创建/读回12节点名称、正文和父子；生产公开“全部展开”操作后逐节点检查expanded及DOM，共12节点；原型collapsed为空。同选语境分析、详情打开、DPR=1、相同字体与三宽截图/DOM，运行退出0。证据 `evidence/visual-12-closure/manifest.json`，旧visual-12不覆盖。
- 关联数：原型语境分析字段 direct=14、含子级=14、后代=0；当前隔离库卡片=0，真实关联应为0。14与0属于测试数据差异；606知识详情并未显示直接/子级关联统计，另属正式UI缺项，移交R5。不得用虚构卡片或修改原型凑数。
- 原型三宽scale=1；生产1500/1366为1，900为0.709321。12个真实业务节点全部展开后仍有差异，归因生产Mind Elixir scaleFit及画布/双向树/展示根/侧栏布局；移交R5整改，不在R0改正式图谱。遮挡也是UI布局差异，不误记折叠。
- 24条分类沿用 `R0-24-STATE-REVIEW.md`，14业务适配/10缺失，仍不等于动态PASS。R2总览/本集；R3列表/详情/筛选/批量；R4编辑/复盘/分析/媒体；R5知识/MD/交换；R6设置/调度/回收站。各阶段承接实际UI→IPC→606、失败/取消及重启验证责任。
- 继承只读修复后5/5、生产18/18、关联37项及编辑器17项已有效证据，本轮不重跑、不改写为本轮结果。全局导航/首页迁移后其旧UI选择器证据仅作历史，受影响路径由R1/R2补测。

本轮依赖环境已丢失，正常npm ci成功；锁文件未改，Electron44.9.1下载成功。生产build退出0；Noto字体SHA与旧环境记录一致。此下载仅开发验证环境，不修改产品首次启动。

视觉一致性、Windows实机、系统剪贴板、中文IME：NOT_RUN；这些后续门槛移交R4/R7/R8，不再作为R0审计退出阻塞。下一步R1正式壳层，回收站嵌入设置，随后R2。只触及本轮R0–R2，不审批trust/合并/发布，不等CI。

---

# 2026-10-27 R0：12 节点基线与 24 项复核 — IN_PROGRESS

起始远端 `2235c62feea38dff74528bbd5277121195fadf45`，与本地暂存树一致，父 `a0fdba13b772b9507291773e16591d974f8bb75b`；PR #15 Draft。沿用已保存审计及回归，不重装依赖或重做全量测试。本轮仅 R0。

24 条原动态 NOT_RUN 行已逐条归类并记录事件、正式组件/DOM、typed API、数据源、候选测试、差异责任和下一步，见 `STATE-SEMANTIC-MAP.json` 的 `closureReview` 及 `R0-24-STATE-REVIEW.md`：14 BUSINESS_ADAPTED、10 MISSING_IN_PRODUCTION；类别不代表动态测试 PASS。另将三个 review-result 原型脚本注入别名标为 UNREACHABLE_IN_PROTOTYPE；其正式业务结果有独立证据。复盘固定演示、实际知识森林 12/4/3/2/3 与标示数字不同、设置 general/about 缺失及 operations/ai 必须保留的责任沿用 `SEMANTIC-GAPS.md`。

新工具 `tools/validation/r0/visual-12.ts` 复用已有隔离策略：冻结 HTML 两根森林，真实 typed IPC 创建并读取 Schema606 12 节点，逐项断言名称、父子及正文一致；选中语境分析、开启详情，采集原型与生产 Electron 的 1500×900、1366×900、900×900 PNG 和 DOM/computed-CSS 快照。首次执行因新脚本语法错误退出 1，修正后退出 0；证据 `evidence/visual-12/commands.txt` 和 `manifest.json`。截图采集 PASS 不等于视觉一致。

**R0 Gate：IN_PROGRESS。** 12 节点数据及选择经核验，但严格视觉同语义条件仍未全部满足：已通过 CDP 采集：原型图谱三宽均 100%，生产 1500/1366 宽为 100%、900 宽 `scaleFit` 为 70.9321%；所选中文节点字形两侧均为 Noto Sans CJK SC Regular（CSS 栈不同，未宣称所有字形一致）；逐节点展开状态未独立断言，生产截屏存在遮挡；原型还展示固定关联卡片数，隔离库没有对应关联。两侧均为浅色但颜色不同。截图显示生产合成展示根、左右图谱、右侧面板和工具栏与原型不同，后续 R5 负责 UI 差异；本轮不改生产实现。Windows、物理图片剪贴板、真实中文 IME 和视觉一致性 NOT_RUN，不把截图收集或静态分类称为测试 PASS。R1/R2 仍 NOT_STARTED。

继承上次 12 节点只读链路 5/5、未注入生产 Electron 18/18、37 项关联测试 PASS，详情见既有证据；本轮未重新运行。起始完整 SHA 的 pr-trust 为 failure（run 40483074386），需要所有者独立审核，不自行批准或绕过；当前检查点 SHA 由 Git 历史读取。下一轮关键任务：用同一节点集补齐 900 宽图谱缩放、展开状态及关联数语义，使三宽对照达到严格可比，再重新判断 R0 Gate。

---

# 2026-10-27 R0 收尾核验：IN_PROGRESS

本轮起始远端 `a0fdba13b772b9507291773e16591d974f8bb75b`，PR #15 为 Draft；本地树与该远端树一致。确认 `milkdown-adapter.ts` 仅过滤序列化前后相同的通知，保留真实变更回调。继承上轮 12 节点隔离 Schema606 A–E 修复后 5/5、未注入生产 Electron 18/18，以及真实编辑、导出不写入与 Electron 重启读回证据（`evidence/readonly-matrix/`）；不把历史修复前失败删除，也不重新声称旧视觉截图在新源码指纹下通过。

本轮补测：`node --experimental-strip-types --test --test-concurrency=1 tests/card-draft-controller-v075.test.ts tests/card-drafts-v075.test.ts tests/knowledge-markdown-media-v075.test.ts` 退出 0，37/37 PASS，覆盖自动保存排队、失败重试、CAS 冲突、关闭前未保存错误、图片数据库及重开；`npm run build:editor-spike` 退出 0；`node tools/smoke-editor-v075.mjs` 退出 0，17 个记录项 PASS（另有一个无状态颜色探针），覆盖编辑器自动保存/失败重试、注入剪贴板图片、Markdown、真实 IPC 及资源、异步粘贴目标和编辑器销毁重建。该 spike 图片走注入剪贴板、重启使用 JSON 夹具与真实暂存资源，不能冒充系统剪贴板或 Schema606 UI 端到端；详细证据 `evidence/closure-a0fd/`。原有 Schema606 数据服务与真实 Electron 重启证据独立继承。

**Gate：IN_PROGRESS。** 52 条状态源码/责任映射已保存，旧统计中的两条关联原失败已被修复后对应链路证据替代，但其余 24 条未运行/缺失能力并未因本轮回归变成动态 PASS；须逐项完成可执行状态与事件闭环、对不可达或未实现状态明确责任。严格同语义视觉基线仍只部分可比：28 节点规模夹具不等于原型 12 节点森林；既有 overview/editor/settings 差异归后续 UI 阶段，不要求在 R0 修复，但必须建立可比证据。系统图片剪贴板、Windows 实机与真实中文 IME 为 NOT_RUN；不可将注入路径或截图采集视为通过。R1/R2 均 NOT_STARTED。

复盘固定答案和 08:42 为演示、result 为不可达注入别名；知识点原型真实森林分别为 12/4/3/2/3 而非显示数字；设置 general/about 缺失，operations/ai 必须保留，详见 `SEMANTIC-GAPS.md` 与状态映射。不要修改 FSRS、Schema606 或生产数据以适配原型。起始完整 SHA 的 pr-trust 为 failure，run 40482172698；既有原因 CI_POLICY_REVIEW_REQUIRED，需所有者独立审核新完整 SHA；未自行批准或绕过。

下一轮关键任务：针对 24 条未闭环映射补可执行动态证据并标清不可达/缺失项，建立 12 节点同语义视觉比较；在可用系统剪贴板/Windows 环境补真实图片粘贴验收。无须重复已有效基础索引或全部测试。最终远端提交以本文件 Git 历史为准。

---

# 本轮R0：知识只读写入修复，阶段仍 IN_PROGRESS

起始远端b3ba983bf16d78391c40dab7f9eaf40a71b71eca，父08893a4eb328bcc72589c4da8e8a8bb65f922870；同一历史未覆盖。隔离12节点五场景中修复前C/E发生无用户编辑的revision/hash/正文变化；确认Milkdown新旧序列化字符串相同却通知changed，后续dirty/flush提交CAS。已针对无变化回调作最小修复，未改Schema606/FSRS。

诊断构建A–E修复后5/5 PASS，真实编辑保存、导出预览无写和关闭重启读回PASS；不含诊断注入的生产构建重跑原18场景18/18 PASS；关联24项编辑器/知识/Markdown测试24/24 PASS。完整命令、前后原始字节/修订/hash与调用堆栈见stages/R0/evidence/readonly-matrix。新旧生产源码指纹不同，旧截图及测试只保留为历史证据，不声称本轮重新通过。Windows、全量视觉及所有剩余状态NOT_RUN；R0 IN_PROGRESS，R1/R2 NOT_STARTED。

下一轮先审查新修复对其他编辑/媒体路径及R0剩余动态状态的影响，按实际代码变更补必要回归，再完成同语义视觉基线和阶段Gate。起始b3ba983的pr-trust仍failure/run40480180171，需要所有者对相应完整SHA独立审核；不自批、不改门禁、不合并不发布。当前检查点自身SHA由Git历史解析。

---

# 最新恢复：R0 语义审计已扩展，知识只读不变性FAIL — IN_PROGRESS

起始远端4765bef6966ceb4cb277779daa8db3716578d52a；中途08893a4eb328bcc72589c4da8e8a8bb65f922870已非强制保存并读回。当前最终检查点从Git历史解析，仍原分支/Draft PR15。本轮未重装依赖、重建索引、重拍42图或重跑旧59项；生产实现指纹保持有效。

52条状态源映射已补组件/事件/真实API/测试/缺项责任；26行关联通过的动态补证、2行关联同一个失败场景、24行本轮动态NOT_RUN，不能当功能完成度。新18个语义场景17PASS/1FAIL：复盘3模式、暂停重启/冻结拒绝、12节点精确树选择/层级、MD预览取消、设置5分类/回收站、编辑模式/弹窗取消。旧59项与42图按指纹继承。

R0不DONE，R1/R2 NOT_STARTED。阻断：未编辑正文时，完整知识选择/大纲/MD导出链路会将列表-序列化为*并加末尾换行，节点revision2→3、treeHash变化。保留严格断言；3节点缩小路径未复现，不能宣布修复或定案根因。下一轮先读R0/SEMANTIC-GAPS与semantic-v1/normalization-finding和normalization-repro，定位异步初始化/dirty/flush时序，再最小修复并跑受影响专项；不要无意义重复基础工作。剩余逐行入口见STATE-SEMANTIC-MAP。

复盘原型result不可达、08:42固定；knowledge实际12/4/3/2/3而非显示28/19/17/14/10；设置general/about缺失、operations/ai需保留。明确区分12节点精确夹具与28节点规模夹具，不改真实知识数据来匹配截图。视觉存在差异，Windows NOT_RUN。

起始完整SHA pr-trust failure/run40476383506/job122095533132，CI_POLICY_REVIEW_REQUIRED；中途08893a4仍failure/run40479030390。未审批/改门禁/合并/发布；不等待/轮询CI。

---

# 最新恢复：R0 环境已恢复，差异底盘已保存 — IN_PROGRESS

本轮起始远端 bccf6ff9f601bb586d5a3f1203378c825ac28eb8。中途远端保存 acc977dc1ddf7583617995d96157066300e11a05、22498cee4d3d9d145c53389390af4d2d41ad06d2 已读回；当前最终检查点由本文件Git历史解析。目标仍feature/v075-unified-learning-workspace / Draft PR15。

正常联网npm ci、Electron44.9.1、build和59个不同关联/领域测试通过；check:protocol重复21项并完成边界/类型/148方法导出。未修改生产源码、Schema606/FSRS、锁文件或既有测试。原型哈希匹配。已保留旧索引，增量AST/CSS/Vue/API审计、15组映射与52个原型DOM状态。

真实隔离606夹具为5集/242卡/53待复盘/18今日完成，189条真实学习事件；新Electron进程重读知识/草稿/会话通过。6页双版本三宽36PNG+36DOM/CSS快照+18并排图，另补6张同appearance/full-map参考和6张并排图；仅Linux辅助。完整视觉非PASS，Windows NOT_RUN。证据见 `docs/v076/rebuild-v37-source-first/stages/R0/`。

R0保持IN_PROGRESS，R1/R2 NOT_STARTED。剩余不是npm/Electron故障：52个状态尚需逐事件→生产入口/API→具体用例闭环；review固定示例/暂停/揭示、原型知识小树与显示数量不自洽、settings缺失分类的语义策略尚需核实。先完成这些R0退出项再进R1，不机械重复完整索引或重置仓库。已有baseline明确导航计数/滚动、overview两文件夹代替五集、editor布局、settings结构等差异，责任见SCENARIOS/STYLE-CASCADE/BASELINE-EVIDENCE。

恢复命令：依赖仍在时直接读本轮TEST_REPORT与manifest，执行所需的reference-states或capture专项；只有依赖丢失才重新npm ci，不默认offline。截图之前确认Noto Sans CJK SC（font-environment.json含下载hash），严禁使用缺字试拍。capture会新建合成临时库并清理，不访问私人数据。

pr-trust run40471765200/job122080307175实际failure：CI_POLICY_REVIEW_REQUIRED，整个PR含控制路径变更，需所有者独立复核当时的完整SHA；后续提交须按新SHA审核。未自行批准/改门禁/合并/发布。不等待或轮询CI。

---

# 2026-10-27 R0 依赖恢复检查点 — IN_PROGRESS

联网 npm ci、直接依赖检查和 production build 已通过，锁文件未改。缓存阻断解除；R0 源码审计、computed styles、同数据夹具和三宽基线正在执行，尚未达到退出条件。R1/R2 NOT_STARTED。本轮仅 R0，完成后保存退出。详见 stages/R0/DEPENDENCY-RECOVERY.md。起始远端 bccf6ff9f601bb586d5a3f1203378c825ac28eb8；当前保存 SHA 从 Git 历史解析。

---

# 2026-10-27 R0 部分检查点 — BLOCKED

基线 `8f61ab90678de88ee8e94d54d78978394431dac0`，原型 SHA 匹配。R0 已建立初步源码索引、映射和静态 CSS 初查；离线 npm ci 因缺失 zwitch 返回 ENOTCACHED，真实 Electron、computed styles、同数据三宽截图与业务回归未运行。R0 BLOCKED；R1/R2 NOT_STARTED。下一轮从 R0 继续：恢复完整锁文件依赖与可用 Electron 环境，逐项核实页面/事件/协议映射，建立隔离真实数据夹具和三宽基线。详细结果见 `docs/v076/rebuild-v37-source-first/stages/R0/`；本检查点自身 SHA 由 Git 历史解析。

---

# 最新 Work 恢复入口（2026-10-27）：R0–R8 v3.7 源码级迁移

用户已要求重新设计**实现与测试方法**。原 P0–P6 文件以下均为历史记录，不应再单纯“继续P4”。以仓库当前真实 HEAD/WIP 为准，从 `docs/v076/rebuild-v37-source-first/README.md` 和 `07-WORK-THREE-STAGES-AND-RECOVERY.md` 启动 **R0：先解析并建立 HTML DOM/CSS/JS→Vue→真实API源码级映射、同数据视觉夹具**。然后 R1主壳、R2总览。本轮最多三个阶段，先保存源码/测试/截图/未完成WIP并读回远端后**主动结束**，下一Work再继续。保留原分支和Draft PR#15、已有P0–P3成果、Schema606/FSRS/历史/Crepe/图谱；不强推、不自动合并发布，不弱化测试。当前仅设计文档修订，R阶段实现/Windows验收仍 NOT_RUN。

---

# 优先恢复导航设计（2026-10-27 最新用户要求）

原版 v3.7 HTML 左侧约213px文字目录（学习总览、文件夹、卡片集名称/数量）必须还原；错误的68px纯图标侧栏要求已经撤销。以 `docs/v076/workpack/full-fidelity-v3.7/WORK-CONTINUATION.md` 和 `LEFT-RAIL-CORRECTION.md` 为最新恢复入口，先修 P0–P3 共用主壳及相关视觉截图，再继续 P4–P6；保留 P3 已完成源码和测试历史。Windows 正式视觉 NOT_RUN。此次仅修改设计文档，UI 尚未实施纠正。

---

# v0.7.6 连续恢复

已核实远端P0–P2检查点0fb41606962435378904c7e077568dd2279bd36e，完整树6af9e0a5b5c5eb81596a411e1c22e8ad912a92f6与本地0448f1733a17686ed91374e931e6f01a9cf47e37一致；关键证据manifest已API读回。Git CLI没有凭据，保存继续走API base-tree/真实parent/force=false/expected_sha。

本检查点P3三模式编辑/复盘/分析已实现与Linux三宽辅助取证。详见docs/v076/stages/P3。9项业务关联、8项草稿/编辑器专项、三模式复盘6场景和生产UI P3通过；协议21/148方法及build通过。card-draft/workspace完整回执待补。P0–P3均IN_PROGRESS，Windows视觉NOT_RUN。

下一步连续推进P4：全屏图谱顶部结构/工具带/MD大纲与交换，随后P5设置回收站；P6保留真实Windows/便携/Win10/11签核。不能改数据库/弱化门禁/等CI/新建分支/合并发布。已保留并接入本机恢复的P3 WIP；没有覆盖原工作区。


## 新用户增补：后端全链路验收不能遗漏

与恢复原版左侧目录同时，执行 `docs/v076/workpack/full-fidelity-v3.7/END-TO-END-BACKEND-ACCEPTANCE.md`。每个页面都要验证生产 Electron UI 调用实际 API/Schema606，确保保存/复盘/FSRS/历史/知识树/图片/备份/回收站的真实业务结果、重启恢复和错误/取消；旧有效测试可继承但接口变化需补回归。UI/后端/数据/Windows结果分开记录，任何关键欠缺则阶段 IN_PROGRESS。此检查点只写规范，不冒称测试已运行。
