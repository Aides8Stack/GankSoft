# R3 最终检查点 — IN_PROGRESS

实现与本轮有效业务/视觉证据已完成；混合选中学习UI补验因Electron启动SIGTRAP保持BLOCKED。仅安全保存，不再新增开发或重试，不进入R4。详情见stages/R3/TEST_REPORT.md。

---

# R3 — IN_PROGRESS

起点 c7a88c343e390a774a2e8ada8208020c6446d2d4，原分支 / Draft PR15，仅R3。列表迁移冻结工具栏/七列表格/选中状态/批量条，保留标题服务端搜索与类型/身份分页，已加载排序有明确标签。详情增加返回/关联知识点真实读取/历史入口/重读，内容与单次证据仍按需读取。筛选迁移四列条件、知识点选择确认/取消、随机、状态/时间/表现/队列/清除和每集条件恢复；复用既有typed IPC。

边界：现有列表服务不支持全库排序或知识点搜索；不冒充支持。队列接口无mode参数，类型只过滤本次最多100条返回队列并显式标注；90天可用自定义日期，不发送未支持的90预设。业务协议、Schema606/FSRS未修改。

首版build已通过，当前小修后重建及专项/Electron/三宽验收待完成；未标DONE。下一步用现有606缓存验证分页/详情返回/条件组合/切集/批量取消失败真结果/导出/回收站/空态。首个源码增量立即保存，不进入R4。

---
# R2 视觉收尾 — IN_PROGRESS

起点 ce7871e7c816b565d77b7b4e4bd1214541760fdd；仅R2，不进入R3。复用现有合成606缓存，不新建夹具。

实测根因：标题被旧样式追加9px下边距（原型0、段落上距7），导致2px偏移；本集“查看全部”文本按钮继承34px最小高度，将左列及整个grid撑高10px。900px总览将原型说明文本只替换成真实路径后，分栏/列表高度与生产一致，52px主要来自内容长度，不能用固定补高伪造一致。

限定修正：R2标题/文本按钮/列表换行和居中，R2显式启用冻结SVG和分模式图标；公共图标默认不变。随后生产build、dashboard专项、正式Electron最小R1/续学/重启，六张生产三宽截图与原型computed对照；继承未变化原型PNG/空态/其他已通过业务证据。首个有效修改立即保存；最后按本轮退出原则验收、保存、结束。

---

# R2 — IN_PROGRESS

起点 c4ba11802b9fe8fc84ca0789fa11d673c093ae87，原分支 / Draft PR #15。仅执行R2，不进入R3。

首个版本：UnifiedHome / UnifiedDeckOverview / UnifiedWorkspace；overview.css直接迁移冻结原型相关规则，隔离于R2页面。总览递归读取既有catalog并展示嵌套卡片集和真实due；文件夹管理保留折叠入口。三项最近学习、真实会话续学及无会话时待学入口；本集四快捷、历史卡片、真实平均自评，空集不混入其他集卡片。未改Schema606/FSRS。

测试：npm run build PASS（本工作树）；业务专项、Electron及三宽视觉 NOT_RUN。未宣称视觉一致，R2未验收。下一步补专项、真实606/切集/续学/重启/空态错误和R1最小回归、同数据三宽截图及差异记录。

保存：本检查点待上传；实际SHA通过Git历史和远端独立读回确定。

---

# R1 正式主壳检查点 — IN_PROGRESS

R0已保存并读回bc57e265a8c517e9138ab7910314dc2bf509d940（tree 002a252f5246a8e06df57ae98d923ea732d05c83）。本阶段直接解析冻结原型DOM/CSS/SVG，非看图重设计。

实现：213px完整文字目录、品牌、原型顶部路径、8项原序导航（概览/所有卡片/筛选学习/开始复盘/知识图谱/学习分析/导入导出/调度设置）、content-scroller/content-container层次；既有目录分页、选择、草稿保护与图谱专用画布保留。原型空subnav也实际占51px，已按computed行为保留。tokens/shell/components/responsive拆出独立来源；未迁移页面规则保留于pages/pending.css，后续各阶段接管。

回收站：主导航独立入口与独立page分支移除；设置分类直接加载UnifiedRecycle及卡片/卡片集/知识点子功能。系统设置close串接回收站busy/unknown保护，切换分类也走close。原服务/事务/恢复确认不删除。R6仍负责设置完整分类布局、恢复/异常/重启/后端全验收，不宣称已完成R6。

实际验证：npm run build退出0；正式production606 Electron的4组场景PASS：目录和8页签切换；设置→内嵌3类回收站→返回，保留列表查询/选择；复盘→设置→回收站→返回，保留思路并允许续写；UI新建文件夹和嵌套集，新Electron进程读回并进入。12张双版本三宽PNG、DOM/CSS快照见evidence-v2，manifest记录入口、环境和hash。第一轮发现旧全局brand/topbar/button覆盖（62px等），已修正；首轮证据保留为历史，不冒充当前版本。

三宽实测目录均213×900、topbar均56高，deck content边界与原型一致。overview仍因旧首页6条recent/文件夹行产生滚动与宽度差，交R2；目录顺序来自真实服务，原型固定演示顺序/数量与总数不同；颜色、SVG及细微差异见diff.json，不将单一尺寸/截图采集当严格视觉PASS。R1保持IN_PROGRESS，Windows/最终视觉/所有跨页回归NOT_RUN；不阻塞R2独立迁移。下一步R2 overview/deckHome源码迁移、三宽、真实数据/空态/续学验证。

---

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

# GankSoft v0.7.6

基线c2548f84ed2afe55f4157c71b821ab34dae599a3；分支feature/v075-unified-learning-workspace。

按docs/v076/WORK-PLAN.md连续执行P0–P6；不改Schema606/FSRS/发布门禁。
