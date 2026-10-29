# 使用 v0.7.6 Work ZIP

上传整个 `GankSoft-v076-UI-v3.7-GitHub-Workpack.zip` 到 ChatGPT Work；要求 Work 首先读取 `00-START-HERE-WORK-v076.md`。确认 GitHub 是否是最新 HEAD（包内 SHA 仅为保存时检查点），并按 `AGENTS.md` / `STANDARDS.md` 的安全工作流程审查任务分支与开发历史。

**原版 HTML 原型未嵌入 ZIP**，因为本机隔离环境不能取得完整可信字节；它已完整保存在 GitHub，使用随包 `tools/verify-and-stage-references.mjs` 从 `docs/v075/reference/OPEN-ME-v3.7.html` 复制，并必须校验 SHA256 `8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015`。原型未核验不能开始声称已按 v3.7 完成；不自行重绘原型。包内有用户所拍的失败首页图、补充设计文档、详细历史计划和验收矩阵。

主要顺序：读取已提交的 GitHub `docs/v076/WORK-PLAN.md`、`docs/v076/GITHUB-RECORDS-AND-ACCEPTANCE.md`、`docs/v076/STATUS.md`；核实代码/原型；P0–P6 开发；每阶段代码、设计、测试、证据真实 push；验证远端；正式 Windows EXE 与原型逐页比对；报告仍未完成项；所有者独立批准最终合并及发布。