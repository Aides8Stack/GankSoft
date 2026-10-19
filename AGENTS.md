# GankSoft 持续开发规则

## 每次任务的第一步
先确认仓库为 https://github.com/Aides8Stack/GankSoft；从本次用户任务与真实 Git 状态确定目标分支，不能把旧任务分支作为全局默认。
先读取 `docs/development/STANDARDS.md`。公共基线为 develop，稳定分支为 main。
读取本文件，再依次读取 `docs/development/TASK.json`（若存在）、 `docs/development/PLAN.md`、`PROGRESS.md`、`HANDOFF.md`、`TEST_REPORT.md`；如有 `AUDIT.md`，读取并核对其时效。不得只依赖聊天记忆。
检查工作区、远程分支、HEAD、最近历史和部分修改；以真实代码、Git 历史和测试证据为准。冲突先调查并修正文档，不重复已完成且验证有效的工作。
目录内如出现更具体的 AGENTS.md，应先读取并遵守适用规则。

## 已核实的架构
当前应用版本 0.7.3 RC。Node.js >=24；Vue 3、TypeScript、Vite、Electron；后台使用 Node 内置 node:sqlite。
- src/：Vue UI、composables、store.ts 与 services.ts；前端不得直接访问 SQL、文件系统或后台模块。
- shared/：纯函数、公共模型；shared/protocol/registry.ts、data.ts、model-codec.ts 为公共契约链路。
- electron/preload.cts：仅暴露 gank.protocol，IPC 通道为 gank:protocol。
- electron/protocol/：网关、事务、回执；electron/modules/：领域服务；electron/infrastructure/：SQLite、图片校验、备份和安全容器。
- tests/、tools/：业务/协议测试、边界、打包、Electron smoke、发布门禁。
当前数据库 schema604，数据目录 v060/data，内容交换协议 ganksoft.content 2.0。版本信息修改前须重新核实。

## 开发约束
高内聚、低耦合、模块化；先查调用者、数据流、API、持久化和测试，再修改。
复用已有系统，不从零重写；禁止一次重写全部图片相关模块。一个阶段范围清晰，可有多个小提交，不必每阶段另开分支。
统一 API 与数据协议：契约、codec、服务、数据库、快照、导入导出、备份共同核验，不能仅让 UI 临时工作。
状态管理必须与持久化一致；保留事务、并发修订/数据 epoch、幂等回执、会话草稿和历史快照语义。
允许废除拖累新架构的旧协议及旧实现，不要求全面兼容旧版；必须先记录新协议、删除范围、旧数据处理策略，并保证新版内部完整性、隔离和回归测试。不以兼容性豁免为由漏测新版。
设计决策落入仓库文档；改变计划先更新 PLAN.md 并解释原因。

## 测试与状态
状态只用 NOT_STARTED / IN_PROGRESS / BLOCKED / DONE。DONE 需要实现文件、实际验证和可追溯检查点；WIP 永远不是 DONE。
TEST_REPORT.md 使用 PASS / FAIL / BLOCKED / NOT_RUN，记录命令、环境、阶段和被测 SHA/工作树。未运行不得记 PASS；历史报告不得当作本轮重跑。
npm ci 后按阶段运行 npm test、npm run check:protocol、npm run build 或 npm run check，并补必要 smoke/导入导出/备份回归。读取 package.json 核对命令。
Linux 测试、CI 和 Windows 包静态检查均不能冒充 Win10/Win11 实机验收。Windows 真机未签核保持 RC。

## 阶段检查点与安全
闭环：读状态和记录 → 确定阶段 → 只改当前范围 → 测试及必要回归 → 更新三份执行文档 → 审 diff/敏感信息/产物/无关修改 → commit → 普通 push → 重新读取远程确认。
详细命令及连接器替代流程见 HANDOFF.md。只提交逐项确认的文件，不盲目 git add .。
不覆盖用户未提交修改；不 reset --hard，不 force push，不改写既有提交。禁止无授权覆盖分支、删除仓库或重建项目。
只向本次已核实目标分支保存检查点；新分支必须经用户任务授权，从指定基线创建，不重置已有分支。develop 为集成分支，main 为稳定分支，不自动修改或合并它们。
新任务运行 npm run task:init -- <base-ref-or-SHA> "任务名称"，先归档继承的旧状态，再填写当前分支计划；不得重复初始化当前任务。基础设施推广使用只含通用改动的独立分支/PR，不能夹带业务变更。
push 被拒或远程前移：保留本地提交，读取新状态后调查；禁止强推解决。需要 PR 时使用真实支持的流程并记录 URL、head/base、待人工动作；不把 PR 创建当作已合入目标。
任务结束前尽可能提交 WIP，并记录未完成范围、失败测试与下一步；无法 push 必须明确报告“仅本地/未远程保存”。突然中断前没有提交/推送的改动无法由文档自动恢复。
GitHub API 保存时必须以已核实 HEAD 的 tree 为基础、父提交指向该 HEAD、仅增改允许路径、更新 ref 时 force=false；远程改变先重新审计，禁止用空 tree 替换仓库。
Commit 不可能在自身内容中包含自身 SHA：文档记录已知前序检查点 SHA，当前文档检查点用 git log -1 -- docs/development 与远程包含关系解析；下一次提交补记回执，禁止为写入自身 SHA 无限提交。

## 自动化门禁
功能分支与 PR 必须运行 .github/workflows/quality.yml。npm run ci:quality 执行基础设施自检、全量测试、协议边界/类型、前后台构建；Linux 另执行 ASAR/UI 回归。任一必要测试失败不进入 Windows 测试包构建。
Windows 测试包执行原生依赖/首次数据库/图片/导入导出/备份/GUI、安装后启动与卸载；仅成功产物上传安装器、便携 ZIP、来源及 SHA-256。失败保留日志，未运行记 NOT_RUN。不得通过删测试、跳过测试、削弱断言或 continue-on-error 制造成功。
普通测试包不创建 Release；正式放行仍需既有 release:verify 与同包 Win10/11 人工验收。本规范合入公共基线后，新分支才能继承；仅有功能分支提交不代表 develop 生效。
