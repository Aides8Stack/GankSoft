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

# 2026-10-27 只读链路修复检查点

远端起始b3ba983bf16d78391c40dab7f9eaf40a71b71eca直接以08893a4eb328bcc72589c4da8e8a8bb65f922870为父；两者不是互相覆盖，最新HEAD为b3ba983。原型/旧截图与索引保留。

针对A打开图谱、B打开大纲、C导出预览、D独立KnowledgeMarkdownPanel.flush、E完整导入预览取消→导出预览取消，分别建立全新隔离606库，按冻结原型创建精确12节点。每个场景记录正文UTF-8原始字节base64、revision、treeHash、节点、来源/堆栈及保存请求；节点UUID不同但内容/树结构/初始revision一致。D为诊断构建中直接调用组件公开flush，不声称用户UI按钮端到端。

修复前：A/B/D PASS，C/E FAIL，语境分析revision2→3、正文列表`-`→`*`并追加换行。事件记录显示milkdown.markdownUpdated的markdown与previousMarkdown完全相等，却仍调用changed(snapshot)，SaveController与原始字节不同而置dirty，延迟flush经KnowledgeMarkdownPanel.adapter调用knowledge.node.save CAS。不是断言导出服务自身写入。pre-fix.json保留步骤与请求证据；第一轮没有等待已观察到的dirty对应保存事件，故不作为只读通过结论。

最小修复：src/editor/milkdown-adapter.ts使用Milkdown监听器公开的markdown/previousMarkdown，仅当序列化内容没有变化时不发出changed；真实内容变化仍走原事务、保存与CAS。没有修改依赖、Schema606/FSRS或移除断言。诊断Vite配置只向临时构建注入观察，不改变响应/条件；最终标准构建已恢复。

修复后A–E均PASS；E进一步从真实UI输入、保存、导出预览验证内容不改源，然后关闭并重新启动生产Electron，确认内容、revision和treeHash。原无注入生产构建重跑原18场景18/18 PASS。24项编辑器/知识树/Markdown服务测试通过，覆盖CAS冲突、失败与预览取消；Windows真实验收NOT_RUN。

R0仅此缺口已修复，不代表R0全门槛通过：其他动态状态、严格同状态视觉及既有生产差异仍待审；R1/R2保持NOT_STARTED。

---

# R0 三项语义缺口核对

本轮起点4765bef6966ceb4cb277779daa8db3716578d52a。保留既有52状态索引、42PNG/36DOM CSS/24并排图和59项有效测试；生产实现指纹仍为0f2932e50b3eaa98455b64c0ac86ae4df51080c36117a76a2f511814bdabe4dc。没有重装依赖、重建索引或重复整套测试。

## 复盘：演示分支与真实状态机

- 原型1365–1372：question/recall/reading均以answer开始；reveal显示固定演示答案。question固定选项C；08:42是HTML字面量。pause仅翻转reviewPaused与按钮文案；reviewNext(1706)直接回answer并前移，没有SQLite、FSRS或可达result事件。
- 旧52枚举中的review-*-result是脚本注入值。render只判断是否answer，三个result图其实是reveal别名；不能以枚举PASS证明原型有保存结果状态。reading-answer在原型可达，但正式direct一开始就是reveal。
- 正式UnifiedReviewForm内容来自session.content.payload/entry.versionId；选项使用稳定optionId。question/qa: answer→reveal→真实submit结果；direct初始reveal。scoreTenths范围0–100，每格0.1分，不能照搬原型0–10整数控件。先save一致草稿再submit；已揭示答案/思路冻结、暂停禁止提交、错答强制Again，状态机不变。
- 本轮真实生产UI补测三模式，question选“错误”且自评9.0后rating=again；qa/direct自评9.0保存真实结果。暂停和原始思路在新的Electron进程读回，冻结后改写被ANSWER_FROZEN拒绝。精确elapsed累计11秒的旧T20有效证据继承，不重跑。
- 对照策略：标题/正文/答案从隔离fixture的实际contentVersion构造，原型固定示例仅是布局文字。必须分别对answer/reveal/真实result语义标注，不向生产写固定C或08:42。R4负责样式/暂停按钮/结果区迁移；R0负责证明采集状态是否可比。

## 知识树：显示数字与真实森林

通过冻结原型运行时实际读取knowledgeForests，不修改原型：

| 集 | 实际节点（包含各根） | decks元数据knowledge |
|---|---:|---:|
| language | 12 | 28 |
| data | 4 | 19 |
| reason | 3 | 17 |
| commons | 2 | 14 |
| essay | 3 | 10 |

language包含原9节点主树与额外3节点创新理论树。原型节点cardCount也为独立演示字段，不能视为真实关联统计。正式MindMapWorkspace通过knowledge.tree.read/layer取得真实节点；gank-root是引擎展示根，不计业务数量。

旧242卡夹具中的28节点是明确标注的规模夹具，含补充节点，适合统计/规模和粗布局，**不是与原型12节点逐节点等效的图谱夹具**。保留旧证据，不篡改数据或隐藏额外节点。本轮另建12节点精确森林，所有节点/正文由typed API创建，无数量填充；验证语境分析的父层级、选择、大纲收起/展开与正文读取。

正式父组件固定expanded，原型普通/全屏两个状态不能假称都已有正式对应；普通态为R5缺口。展开状态是视图状态，不是通过tree.apply写数据库的业务事实。只读交互应保留树与修订；本轮MD导出前置flush路径出现revision/hash变化，见下面FAIL，不将其掩盖为通过。

## 设置：分类映射与保留能力

| 原型 | 正式对应 | 数据/操作 | 结论与责任 |
|---|---|---|---|
| general | 无独立通用分类 | 默认首页/语言/快捷键说明暂无同页能力 | MISSING，R6补UI和必要明确合同；不能拿appearance替代 |
| review | review→当前卡片集调度 | policy.config.get/deck.set/card.set等 | BUSINESS_ADAPTED；原型“全局默认”与真实按集/卡合同不混同 |
| data | data + FullRestore + Relocation | maintenance.backup、storage.restore/relocate等 | BUSINESS_ADAPTED；保留事务、取消、未知结果核对，不为原型简图删除功能 |
| trash | footer emit recycle→UnifiedRecycle | workspace.recycle.decks、card.recycle.list、knowledge.recycle.list | 有真实入口；主侧栏重复和设置路径外壳为R1/R6差异 |
| appearance | appearance→themeMode | preferences.get/set | 对应；持久化读写由既有composable处理 |
| about | 无关于分类 | 版本存在侧栏/能力元数据，不是关于页 | MISSING，R6 |
| 原型无独立分类 | operations | maintenance.operations/operation.resolve | 必须保留：未知文件操作人工核对 |
| 原型无独立分类 | ai | 编辑器Prompt上下文/本地模板 | 必须保留；不恢复旧AI网络调用或S8.b |

## 新发现：只读导出链路修订变化（FAIL）

补测原封不动保留 `deepEqual(full tree including revisions/hash)`：12节点森林中语境分析revision从2变3，treeHash改变，发生于选择/大纲/MD预览这一无用户正文编辑链路。候选调用链为KnowledgeMarkdownExchange.open→props.flush→MindMapWorkspace.save/persist→KnowledgeMarkdownPanel.flush→MarkdownEditor保存；需要比较正文前后字符串与初始序列化，不能直接推断是import/export服务写入。

这是R0同数据基线只读稳定性的失败，不能通过忽略revision/hash、放宽断言、覆盖旧证据或改Schema/FSRS来“解决”。诊断与独立设置/编辑器用例可分别执行，整体补测保持FAIL。R0不DONE，R1/R2不启动。修复可在下一轮按真实编辑器公开API/初始化事务最小定位，缺少证据前不大改生产。

诊断补证：正文前后差异已读回，不只是hash变化：列表标记`-`变为`*`，末尾增加换行；用户没有输入正文。`normalization-finding.json`保存确切before/after。源码显示MarkdownEditor.save会将序列化snapshot交给以原始Markdown为初值的SaveController，字符串不同即可被视为dirty并写CAS。尚未完成独立adapter最小复现，归因为强线索而非已证实修复。最终语义补测18场景：17 PASS、1 FAIL，整体exit1。独立设置/编辑器场景已执行并分别记结果，不将失败隐藏。

## 缩小路径的对照结果

normalization-repro.ts在独立合成库以3节点、同样的列表Markdown及选择/大纲/导出入口作对照，最终exit0，两条严格不变性断言PASS，但`reproduced=false`。这是缩小路径未复现，不是修复，也不推翻18场景中的实际revision/hash/正文变化。先前诊断曾断言“必须复现已知bug”而exit1；这些尝试也已保留。最终诊断改为记录不变性真实结果及NOT_REPRODUCED，原deepEqual断言和大场景FAIL均未放宽。

下一步应比较完整12节点/选中面板切换/异步加载与缩小路径的生命周期，记录markdownUpdated/dirty/flush发生时机并构造可控事件边界，确认后再最小修复。不能凭当前线索直接改公共SaveController或屏蔽所有初始化更新。
