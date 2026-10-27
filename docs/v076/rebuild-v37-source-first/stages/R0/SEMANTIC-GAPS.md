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
