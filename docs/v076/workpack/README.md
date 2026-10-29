# 最新设计实现测试工作包入口（2026-10-27）

**最新权威为 `docs/v076/rebuild-v37-source-first/README.md`**；旧工作包 v2/v3 仅供历史对照，勿把旧P0–P6开发策略当新指令。R0–R8按原版v3.7 HTML源码迁移Vue，双轨同数据视觉+真实后端E2E，最多3阶段一轮、完成保存远端后主动结束。原版213px完整卡片集目录；设置内回收站；不重写Schema606/FSRS，禁止仅“截图像”。新ZIP为 `docs/v076/workpack/GankSoft-v076-v37-Source-First-Design-Implementation-Test-v1.zip`。

---

# GankSoft v0.7.6 Work 完整执行资料（已同步 GitHub）

本目录保存原工作包的全部**可直接复用的文本执行文件与补充设计规范**，不依赖临时聊天 ZIP。原型源码不重复复制，唯一原件为 [OPEN-ME-v3.7.html](../../v075/reference/OPEN-ME-v3.7.html)，需校验 SHA256 `8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015`。

**最新导航纠错（2026-10-27）**：先读 `full-fidelity-v3.7/README.md` 和 `full-fidelity-v3.7/WORK-CONTINUATION.md`。旧包内“必须保留纯图标窄侧栏”的条文已经撤销。按冻结的 v3.7 HTML 恢复左侧约213px文字目录（学习总览、文件夹、卡片集名称/数量）和原型顶栏、子导航；允许补齐必要 UI。

**历史资料阅读顺序：** `../WORK-PLAN.md` → `../GITHUB-RECORDS-AND-ACCEPTANCE.md` → `../STATUS.md` → `00-START-HERE-WORK-v076.md` → `02-REQUIRED-PHASE-FILES.md` → `UI-DESIGN-SPEC.md` → `MD-EDITOR-REVIEW-v3.7.md` → 原型。

`archive/` 仅为上一轮 v0.7.5 工作包的完整文档留档，**不能覆盖** v0.7.6 最新确认的 UI 原型直接实施、版本和 Github 同步要求；涉及真实 Schema606 或现有功能，以现有源码、权威决策和用户最新指令为准。

每个阶段 P0–P6 要将设计、实际前端改动、测试脚本、可公开验收图片和报告同步 GitHub，确认远端 SHA；不得只保存 Work 临时文件。现有工作包的截图为用户提供的简陋首页反例，仅作失败基线；该截图未在本次文本提交中写入 GitHub，后续可在安全检查后作为独立证据。

**历史注释纠正**：此 README 初次建立时仅有设计材料；现在 P0–P3 已有真实源码与 Linux 辅助证据，但原版左侧目录仍待纠正，Windows 最终视觉 NOT_RUN。新 v3 ZIP 为最新版开发设计包，原 v2 ZIP 路径也已替换为更正内容；请勿沿用旧版本的窄侧栏指令。


**用户新增强制后端全链路验收**：`full-fidelity-v3.7/END-TO-END-BACKEND-ACCEPTANCE.md`，不得只检查 UI，须每页检查真实协议/后端/数据写入持久化/重启/错误/回归并单独记录结果。
