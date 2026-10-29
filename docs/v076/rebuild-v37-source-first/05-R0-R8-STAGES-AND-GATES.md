# 05 — R0–R8 实施顺序、模块边界和阶段 Gate

## 为什么重新分阶段
此前 P0–P6 以“功能可进入、主要区域存在、截图生成”为主要实施里程碑；本轮**重设方法论**为“原型源码结构直接迁移 + 真实后端适配 + 同数据视觉比对 + E2E”。P0–P6 不删除，是历史代码及测试证据库；**R0–R8 是新的开发计划，不意味着此前工作均失效**。同一生产 Electron 入口，渐进迁移，留可回退的提交，不复活旧604。

## 9个阶段：每阶段必须保存计划、映射、代码、测试、进度

| 阶段 | 当前真实目标 | 核心实现与交付 | 退出 Gate（包含证据） |
|---|---|---|---|
| **R0 源码解构与差异底盘** | 真实审读冻结原型的 HTML/CSS/JS、各页面状态，识别现有 Vue 和协议 | `prototype-dom-css-inventory.json`、逐页映射、computed-style来源报告、旧CSS覆盖关系、API存在性表、原型/正式同数据夹具方案和 capture baseline | 原型 SHA 核验；至少 overview/deck/编辑/复盘/知识/设置全部函数映射；所有缺项有负责人；旧源码不改/不丢 |
| **R1 壳层+全局视觉组件** | 213px文字目录、原型品牌、topbar/subnav、基础控件、CSS单一生效源 | 正式SFC和组件适配、可重用CSS tokens，目录树分页/高亮/返回，导航保护、响应式 | HTML同状态三宽截图/DOM CSS对照；真实目录建立/切换/重启；无重复纯图标列；不劣化原有导航 |
| **R2 学习总览+本集概览** | `overview()`、`deckHome()` 源码级迁移 | 四指标、左集列表、右续学与最近学习；本集标题计划/四快捷/历史/概况，真实数据空态 | 原型等效合成数据与双轨空/非空截图，真实摘要/FSRS到期/续学/session/E2E |
| **R3 卡片列表+详情+筛选** | `cardsScreen()`、`cardDetailScreen()`、`filterScreen()` | 真实搜索/分页/类型/时间知识筛选，批量动作、详情与历史，视觉完整复刻 | 列表DOM/列顺序/弹层一致；真实批量学习/导出/回收站/保存、空态、回退选择 |
| **R4 编辑+复盘+分析** | `editorScreen()`、`reviewScreen()`、`analyticsScreen()` | 3模式编辑外壳、原生Crepe/图片、草稿+发布、FSRS复盘/历史、图表及指标，按源码保留排布 | 三模式真实UI → IPC → Schema606 → 重启，全原型页对照、错答Again、编辑器原生回归 |
| **R5 知识图谱+MD交换** | `knowledgeScreen()`、transfer、outline | 全屏图谱、工具栏、搜索/选中、增子同级、普通节点重排、右侧层级MD大纲、导入预览/导出 | 真图谱 canvas DOM/工具区同宽核对、树关系/Markdown保存重启；禁止根节点整图自由拖动与重复导航 |
| **R6 设置+回收站+全局交互** | `settingsScreen()`、`settingsBody()`、`trashPane()`、全部弹层 | 回收站纳入设置体系、调度/备份/数据目录与恢复、焦点/键盘/错误/空态/窄屏细节 | 所有危险操作确认及SQLite回滚、备份恢复/目录迁移重启；设置路径/窗口与原型一致 |
| **R7 集成及严格视觉总验收** | 所有主页面、多个状态/三宽/同数据、全部跨页回归 | `reference-vs-production` 差异总表、缺项修复、每页证据 manifest、完整 E2E/回归与性能 | BLOCKER/MAJOR 均消除，MINOR获明示批准；生产606全链路实际PASS，老功能不退化；未跑Windows记 NOT_RUN |
| **R8 Windows与交付候选** | Windows正式Electron/ASAR/EXE及便携 ZIP | 中文真机截图、缩放/路径/IME/表格/图片/知识图谱、Win10/11同包验收与产物哈希 | Windows已运行验收真实PASS、CI按规则通过、候选便携包同源可复验；无 owner 批准不合并不Release |

## 三个 Work 批次（明确上限，不是必须凑满）
- **第1轮：R0、R1、R2**。最先纠正“看图重写”的根因；各阶段可分小检查点。完成三个或出现重大风险立刻保存交接并结束。
- **第2轮：R3、R4、R5**。未解决的高优先门禁在开工前识别并安排复验，不把上一轮不完整成果写 DONE；可以推进互不依赖的模块。
- **第3轮：R6、R7、R8**。R8中真实Windows/人工不可执行即 BLOCKED/NOT_RUN，不谎称完成，不无限等待CI。
- 若第一轮只做到 R0/R1，则下一次继续首个尚需实施的任务，**不会机械跳到 R3**；自动阅读 `docs/development/RECOVERY-NEXT.md` 与本目录交接文件确定任务。一个Work最多触及三个不同阶段；UI/后端/Windows缺验，阶段仍 IN_PROGRESS。

## 保存与审查门槛
- 先锁定最新 branch HEAD 与不应覆盖的WIP，按 `AGENTS.md` / `STANDARDS.md` 安全处理已有业务代码。R0 除测试脚本/设计数据外不大改页面。
- 每个子任务得到稳定可复验结果就小步 commit & push 到**原分支**，不仅阶段末保存。测试失败允许保存有清晰证据的 WIP，不标 DONE。
- 每阶段至少更新 `docs/v076/rebuild-v37-source-first/stages/RX/{PLAN,PROGRESS,TEST_REPORT,ACCEPTANCE}.md`（首次创建时），同时更新 `docs/v076/STATUS.md`、`docs/development/RECOVERY-NEXT.md`、`TASK.json`、必要交接文档；旧 P 文件不擦除。
- 对照只有 DOM/截图/本地测试证据的阶段保持 IN_PROGRESS，不能拿 Linux 截图当 Windows 最终签核；不因此阻塞下一独立 UI 子任务。
- 每轮截止：最多3阶段、独立读回远端文件树与实际 HEAD、记录未测试/阻断/下一阶段、主动结束 Work。连接/额度风险提前触发保存。

## 2026-10-28 R5 优先细分

最新用户约束及完整a–d需求见 stages/R5/PLAN.md。R5.a原生自动布局，禁止所有用户节点自由定位/坐标持久化；明确结构操作保留。R5.b Markdown/树交换，R5.c两级图片资源管理与引用安全，R5.d整体Gate；本Work只a。该条优先于表格中可能被误解为自由布局的“普通节点重排”。
