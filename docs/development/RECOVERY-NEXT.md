# 最新 Work 恢复入口（2026-10-27）：R0–R8 v3.7 源码级迁移

用户已要求重新设计**实现与测试方法**。原 P0–P6 文件以下均为历史记录，不应再单纯“继续P4”。以仓库当前真实 HEAD/WIP 为准，从 `docs/v076/rebuild-v37-source-first/README.md` 和 `07-WORK-THREE-STAGES-AND-RECOVERY.md` 启动 **R0：先解析并建立 HTML DOM/CSS/JS→Vue→真实API源码级映射、同数据视觉夹具**。然后 R1主壳、R2总览。本轮最多三个阶段，先保存源码/测试/截图/未完成WIP并读回远端后**主动结束**，下一Work再继续。保留原分支和Draft PR#15、已有P0–P3成果、Schema606/FSRS/历史/Crepe/图谱；不强推、不自动合并发布，不弱化测试。当前仅设计文档修订，R阶段实现/Windows验收仍 NOT_RUN。

---

# 优先恢复导航设计（2026-10-27 最新用户要求）

原版 v3.7 HTML 左侧约213px文字目录（学习总览、文件夹、卡片集名称/数量）必须还原；错误的68px纯图标侧栏要求已经撤销。以 `docs/v076/workpack/full-fidelity-v3.7/WORK-CONTINUATION.md` 和 `LEFT-RAIL-CORRECTION.md` 为最新恢复入口，先修 P0–P3 共用主壳及相关视觉截图，再继续 P4–P6；保留 P3 已完成源码和测试历史。Windows 正式视觉 NOT_RUN。此次仅修改设计文档，UI 尚未实施纠正。

---

# v0.7.6 连续恢复

已核实远端P0–P2检查点0fb41606962435378904c7e077568dd2279bd36e，完整树6af9e0a5b5c5eb81596a411e1c22e8ad912a92f6与本地0448f1733a17686ed91374e931e6f01a9cf47e37一致；关键证据manifest已API读回。Git CLI没有凭据，保存继续走API base-tree/真实parent/force=false/expected_sha。

本检查点P3三模式编辑/复盘/分析已实现与Linux三宽辅助取证。详见docs/v076/stages/P3。9项业务关联、8项草稿/编辑器专项、三模式复盘6场景和生产UI P3通过；协议21/148方法及build通过。card-draft/workspace完整回执待补。P0–P3均IN_PROGRESS，Windows视觉NOT_RUN。

下一步连续推进P4：全屏图谱顶部结构/工具带/MD大纲与交换，随后P5设置回收站；P6保留真实Windows/便携/Win10/11签核。不能改数据库/弱化门禁/等CI/新建分支/合并发布。已保留并接入本机恢复的P3 WIP；没有覆盖原工作区。


## 新用户增补：后端全链路验收不能遗漏

与恢复原版左侧目录同时，执行 `docs/v076/workpack/full-fidelity-v3.7/END-TO-END-BACKEND-ACCEPTANCE.md`。每个页面都要验证生产 Electron UI 调用实际 API/Schema606，确保保存/复盘/FSRS/历史/知识树/图片/备份/回收站的真实业务结果、重启恢复和错误/取消；旧有效测试可继承但接口变化需补回归。UI/后端/数据/Windows结果分开记录，任何关键欠缺则阶段 IN_PROGRESS。此检查点只写规范，不冒称测试已运行。
