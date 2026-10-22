# GankSoft v0.7.5 阶段资料

当前S1整体IN_PROGRESS：S1.b的f24c6b05e10e925a52a7ff57c62f300a40597d25双平台/可信已核通过；S1.c迁移no-op/故障恢复/604与606完整备份/显式单写者激活本地完成，当前新SHA CI待核。生产默认604，没有自动升级真实用户库；尚未进入S2。S0证据继承，以下基线文档保留原审计时点。先看 docs/development/TASK.json、PROGRESS.md、HANDOFF.md、TEST_REPORT.md，再看本目录：

- AUTHORITY-AND-DECISIONS.md / FUNCTIONAL-SPEC.md / TEST-MATRIX.md：用户交接包对应原文，逐字保留；新用户明确决策优先。
- ARCHITECTURE-BASELINE.md / SCHEMA604-INVENTORY.md：真实源码、表字段、API、UI及测试差距。
- MIGRATION-ADR.md / API-CONTRACT-DELTA.md：含S1.b已实施边界；其余未来合同仍是目标设计。
- PHASE-GATES.md：下一阶段最小入口及完整S1–S9门禁。
- evidence/BASELINE-TEST-OUTPUT.txt：本轮实际基线命令输出；与历史结果分开。

源包：`GankSoft-v0.7.5-Work-Handoff-v1.0(1).zip`（用户上传同v1.0文件）；SHA256 `308555d32bc8543c83fc661d8fead52986c9bdaad7882f3cd662992c0bb6ad03`，包完整性脚本PASS。包内 `08-references/UI/OPEN-ME-v3.7.html` SHA256 `8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015`。

UI HTML已实际打开审阅；只作视觉/交互参考，未复制到Vue。后续需原型时重新打开用户提供包中的上述路径；不要根据旧历史压缩包恢复已废弃需求。原型截图/测试不是生产验收。

S0无业务源码变更。S1.a新增迁移前基线/fixture/测试、最小备份校验；S1.b新增隔离606模型和3个typed只读接口；S1.c新增显式恢复协调器/同事务adapter，本地验证受控606，未接入生产自动升级；版本依现有门禁预留0.7.5-rc.1，schema仍604、依赖不变、流水线未改。最终提交身份与Actions回执见docs/development/HANDOFF.md及远程Draft PR；没有自动合并或发布。
