# 跨分支开发、测试、构建与恢复规范

## 适用与启动
适用于 Aides8Stack/GankSoft 的全部未来任务分支，不以任何业务分支命名硬编码目标。
先读 AGENTS.md；核实 origin、目标分支、HEAD、最近提交、工作区、远程分支与 TASK.json。
依次读 PLAN / PROGRESS / HANDOFF / TEST_REPORT，调查源码、模块调用、API、数据库和既有测试；旧聊天与历史测试不能替代本轮证据。
如 TASK.json.branch 与当前分支不同，继承的执行状态不属于当前任务；先初始化或记录明确的继续依据。

## 新分支与独立任务状态
用户明确要求新分支时：fetch → 核实指定基线 SHA → 确认无同名已有分支 → 从指定基线创建；禁止重置、强推或覆盖用户未提交修改。
在干净的新任务分支运行：
```bash
npm run task:init -- origin/develop "新功能名称"
```
该工具不创建或切换分支。它验证基线为 HEAD 的祖先，记录基线 SHA、实际分支和任务名称，归档继承的四份文档及 TASK.json 至 docs/development/history/，然后初始化当前任务。
同一分支重复初始化会拒绝；需要继续时直接读状态。旧版无 TASK.json 的记录同样归档，AUDIT 与有效历史不删除。
填写分阶段计划、影响模块/API、数据一致性验收和测试命令后再实施。TASK.json.acceptance 必须换成当前任务具体验收标准。

| 通用共享文件 | 当前分支独立文件 |
| --- | --- |
| AGENTS.md、STANDARDS.md、tools/ci/、tools/development/、quality.yml | TASK.json、PLAN.md、PROGRESS.md、HANDOFF.md、TEST_REPORT.md |
| 从已合入公共基线的同一版本继承，业务需要时保守扩展 | 只反映本分支任务；不得把基线带来的旧任务状态认作完成 |

## 分阶段执行与恢复
每阶段：审计调用链 → 设计/更新计划 → 小范围实现 → 针对性测试及相关回归 → 定位失败并修复 → 重跑 → 更新进度、交接和账本 → 检查 diff/秘密/产物 → 明确文件列表提交 → 普通 push → 独立读回验证。
单元、API/SQLite 集成、关键复盘流程、持久化/重启、导入导出/备份恢复均按实际影响覆盖；测试使用 mkdtemp 临时库，不访问用户数据。
禁止通过删测试、跳过必要测试、弱化断言来通过。环境阻塞记 BLOCKED；重复修复仍失败记 FAIL 并留下日志及下一步。
阶段状态 NOT_STARTED / IN_PROGRESS / BLOCKED / DONE；测试状态 PASS / FAIL / BLOCKED / NOT_RUN。
实现、局部测试、全量测试、CI、Windows Runner、Win10/11 人工验收分别记录。DONE 必须有实际证据和有效检查点。
中断恢复先 fetch、检查本地 diff/WIP 和远程父链，再从首个未完成或证据失效阶段继续。不要重跑已有效验证的阶段，除非代码/环境变更使证据失效。
未完成也应保存 WIP、失败命令、日志、被测 SHA 和下一步。无法远程保存必须说明“仅本地”。提交不能包含自身 SHA；用前序 SHA 和远程历史解析当前文档检查点。
API 保存必须保留原 tree、指定真实 parent、force=false 并带 expected_sha；并发前移先重新审计。

## 自动测试、门禁与包
quality.yml：feature/**、infra/**、develop 的 push 和所有 PR 自动验证；workflow_dispatch 通过 GitHub 的 branch 下拉选择分支。
Linux/Windows 两个平台运行 npm ci → npm run ci:quality；基础设施自检（含禁用 Python UTF-8 模式时的中文文件名 ZIP 回归）、全量测试（含现有 API/数据库/复盘/图片/交换/备份）、协议/边界/类型和应用构建是强制门禁。
Linux 额外运行既有 package-check ASAR/GUI/缺原生插件测试。任一平台失败，下游 windows-package 因 needs 被阻止，不上传交付安装包。
Windows 下游重新检出同一完整 SHA，构建 x64 便携程序；复用 smoke-v060/system-v060/v072 验证首次数据库、学习、图片加载编辑、交换及备份；编译 Inno Setup 安装器，隔离临时目录安装，针对安装后的实际 EXE 重跑同组 smoke，最后卸载并验证 EXE 已移除。
GANKSOFT_E2E 与临时数据库由既有 smoke 创建；不能用伪造数据替代真实生产数据一致性逻辑。原生对话框以已有测试注入方式覆盖，不等于人工系统交互。
脚本子进程失败停止，后续项保持 NOT_RUN；日志和报告 always 上传。安装包只在本次所有必要测试通过后上传。
包名含版本、带哈希的分支标识、实际短 SHA、Windows x64、run ID/attempt；分支相似名称也不碰撞。并发组含 event/ref，只取消同事件/同分支的过时运行，不取消其他分支运行。产物含 build-metadata/source.json、锁文件 SHA-256、run URL、安装器及便携 ZIP 的 SHA256SUMS.txt。
当前是普通 TEST_RC 工件，默认保留 14 天，不创建 GitHub Release，不给 main/develop 写权限，不自动合并。正式 Release 仍须既有 release:verify；本次不新增自动发布路径。
Windows Runner 自动化不等于 Windows10/11 人工签核；人工项固定 NOT_RUN，直至真实验收。

## 上线顺序与权限边界
先在目标功能分支验证，随后将通用文件及基础设施任务自身记录放到从 develop 派生的独立基础设施分支，创建目标 develop 的 PR；不带未验收的图片业务代码或图片任务进度。
只有用户审核并合入 develop 后，从 develop 新建的分支才继承本规范。既有分支要单独合入批准的基础设施提交，不能假设自动同步。
workflow_dispatch 要求默认分支包含工作流。当前默认 main；先审核合入 develop，再由用户批准将基础设施配置推广到 main，随后 UI 手动运行可选包含该配置的目标分支。不能为启用按钮自动改 main。首次可通过 feature push 或 PR 验证，无需等待手动按钮。
GitHub API 连接器可能只能读 Actions、不能 dispatch；仍通过 push/PR 触发并实际读取 runs/jobs/artifacts。Actions 禁用、计费或权限限制据实记 BLOCKED，不把 YAML 存在记成 CI PASS。
CI 中的 needs 门禁不等于仓库强制合并保护。管理员后续可将稳定的 quality 两平台 job 设为必需检查；本次不擅改仓库规则。

## 以后使用
给 Codex：目标分支、指定基线、需求及验收；要求“按 AGENTS.md / STANDARDS.md 分阶段执行，更新本分支记录，保存远程检查点，核实 Actions，交付成功测试包与 SHA-256，禁止自动合并”。
提供失败时的 run URL/job/log、当前 SHA、状态与下一步；成功时提供实际 artifact 下载入口，不提供虚构安装包。

官方参考：https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_dispatch
https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
