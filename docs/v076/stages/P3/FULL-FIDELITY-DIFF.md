# P3 FULL-FIDELITY-DIFF

# P3 原型区域映射

| 原型区域 | 正式实现 | 差异与结论 |
|---|---|---|
| 编辑头/草稿箱/内容工具栏 | CardDraftForm + UnifiedCardEditor | 回退/草稿箱真实导航；复制/Prompt/粘贴沿用原控制器 |
| 卡片集/标题/三模式 | 只展示当前模式；模式切换仍确认清草稿 | 所属集只读，真实移动保留列表批量入口；不伪造即时移动 |
| 题干/选项/答案/解析/思路 | Crepe原生编辑区、单独答案组、来源/材料/知识区 | 保留原选项上下移和Markdown能力 |
| 知识点图选择 | 多选KnowledgeExchangeMap + 原关联API | 首次发布前如实提示；发布后可选；未知请求锁定保持 |
| 复盘进度/计时/暂停/答案/评分 | UnifiedReviewForm | 错因/漏洞独立字段保留，不合并丢数据；错题高分仍Again |
| 分析KPI/趋势/知识/历史 | UnifiedAnalytics | 演示百分比换为真实证据状态；整集/知识掌握度按需加载；不伪造76% |
| 三宽截图 | evidence/full-fidelity | 同机中文、scale1；原型模拟数据，正式合成/空数据 |
| Windows/高DPI/真实IME | 待正式Windows入口复验 | NOT_RUN；Linux不替代 |

