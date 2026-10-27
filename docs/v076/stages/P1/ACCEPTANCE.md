# P1 接受性

> **2026-10-27 用户最新视觉纠错（优先于以下历史结果）：** 本阶段截图来自采用 68px 纯图标左栏的正式界面；它**不符合**用户最终确认的 v3.7 原版 `.left-rail` 完整卡片集目录（学习总览、文件夹、各卡片集名称/数量）。以前关于“窄图标栏是批准例外”“结构视觉对齐”的判断撤销；相关功能测试历史保留，但本阶段 VISUAL 须在恢复约213px原版目录、原型顶栏与本集导航后重新截图对照。Windows VISUAL 仍 NOT_RUN，阶段仍 IN_PROGRESS。见 `docs/v076/workpack/full-fidelity-v3.7/LEFT-RAIL-CORRECTION.md`。


四摘要/左右分区/空态/真实会话导航：本地PASS。证据evidence/内为Linux正式main，sourceSha标记P0+P1工作树，未冒称Windows。原型对照采用已验哈希源布局/颜色/间距；原型截图目前FAIL需后续补齐。Windows自动化已以最小步骤接入原ci:quality及既有validation-results上传；未新建工作流或弱化门禁，尚NOT_RUN。UI阶段整体IN_PROGRESS。


## 2026-10-27 完整复刻纠偏

FUNCTIONAL：PASS（已运行范围）。Linux截图采集PASS，逐区域差异表见 FULL-FIDELITY-DIFF.md；最终Windows VISUAL：NOT_RUN，阶段 IN_PROGRESS。Linux辅助截图不是Windows视觉签核。

> **后端全链路验收补充（2026-10-27）：** 本阶段不仅要对照 v3.7 视觉，还要由正式 Electron UI 操作验证真实 API/IPC、Schema606 业务/持久化/重启、异常取消与相关回归。各项必须按 `VISUAL / UI_INTERACTION / API_INTEGRATION / DATA_PERSISTENCE / REGRESSION / WINDOWS_REAL` 分开记录。历史已通过的测试按其真实范围继承，不能证明未测试的全链路。检查表见 `docs/v076/workpack/full-fidelity-v3.7/END-TO-END-BACKEND-ACCEPTANCE.md`。关键项未全 PASS 时阶段 IN_PROGRESS。
