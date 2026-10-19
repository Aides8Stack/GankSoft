# 基础设施任务

分支：infra/development-pipeline；基线：a0fb65d89b7273c6f06beb763e66b3c4d1899a05。
本分支只推广通用规范和 CI，不继承统一图片模块业务计划。

状态：IN_PROGRESS。通用基础设施已实现并在 feature/unified-image 的 e50aed203205a8087a032435e3ade865bc225a3a 保存。
本地 198 业务 +21 协议+4 基础设施测试、静态/类型/构建、完整 Linux ASAR/UI/故障隔离均 PASS。
该 feature 的 push 已触发真实 Actions run 39213719322（读取时 queued）；尚无 Windows 结果。后续补记本分支 PR/Actions 实测。
develop/main 未修改；PR 合并前规范未在公共基线生效。
