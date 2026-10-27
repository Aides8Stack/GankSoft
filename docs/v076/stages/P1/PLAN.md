# P1 实施设计

原型overview()：四摘要，左侧我的卡片集纵向列表，右侧继续学习callout和最近学习。直接映射到UnifiedHome.vue及现有目录slot，不改为另一套布局。

数据缺口：catalog只列当前文件夹；analytics仅支持单集且没有未完成会话全局摘要。增加workspace.dashboard只读投影，支持可选deckId；统计元数据、时间区间和最近6条记录/4个会话，复用currentDue，无正文/图片/会话草稿加载。不改Schema或排期。
