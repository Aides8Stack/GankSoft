# 基础设施任务

分支：infra/development-pipeline；基线：a0fb65d89b7273c6f06beb763e66b3c4d1899a05。
本分支只推广通用规范和 CI，不继承统一图片模块业务计划。

读 AGENTS/STANDARDS、TASK 和四份状态文档，检查真实分支、HEAD、工作区及远程。
当前先核实 feature run https://github.com/Aides8Stack/GankSoft/actions/runs/39213719322 与本 infra 分支的 Actions；失败读取 job 日志并修基础设施，禁止弱化测试。
下一步为 draft PR 至 develop，等待用户审核；Windows 包未完成前不能宣称交付成功。
workflow_dispatch 要默认 main 含工作流，不能为此自动修改 main。

## 远程验证更新与修复
正常分支 71eb07cb594ab07df04a23f660b204f5ed09cf90 的 run39214134268，以及本分支0397b798884e13977e8be5585109a96faefc8e64 的 push/PR，均已通过 Linux/Windows quality。现有崩溃测试修正为严格验证 Windows/POSIX 各自终止语义，加事务内同步标记和二次幂等重试，未跳过测试；Linux 25项相关回归和198+21全量重跑PASS。
故障专用 infra/ci-gate-probe /8e2b947886548bf36d21c58ca6983021a771690e /run39214033112，两平台故意FAIL且Windows包SKIPPED，实际跨job阻断PASS；此分支永不合并。
正常 Windows 便携/安装后程序三组 smoke 均通过，安装启动卸载已执行；交付最终在ZIP中文清单默认cp1252编码失败。报告artifact12169915117；没有交付失败包。本次显式UTF-8修复，并新增禁用UTF-8模式、模拟cp1252的中文文件名/内容/SHA-256回归，本地PASS；首版模拟误改Linux文件系统编码已修正，未弱化产物断言。
当前完整流水线状态仍IN_PROGRESS，等待修复后run；Windows10/11人工NOT_RUN。PR#1已创建为Draft且未合并。新增同事件/同分支取消过时run，其他分支隔离。下一步读取当前HEAD的Actions结果与下载产物，不从旧失败run继续。
