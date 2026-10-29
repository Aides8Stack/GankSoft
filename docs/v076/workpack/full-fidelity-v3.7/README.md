# GankSoft v0.7.6 — 原版 v3.7 完整还原设计包 v3（导航纠错版）

**2026-10-27 用户最终明确：原型优先，不再承认纯图标左侧栏为保留要求。** v3.7 原型的左侧 `.left-rail`（约 213px）应直接还原：GankSoft 品牌、学习总览、文件夹分组、卡片集名称和数量、选中态、设置与状态。卡片集须在左侧可见；不是在最左边另造一列图标。顶部路径与本集二级导航也须保留。正式版缺少原型 UI 可以补充，必要新增功能 UI 允许加入，但**不允许因此更换原型主布局**。

**此文件与本目录下三份规范、根计划 `docs/v076/WORK-PLAN.md` 及 `docs/v076/workpack/00-START-HERE-WORK-v076.md` 为权威纠正。** 旧版设计包 v2 中“窄图标栏必须保留”已撤销；历史截图和 P0–P3 的功能 PASS 仍是有效历史，但先前关于纯图标导航“符合原型”的视觉结论失效。

阅读顺序：
1. `FULL-FIDELITY-SPEC.md` — 完整原型复刻要求和用户最终导航决策；
2. `LEFT-RAIL-CORRECTION.md` — 原型左侧文字目录的逐项还原、导航交互及验收条件；
3. `UI-MAPPING-AND-ACCEPTANCE.md` — 阶段映射及 P0–P3 需重验的侧栏差异；
4. `WORK-CONTINUATION.md` — Work 连续纠偏与开发指令；
5. `docs/v075/reference/OPEN-ME-v3.7.html` — 冻结原版 HTML；
6. `docs/v076/WORK-PLAN.md`、`GITHUB-RECORDS-AND-ACCEPTANCE.md`、`docs/v076/workpack/UI-DESIGN-SPEC.md`。

GitHub 正式包：`docs/v076/workpack/GankSoft-v076-v3.7-Full-Fidelity-Design-Pack-v3.zip`；原 `...-v2.zip` 文件路径同样以纠正后的包替换，防止旧链接继续传递错误指令。已发生的源码改动保留，**本次仅修正文档与 ZIP，未实现新的 Vue UI，也未开展 Windows 视觉验收**。


**后端完整性强制验收**：新增 `END-TO-END-BACKEND-ACCEPTANCE.md` 为同等级权威文件；每个 UI 动作必须验证真实协议/API、后端业务、数据库/重开持久化、错误/取消与回归，不能只测外观或按钮可点击。阶段只有视觉与功能双重全链路证据都满足才 DONE。
