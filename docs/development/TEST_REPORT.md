# 基础设施任务

分支：infra/development-pipeline；基线：a0fb65d89b7273c6f06beb763e66b3c4d1899a05。
本分支只推广通用规范和 CI，不继承统一图片模块业务计划。

测试基线：完整固定 SHA 快照 27d39307d9581334f906e02b2a62db85fe8f4cfc，业务文件与 develop 相同；新增基础设施工作树。Linux Node24.19.0/npm11.9.0。
| 项目 | 结果 | 证据 |
| --- | --- | --- |
| npm ci | PASS | 524 packages |
| npm run check | PASS | 198 业务、21 协议、边界/类型/构建 |
| node --test tools/ci/core.test.mjs | PASS | 4 项；临时 Git fixture 和子进程真实失败阻断 |
| node tools/validation/package-check.mjs | PASS | 12 组 ASAR/UI + 缺图片插件故障隔离；package-v073.json |
| GitHub push 触发 | PASS | feature e50aed2 run 39213719322，queued 不等于成功 |
| GitHub 完整质量/Windows 构建 | NOT_RUN | 尚待 Runner 执行 |
| GitHub 失败跨 job 阻断 | NOT_RUN | 本地逻辑已实测；远程尚未验证 |
| Win10/11 人工签核 | NOT_RUN | 不以 Runner 冒充实机 |

## 远程验证更新与修复
正常分支 71eb07cb594ab07df04a23f660b204f5ed09cf90 的 run39214134268，以及本分支0397b798884e13977e8be5585109a96faefc8e64 的 push/PR，均已通过 Linux/Windows quality。现有崩溃测试修正为严格验证 Windows/POSIX 各自终止语义，加事务内同步标记和二次幂等重试，未跳过测试；Linux 25项相关回归和198+21全量重跑PASS。
故障专用 infra/ci-gate-probe /8e2b947886548bf36d21c58ca6983021a771690e /run39214033112，两平台故意FAIL且Windows包SKIPPED，实际跨job阻断PASS；此分支永不合并。
正常 Windows 便携/安装后程序三组 smoke 均通过，安装启动卸载已执行；交付最终在ZIP中文清单默认cp1252编码失败。报告artifact12169915117；没有交付失败包。本次显式UTF-8修复，并新增禁用UTF-8模式、模拟cp1252的中文文件名/内容/SHA-256回归，本地PASS；首版模拟误改Linux文件系统编码已修正，未弱化产物断言。
当前完整流水线状态仍IN_PROGRESS，等待修复后run；Windows10/11人工NOT_RUN。PR#1已创建为Draft且未合并。新增同事件/同分支取消过时run，其他分支隔离。下一步读取当前HEAD的Actions结果与下载产物，不从旧失败run继续。
