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

## I0 最终验证回执（2026-10-19，当前权威状态）
I0 状态：DONE（通用基础设施实现与自动化验收完成；推广待用户审核 PR，不代表 develop 已生效）。本分支不承载图片业务任务。
- 功能分支被测源码：32ff1725c7a7726f6e990e2c0ccad7886ba32646；Actions run39215579198 全部 SUCCESS。
- 独立基础设施被测源码：ef976d707bb4f042e2d24f74654044bd528365bb；PR run39215634338 全部 SUCCESS，证明跨分支及 PR 复用。
- Linux/Windows 各执行全量198项（其中包括21项协议测试；check:protocol又重跑该21项，不能相加宣称独立219项）、边界/类型/前后台构建；另有5项Node基础设施测试及1项Python中文ZIP回归；Linux完整ASAR/UI/缺插件故障隔离PASS。
- Windows Server2025 Runner：便携/安装后程序的三组GUI smoke、首次数据库、图片、导入导出、备份恢复PASS；安装/启动/卸载PASS；中文清单、ZIP CRC/完整哈希manifest PASS。Win10/11人工NOT_RUN。静态ZIP校验器自身的windowsExecutionTested=false仅指该结构校验步骤，不覆盖独立的真实Windows启动报告。
- 故障分支run39214033112按预期两平台FAIL、Windows包SKIPPED，失败门禁验收PASS；该分支永不合并。
- 成功测试包：https://github.com/Aides8Stack/GankSoft/actions/runs/39215579198/artifacts/12169807402 ，290668181 bytes，包含setup.exe、portable.zip、source.json、SHA256SUMS.txt，TEST_RC；到期2026-11-02。
- GitHub记录的外层artifact SHA-256：2a07cc81558d00eac85ad2cb5a4e1dd16a9304348fb40d544b4b95cf5cd5da74。内层安装器/便携包的校验值在下载内SHA256SUMS.txt；不把外层摘要误作EXE摘要。
- 已独立下载小型报告artifact12169424713并检查source/installer/windows-portable/windows-installed JSON与独立日志：源码SHA一致，安装/启动/卸载、两组程序测试均PASS。约291MB完整产物通过连接器下载时超时，未独立重下载大包逐字节复核；不影响已成功的CI构建、生成校验值及实际GitHub产物入口。
- PR：https://github.com/Aides8Stack/GankSoft/pull/1，head infra/development-pipeline → base develop；禁止自动合并。main/develop均仍a0fb65d89b7273c6f06beb763e66b3c4d1899a05。未发布正式Release。
- 本回执只有文档变更；自身SHA从远程ref/git log解析，不循环提交自身SHA。上述测试对应明确的前序源码；文档后续CI单独读取，不冒充前序包已包含该回执。

本分支自身测试包：https://github.com/Aides8Stack/GankSoft/actions/runs/39215634338/artifacts/12170035795 ，source=ef976d707bb4f042e2d24f74654044bd528365bb；artifact SHA-256=b1d4f713032dad65f6a29ae1bb7ecf358d343c5e1b5ea80e812adf925dd04cde。
