# W3 — 设计与接口合同

> **W3 / P1/P2** — 卡片/知识点统计与知识图谱 UI。状态：NOT_STARTED；模型：GPT-6 / Medium；W 内依赖：W1；Issues #34、#24。

**此处只是待实施的最终需求定义，不代表已进入正式 Electron。** 准确性与刷新遵守 [数据同步合同](../../requirements/DATA-SYNC-CONSISTENCY.md)。

**状态：待实施 / 生产测试 NOT_RUN。模型 GPT-6 / Medium；涉及数据库并发冲突可局部升级 High。依赖 W1。**
关联 [#34](https://github.com/Aides8Stack/GankSoft/issues/34)、[#24](https://github.com/Aides8Stack/GankSoft/issues/24) 新 UI 例外和 [DATA-SYNC-CONSISTENCY.md](./DATA-SYNC-CONSISTENCY.md)。

## 设计合同
- 复用 `workspace.dashboard`、`workspace.analytics`、`learning.mastery.deck/card/knowledge`；**只允许一个新的只读分组查询** `workspace.analytics.grouped`（或同等最小协议），支持 `card|knowledge`、日期、搜索、排序、分页、`direct|aggregate`。
- 卡片集概览显示两维摘要；现有「学习分析」主导航内双维度切换、7/30/90天/全部历史、评分/耗时趋势、逐卡或知识点详情。时间范围内事件与**当前 FSRS 到期/掌握状态**分开解释；缺少客观答题分母显示「—」。
- 知识点 aggregate 对节点子树关联的 **cardId + eventId 去重**；跨节点可能重叠，绝不能将节点各行总和冒充全卡片集。分页统计和全区间趋势不能用“已加载20条”伪装总统计；复用现有掌握度模型，不生成第二套系统评分。
- 统计与 W1 的 revision/epoch 和读回通知绑定，进入/返回/新提交时重读；避免一次为 5000 个节点逐一发 IPC。
- UI 微调：知识图谱**一级主页面没有「返回所有卡片」按钮**，内部 Markdown 导入/导出也**没有「返回知识图谱」按钮**。挂载选项 radio+标题同行、路径副行；粘贴 Markdown textarea 自适应所在右侧面板宽度。不得影响已有 Markdown 业务逻辑或工具栏交互。

## 设计边界

- 旧 B1–B5 是已完成的既有软件功能，不需要再开发或重验所有历史用例。
- 本设计只属于 W3，变更权限限于本批直接相关的业务/服务/界面。
