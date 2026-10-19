# 基础设施任务

分支：infra/development-pipeline；基线：a0fb65d89b7273c6f06beb763e66b3c4d1899a05。
本分支只推广通用规范和 CI，不继承统一图片模块业务计划。

远程 develop 与 main 审计基线 a0fb65d89b7273c6f06beb763e66b3c4d1899a05；feature 初始 27d39307d9581334f906e02b2a62db85fe8f4cfc，仅比基线多管理文档。
现有 Node>=24 / Vue3 / TypeScript / Vite / Electron / node:sqlite；当前 package 0.7.3。无现存 Actions；已有 Linux ASAR 和支持实际 EXE 路径的 Windows GUI smoke、便携打包、Win10/11 人工门禁。
本次只在原有脚本之上加编排和 Inno 安装测试，不变更业务源码或依赖/锁文件。完整远程快照 329 blob 均验证 Git hash；CLI 无凭据，API 保留 tree/parent、带 lease、非强推保存。
