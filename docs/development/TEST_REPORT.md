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
