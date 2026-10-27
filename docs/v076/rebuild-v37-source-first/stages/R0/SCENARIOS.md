# R0 场景与缺项责任

| 场景 | 既有候选测试 | 本轮证据/缺项 | 负责人 |
|---|---|---|---|
| 目录/导航/分页/选中/草稿离开 | unified-workspace-v075、left-rail-v076 | 目录元数据与API已核，导航生产采集；逐交互/三宽键盘待验 | R1 |
| overview/deck、摘要、时区、FSRS到期、近期事件 | dashboard-v076、unified-analytics-catalog-v075 | 本轮关联28测试通过；5/242/53/18夹具；不承认76%掌握率 | R2 |
| 列表详情/搜索/全选/跨页/批量/回收 | unified-card-lifecycle-v075、unified-workspace-v075 | 本轮未完整运行，精确断言不删除 | R3 |
| 三模式、模式切换、发布与媒体 | card-drafts-v075、card-draft-controller-v075、unified-model-v075 | 生产question编辑器基线；qa/direct、粘贴图片/表格/IME逐入口未验 | R4 |
| 三模式复盘/暂停/冻结思路/答错Again/FSRS | unified-review-v075、unified-rating-v075、unified-history-evidence-v075 | 真实服务189次提交+生产会话与重启；UI保存/错误流程未完整验 | R4 |
| 图谱根/子/同级/重排/正文/大纲/导入导出 | unified-knowledge-v075、knowledge-markdown-store-v075、knowledge-layers-v075 | 真实28节点/正文/关系；MD/拖拽/取消/冲突UI未完整验 | R5 |
| 设置/备份恢复/目录迁移/回收站 | 既有storage与restore/relocation专项 | 当前R0仅设置基线；general/about缺项与回收站主侧栏重复需实现 | R6 |
| 所有弹窗/hover/focus/键盘/900px | AST templates/branches/events及各组件directive | source-audit索引完整性不等于分支行为覆盖；须逐项链接用例 | R0/R1-R6 |
| Windows100/125%/中文IME/Win10/11 | 既有PR跨平台CI | CI运行只记录观察状态；本轮真实Windows NOT_RUN | R8 |

完整协议存在性/签名、gateway和tests行号见 api-component-index.json 与 page-api-map.json。测试名称/文件存在只代表关联，不代表本轮执行通过。所有UI差异留在基线，不修改原型适应现有实现。
