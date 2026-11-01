# GankSoft v0.7.7 — 逐业务模块测试路径索引

**模块验收规范**：仅测试设计，未执行的新 CASE 仍为 NOT_RUN；完整 250 条合同和唯一结果账本分别见 [操作链](../E2E-FULL-OPERATION-CHAINS.md) 与 [结果](../E2E-RESULTS.json)。现有 8 条 Linux Electron PASS 继承且不当作 Windows 通过。

| 模块 | 功能组 | 首轮常规路径 | 首轮异常/反馈路径 | 文档 |
| --- | --- | ---: | ---: | --- |
| 启动与学习总览 | ENV / HOME | 4 | 2 | [app](./app.md) |
| 文件夹与卡片集 | CAT | 4 | 2 | [catalog](./catalog.md) |
| 卡片、草稿与列表 | NEW / OLD / LIST | 12 | 2 | [cards](./cards.md) |
| 编辑器、选项与粘贴 | EDITOR / CLIP | 5 | 3 | [editor](./editor.md) |
| 筛选学习、复盘与调度 | PLAN / REVIEW | 6 | 1 | [learning](./learning.md) |
| 学习分析 | AN | 2 | 1 | [analytics](./analytics.md) |
| 知识图谱与Markdown | KNOW / MD | 3 | 2 | [knowledge](./knowledge.md) |
| 图片与资源库 | MEDIA | 2 | 1 | [media](./media.md) |
| 内容导入导出 | EX | 2 | 1 | [exchange](./exchange.md) |
| 系统设置、主题与数据目录 | SET | 3 | 1 | [settings](./settings.md) |
| 备份恢复与回收站 | BACK / TRASH | 3 | 2 | [storage](./storage.md) |
| 故障恢复与Windows | FAULT / WIN | 3 | 2 | [reliability](./reliability.md) |

**执行阶段：**D0 设计/环境 → T1 各模块基本路径 → T2 失败与反馈 → I3 归类去重 → F4 集中修复 → R5 回归和 Windows。进入新 Work 时只读当前模块文件，不反复把 250 条全部加载到模型上下文。
