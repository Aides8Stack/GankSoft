# v3.7 对照与仍待验项

> **2026-10-27 用户最新视觉纠错（优先于以下历史结果）：** 本阶段截图来自采用 68px 纯图标左栏的正式界面；它**不符合**用户最终确认的 v3.7 原版 `.left-rail` 完整卡片集目录（学习总览、文件夹、各卡片集名称/数量）。以前关于“窄图标栏是批准例外”“结构视觉对齐”的判断撤销；相关功能测试历史保留，但本阶段 VISUAL 须在恢复约213px原版目录、原型顶栏与本集导航后重新截图对照。Windows VISUAL 仍 NOT_RUN，阶段仍 IN_PROGRESS。见 `docs/v076/workpack/full-fidelity-v3.7/LEFT-RAIL-CORRECTION.md`。


| 原型区域 | 正式路径/处理 | 本地结论 |
|---|---|---|
| app-shell/topbar/subnav | UnifiedWorkspace.vue；68px窄图标栏为历史错误实现，现要求恢复原版约213px完整目录；补面包屑与八项本集导航 | 历史功能/可达性测试保留，左栏视觉须重验 |
| overview 四摘要与紧凑目录 | UnifiedHome.vue / ui-v076.css；目录保留文件夹与管理操作 | 空白/合成三宽已采集 |
| 继续学习/最近学习 | 使用真实持久会话与学习历史；无记录显示空态 | 真实恢复 PASS |
| deckHome 主计划/四快捷/最近卡片 | UnifiedDeckOverview.vue；最近卡片摘要限6项，显示4项，知识名称限6 | 结构/导航 PASS |
| 原型76%/持续掌握/建议加强 | 不复制假数字；相同主指标/进度条/两行结构映射为近30天平均自评、今日完成、客观正确率；未评价如实空态 | 数据差异明示；不称掌握度 |
| cardsScreen 搜索/表格/批量条 | 同一surface内；分页/选中/详情返回保留状态 | 行为 PASS |
| cardDetail 指标/趋势/历史/正文 | UnifiedCardDetail.vue；当前模式内容与历史分区，保留事件证据按需读取 | 结构/导航 PASS |
| 原型当前内容演示说明 | 正式显示实际题干/选项/答案/解析，不复制演示占位 | 数据映射例外 |
| 1500/1366/900 同尺寸并排 | evidence/full-fidelity，原型为演示数据，生产为空白/合成606；字体均同机Noto CJK | Linux辅助证据，非Windows签核 |
| Windows/DPI/Win10/11同包 | 尚无真实Windows截图或人工签核 | NOT_RUN；不可DONE |

原型SHA256：8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015。
采集纠错：旧offscreen nativeImage曾返回1×1 PNG；新原型脚本使用匹配viewport的CDP compositor采集并强制校验PNG尺寸与字节数。原型文件未改。生产仍从真实main启动。
