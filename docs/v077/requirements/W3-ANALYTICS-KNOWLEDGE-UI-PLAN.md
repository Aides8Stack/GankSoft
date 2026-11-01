# W3 — 卡片/知识点双维度统计与知识图谱 Markdown 局部 UI（P1/P2）

**状态：待实施 / 生产测试 NOT_RUN。模型 GPT-6 / Medium；涉及数据库并发冲突可局部升级 High。依赖 W1。**
关联 [#34](https://github.com/Aides8Stack/GankSoft/issues/34)、[#24](https://github.com/Aides8Stack/GankSoft/issues/24) 新 UI 例外和 [DATA-SYNC-CONSISTENCY.md](./DATA-SYNC-CONSISTENCY.md)。

## 设计合同
- 复用 `workspace.dashboard`、`workspace.analytics`、`learning.mastery.deck/card/knowledge`；**只允许一个新的只读分组查询** `workspace.analytics.grouped`（或同等最小协议），支持 `card|knowledge`、日期、搜索、排序、分页、`direct|aggregate`。
- 卡片集概览显示两维摘要；现有「学习分析」主导航内双维度切换、7/30/90天/全部历史、评分/耗时趋势、逐卡或知识点详情。时间范围内事件与**当前 FSRS 到期/掌握状态**分开解释；缺少客观答题分母显示「—」。
- 知识点 aggregate 对节点子树关联的 **cardId + eventId 去重**；跨节点可能重叠，绝不能将节点各行总和冒充全卡片集。分页统计和全区间趋势不能用“已加载20条”伪装总统计；复用现有掌握度模型，不生成第二套系统评分。
- 统计与 W1 的 revision/epoch 和读回通知绑定，进入/返回/新提交时重读；避免一次为 5000 个节点逐一发 IPC。
- UI 微调：知识图谱**一级主页面没有「返回所有卡片」按钮**，内部 Markdown 导入/导出也**没有「返回知识图谱」按钮**。挂载选项 radio+标题同行、路径副行；粘贴 Markdown textarea 自适应所在右侧面板宽度。不得影响已有 Markdown 业务逻辑或工具栏交互。

## 最多三个检查点
1. **W3.1 统一统计口径和 SQL 批量协议**：明确时区、区间计数、当前快照、分组游标版本、知识树关联去重；补必要领域和协议测试。
2. **W3.2 Vue 统计页与局部知识 UI**：对照 #34/#24 预览与 `OPEN-ME-v3.7.html`，实现两维切换、数据展示、详情下钻和两处返回按钮删除/表单宽度修正。只读结果复用 W1 同步，不新增 Pinia/全局缓存。
3. **W3.3 定向验收并保存**：真实 SQL、Electron GUI、缩放和重启；远端完整 SHA 核验后停止。

## 新增测试矩阵
| CASE | 强制断言 |
|---|---|
| W3-01 | 0事件、仅客观/无客观、不同卡片类型；平均分和正确率分母正确 |
| W3-02 | 7/30/90/全部历史及跨日时区；当前到期数独立于历史日期窗口 |
| W3-03 | direct/aggregate、同卡多知识点、子树重叠时各节点去重且整体不重复总计 |
| W3-04 | 100+卡/大量知识点，排序搜索分页/完整区间趋势；没有逐节点 N+1 IPC |
| W3-05 | 提交评分、改变知识关联、调度调整，学习分析与概览立即重读，无陈旧值/混游标 |
| W3-06 | 知识图谱/Markdown 双返回按钮均不存在；radio与文字同排；textarea 宽度占满面板 |
| W3-07 | Markdown 文件/剪贴板读入、预览和导出旧业务不回归；900/1366/1600px UI 真点击 |
| W3-08 | 并发看板/分析读版本一致，备份恢复 epoch 变更后无旧统计 |

**验收门槛**：卡片/知识点两个维度数值可独立通过 SQLite 证据验证；所有统计写后自动更新；两处返回按钮彻底删除；不可把 Vue 原型单测当生产 GUI PASS。