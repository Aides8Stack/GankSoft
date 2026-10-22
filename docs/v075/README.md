# GankSoft v0.7.5 阶段资料

当前进入S1：S1.a只读预检/fixture/备份基线本地完成，CI待核实；S1.b/S1.c尚未启动。S0证据继承，以下基线文档保留原审计时点。先看 docs/development/TASK.json、PROGRESS.md、HANDOFF.md、TEST_REPORT.md，再看本目录：

- AUTHORITY-AND-DECISIONS.md / FUNCTIONAL-SPEC.md / TEST-MATRIX.md：用户交接包对应原文，逐字保留；新用户明确决策优先。
- ARCHITECTURE-BASELINE.md / SCHEMA604-INVENTORY.md：真实源码、表字段、API、UI及测试差距。
- MIGRATION-ADR.md / API-CONTRACT-DELTA.md：目标设计，非已存在表/接口。
- PHASE-GATES.md：下一阶段最小入口及完整S1–S9门禁。
- evidence/BASELINE-TEST-OUTPUT.txt：本轮实际基线命令输出；与历史结果分开。

源包：`GankSoft-v0.7.5-Work-Handoff-v1.0(1).zip`（用户上传同v1.0文件）；SHA256 `308555d32bc8543c83fc661d8fead52986c9bdaad7882f3cd662992c0bb6ad03`，包完整性脚本PASS。包内 `08-references/UI/OPEN-ME-v3.7.html` SHA256 `8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015`。

UI HTML已实际打开审阅；只作视觉/交互参考，未复制到Vue。后续需原型时重新打开用户提供包中的上述路径；不要根据旧历史压缩包恢复已废弃需求。原型截图/测试不是生产验收。

S0无业务源码变更。当前S1.a新增迁移前基线/fixture/测试，最小调整备份校验；版本依现有门禁预留0.7.5-rc.1，schema仍604、依赖不变、流水线未改。最终提交身份与Actions回执见docs/development/HANDOFF.md及远程Draft PR；没有自动合并或发布。
