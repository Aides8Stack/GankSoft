# 基础设施任务

分支：infra/development-pipeline；基线：a0fb65d89b7273c6f06beb763e66b3c4d1899a05。
本分支只推广通用规范和 CI，不继承统一图片模块业务计划。

读 AGENTS/STANDARDS、TASK 和四份状态文档，检查真实分支、HEAD、工作区及远程。
当前先核实 feature run https://github.com/Aides8Stack/GankSoft/actions/runs/39213719322 与本 infra 分支的 Actions；失败读取 job 日志并修基础设施，禁止弱化测试。
下一步为 draft PR 至 develop，等待用户审核；Windows 包未完成前不能宣称交付成功。
workflow_dispatch 要默认 main 含工作流，不能为此自动修改 main。
