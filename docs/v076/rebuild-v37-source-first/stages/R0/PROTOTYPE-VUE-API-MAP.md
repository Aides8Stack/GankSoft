# R0 初步源码映射（未验证完整性）

| 原型入口 | 已发现生产位置 | typed API 线索 | 待验证 |
|---|---|---|---|
| overview | src/unified/UnifiedHome.vue | workspace.dashboard；目录由 UnifiedWorkspace 调用 workspace.catalog | 同语义数据、空/错误态、续学和重启 |
| deckHome | src/unified/UnifiedDeckOverview.vue | workspace.dashboard、workspace.analytics | 每项统计语义、全路径与截图 |
| cardsScreen / cardDetailScreen / filterScreen | UnifiedWorkspace.vue 等 | card.listSummary、learning.queue.preview | 逐事件及详情组件待追踪 |
| editorScreen | UnifiedCardEditor.vue、CardDraftForm | draft.get/save/previewSwitch、card.publish、knowledge.cardLinks | 三类型、媒体和保存/重启 |
| reviewScreen | UnifiedWorkspace.vue | learning.session.open/get/change、learning.review.submit | 会话组件、FSRS 与重启 |
| knowledgeScreen | src/services.ts unifiedKnowledge | knowledge.tree.read/apply、knowledge.node.create/save | 对应组件和全部行为 |
| analyticsScreen | UnifiedAnalytics.vue | workspace.analytics、learning.mastery.deck/knowledge | 历史和显示条件 |
| settingsScreen / trashPane | 待追踪 | workspace.recycle.decks、card.recycle.list、knowledge.recycle.list 等 | 实际设置组件及删除/恢复路径 |

以上 API 名称从服务封装或实际调用读取，仅作为线索，不声称端到端已通过。需对照 registry、preload、handler、数据库及测试签名逐项核实。
