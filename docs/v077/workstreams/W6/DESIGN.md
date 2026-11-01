# W6 — 设计方案与现有架构合同

**状态：PLAN_READY。** 本文是设计规格，不是生产实现。需求来自 Issue #37 和 2026-11-01 用户提供的卡片详情截图。

## 1. 目标与页面信息架构

卡片详情页减少无意义纵向分隔，让相关内容在视觉和语义上成为整体。主体按三个核心区块组织，知识点关联作为独立管理区：

1. 题目与选项。
2. 答案与解析。
3. 学习统计。
4. 已关联知识点与修改关联操作。

页面标题、卡片名称、模式、来源和返回/编辑操作保留在顶部，不挤占主内容。

## 2. 题目与选项区

适用 question-v1。

- 材料（有内容时）放在题干之前；材料为空时不显示空白材料容器。
- 题干完整显示在选项之前。
- 选项按原始数组顺序展示，字母从 A 开始根据实际位置生成，不补造选项。
- 每个选项使用固定宽度字母列和弹性文字列。字母与文字首行起始位置对齐；长文本只在文字列内部自然换行，不允许字母单独占一行。
- 1366/1600 桌面宽度采用两列选项网格；900 宽度验证两列是否仍有足够文字宽度，窄屏再切换单列。
- 每个选项内部 Markdown 仍通过现有 MarkdownContent 展示，媒体引用仍使用当前卡片 mediaRefs。
- 不把每个选项拆成独立的大卡片，不在选项之间增加大块空白或重复标题。

## 3. 答案与解析区

- 正确答案与解析必须位于同一个视觉容器。
- 正确答案由 correctOptionId 在现有 options 中定位；没有有效 ID 时显示“尚未设置正确答案”，不猜测答案。
- 答案区域突出显示答案字母及原选项内容，解析紧随其后。
- 解析继续使用 MarkdownContent 和 mediaRefs。
- 来源、初始思路等已有字段保留在适当的辅助信息位置，不改变原始内容。

## 4. 学习统计区

累计数据、趋势、最近学习和完整历史全部放在同一个统计容器中。

- 摘要指标：累计复盘次数、最近自评、当前周期观察次数、历史记录状态。
- 趋势：复用 ReviewLineChart 和 shared/review-series 现有计算；自评分、用时仍按现有口径。
- 最近学习：保留最近三条记录、日期、用时、客观正确状态和查看入口。
- 完整历史：继续使用 learning.history.list 的 cursor 分页；单条记录仍由 learning.history.get 和 content.getVersion 读取，展示当时的回答、思路、错因、反思及知识点快照。
- 不新增正确率、得分或观察次数的推算规则；数据不存在时显示未记录/暂无记录，不以 0 代替缺失值。
- 桌面端统计摘要并列；趋势与最近记录并排；窄屏上下排列。完整历史默认折叠，点击后展开。

## 5. QA 与直接记忆模式

- qa-v1：问题、答案、补充内容按紧凑分组展示，不出现单选题选项和“正确答案”区。
- direct-v1：正文独立展示，不生成题干/选项/答案等不存在字段。
- 两种模式都保留 Markdown、图片/媒体引用、来源和学习历史。
- 未知或不支持的 payload 不应静默转换成另一种模式，应保留既有错误/回退处理。

## 6. 知识点关联区：只在当前详情页操作

### 6.1 当前已存在的组件与 API

- src/main.ts 已创建全局 KnowledgePicker 宿主和 createKnowledgePicker，并通过 knowledgePickerKey 注入应用。
- src/components/KnowledgePicker.vue 是现有选择界面，内部使用 KnowledgeExchangeMap；它支持搜索定位、单选/取消、显式选择子树、取消和确认。
- src/composables/knowledgePicker.ts 的 useKnowledgePicker().open() 返回 confirmed/cancelled 结果及 nodeIds；它只负责选择，不写入数据库。
- src/services.ts 已暴露 unifiedKnowledge.links、unifiedKnowledge.tree、unifiedKnowledge.setLinks。
- shared/protocol/registry.ts 已注册 knowledge.cardLinks.get、knowledge.cardLinks.set、knowledge.tree.read。
- electron/modules/knowledge-unified/links.ts 已实现关联读取、事务保存、revision 比较和关系替换。

因此 W6 不新增选择器、不新增 API、不改 IPC、不改数据库结构。

### 6.2 首屏展示

1. 使用当前卡片 deckId/cardId 读取 knowledge.cardLinks.get。
2. 使用 knowledge.tree.read 读取同一 deck 的知识树。
3. 根据 nodeId 找到节点，并沿 parentId 向上拼接完整路径。
4. 展示名称和完整路径；无关联显示明确空状态。
5. 节点 ID 在关联结果中存在但知识树找不到时，显示失效关联状态，不伪造名称、不自动清理。
6. 加载中、读取失败、空关联、失效节点必须有不同状态。

### 6.3 修改与暂存

- 点击“修改关联”调用现有 useKnowledgePicker().open()。
- deckId 使用当前卡片集；initialSelectedIds 使用数据库读回的 nodeIds；purpose 为 association；允许子树选择沿用既有 picker 规则。
- 选择器取消时不改变详情页状态，不发出写请求。
- 选择器确认时只更新页面暂存 nodeIds；显示待新增、待断开、待保留的差异。
- 用户必须再次点击“保存关联”才持久化；“放弃修改”恢复数据库当前集合。

### 6.4 保存与验证

设保存前关联集合为 O，用户确认的新集合为 N：

- 新增集合：N − O。
- 断开集合：O − N。
- 保留集合：N ∩ O。

保存调用现有 knowledge.cardLinks.set，传入 cardId、deckId、nodeIds=N 和当前 revision 对应的 expectedRevision。

成功后重新读取 knowledge.cardLinks.get 和 knowledge.tree.read，以数据库读回结果为准，验证：
- N − O 中每个 ID 都存在；
- O − N 中每个 ID 都不再关联；
- N ∩ O 中每个 ID 仍然关联；
- 最终 ID 集合与 N 完全相等；
- 所有仍关联的节点属于当前 deck 且有效。

注意：原生卡片的 revision 递增规则与旧导入卡片的确定性 revision 形式不同；UI 只把 revision 当作 CAS 令牌使用，不假设每次都加一。

### 6.5 冲突、未知结果和刷新

- REVISION_CONFLICT：保留用户暂存选择；重新读取最新数据库关系；展示外部变化；用户重新确认后才允许再次保存，不自动覆盖。
- 未知回执：services.invoke 已使用原 requestId 查询 operation.status。UI 不得创建新 requestId 重发。若 invoke 仍返回未知，允许用 get 读回核对；只有持久化集合完全匹配时才显示验证成功，否则显示结果待确认并提供重新读取。
- DATA_EPOCH_CHANGED：清除过期页面引用并重新加载；不得把旧响应覆盖新状态。
- dataSync 刷新发生在编辑/保存期间时，应延迟刷新，不能静默丢失用户暂存选择。
- 保存、读回、树读取任一失败都应给出可恢复状态；不得伪报成功。

### 6.6 数据保护

- 断开卡片关联只更新关系，不删除 knowledge 节点。
- 历史 review event 的 knowledge snapshot 是事件时刻证据；修改当前关联不得改写既有快照。
- 不修改 Schema606、FSRS、schedule_events、ReviewEvent、掌握度算法和统计口径。

## 7. 响应式、可访问性与视觉规则

- 验证 900、1366、1600 CSS px。
- 选项字母和文字首行必须并排起始；长文本在文字列内换行；页面不得出现横向滚动。
- 850px 以下可将选项、统计趋势和最近记录切为单列；具体断点由正式 UI 实测确认。
- 知识点路径可换行，不以省略号隐藏唯一标识；必要时提供完整 title。
- 所有操作可键盘访问；按钮文字清晰；保存期间防止重复提交。

## 8. 设计范围外

不改知识图谱主页面、知识点节点编辑、导入导出、统计算法、FSRS、学习事件、服务 API、IPC、SQLite 表、Schema606 或版本号。
