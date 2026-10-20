# Windows 打包故障核验与重新构建（2026-10-20）

本节覆盖下方旧“CI待核实”状态，仅针对本次核验的运行。目标 feature/unified-image-recovery；核验时 HEAD 57725a646aac73850baef0d223ec88344589f2d9；Draft PR #2 → develop，未合并。

- 指定失败运行 https://github.com/Aides8Stack/GankSoft/actions/runs/39242846944 ，被测64f7e3a1fe586349947f07cb50eac82a26b561cd。windows-package Job 118029552865 在smoke-v072.mjs旧版534行等待.study-main .media-node可见超时；两平台quality成功。
- 根因：CardExplorer行内学习按钮在列表刷新时仍可点击；start(ids)遇loading/failure直接return，未导航至学习页面。属于UI状态与异步刷新竞态，并非缺图数据，也不是需要延长图片加载超时。历史修复99f379e605d7b5027b763ab6fbc636a08c8b7351仅给该按钮补loading/failure/working的disabled绑定；当前HEAD包含该修复。
- 证据：已读失败Job全文、修复提交与当前调用链；smoke-v072原学习/图片/420px断言仍在，默认15000ms未变。最新HEAD push运行39281222855和PR运行39281229958均completed/success；push两平台quality与windows-package均success。已读成功Windows Job 118156591541全文，便携版与安装后版本均通过memory-editor-image-persistence-and-readonly-study-node、选项图片、图片编辑和原图篡改拒绝回归，安装/启动/卸载步骤成功。
- 已有可下载测试包：https://github.com/Aides8Stack/GankSoft/actions/runs/39281222855/artifacts/12201575988 。名称GankSoft-0.7.3-feature-unified-image-recovery-d0a191b3-57725a646aac-windows-x64-39281222855-1；API返回未过期，expires_at=2026-11-02T16:00:50Z。外层Artifact摘要sha256:7285e727d6843915898ce4a971880bc37d845bd0f243c217f7b5986df2f3f2a3，不冒充内部安装器摘要；本轮未下载核对内部SHA256SUMS。
- 本轮不重复修复已修正业务，不删测试、不改超时或质量门禁；仅更新PROGRESS/HANDOFF/TEST_REPORT/TASK记录后沿原分支追加提交，触发既有quality.yml的push/PR完整门禁及下游Windows安装包构建。新提交自身SHA、run链接从远程历史及本轮最终答复解析，不为回填自身SHA无限提交。
- 本轮本地完整业务/GUI测试NOT_RUN：终端无私有仓库Git凭据，起始目录无checkout；不能把远程成功或历史本地215项冒充本轮本地重跑。本轮执行记录JSON/允许路径/差异校验；现有源码回归依据上述真实CI日志。没有新增业务代码需要本地回归。
- 新提交CI及新安装包：待核实；确认Actions触发即交接，不轮询不等待。下载位置为新Actions运行页面底部Artifacts中GankSoft-0.7.3-...-windows-x64-<run>-<attempt>，仅全部必要门禁成功后出现；reports不是安装包。
- 下次：读取本轮最终答复记录的SHA和run，成功则核对同SHA产物及内部SHA256SUMS；失败读失败Job和日志、局部修复并回归后追加提交，再次交接。不重跑旧失败64f7e3a，不合并、不发布Stable、不修改main/develop。Windows10/11人工验收NOT_RUN，保持RC。

---

# 当前交接：提交后退出，不等待 CI（2026-10-19）

本节覆盖下方历史“继续等待/读取CI”的指示。按用户最新要求，本轮仅保存交接检查点、确认触发信息后退出；不轮询、不等待 Windows 构建、不自动合并或发布。后续收到“检查 CI 并继续”再读取真实结果。

- 分支：feature/unified-image-recovery；本次交接前 HEAD：bfa1bcb2659421bd28cc44f35c6b0ae28eea3c0b。本次仅改任务文档，源码保持 6982c8b255bfad851480044d38b2aa496e81084c。当前交接提交自身 SHA 从远端 HEAD / Git 历史解析，不为回填自身 SHA 循环提交。
- 已完成：A4 39872e1125786165ceef81544303d1c383e2ec5b；A5 ee112298b6d5e115cb54a147d329f77157e893cc；A6 自动开发与源码回归已保存 6982c8b。保留原快照和恢复备份；已知 LICENSES/MSVC-Redistributable-License.rtf 格式差异不提交。
- 本地实际验证：npm run check 215/215（含21协议项），另协议重跑21/21、边界/TypeScript/导出/构建 PASS；基础设施5项、中文ZIP 1项 PASS；UTC/上海各15组日期GUI PASS；12组ASAR/UI及缺原生插件隔离 PASS（图片/页面smoke含28组）。这些是已执行证据，本次纯交接文档更新不重复业务测试。本地 ci:quality 整体因快照无Git元数据而 BLOCKED；不伪造Git来源，真实GitHub检出已验证源码入口。
- 已验证源码 CI：6982c8b 的 push [39276029426](https://github.com/Aides8Stack/GankSoft/actions/runs/39276029426) 与 PR [39276185861](https://github.com/Aides8Stack/GankSoft/actions/runs/39276185861) 均 completed/success；两平台quality、Linux ASAR/UI及Windows自动打包/便携与安装后GUI/安装启动卸载通过。该结论仅属于6982c8b。
- 最新已知文档提交 CI：被测 bfa1bcb2659421bd28cc44f35c6b0ae28eea3c0b，push [39277780284](https://github.com/Aides8Stack/GankSoft/actions/runs/39277780284)、PR [39277789098](https://github.com/Aides8Stack/GankSoft/actions/runs/39277789098)，最后观测均运行中，最终结果待核实。不能将前序成功套用于这两个运行或本次新交接提交。
- 本次新交接提交：保存后只查询一次 Actions 触发记录，SHA/运行编号/链接写入本轮最终答复及现有PR说明；用 actions/runs?head_sha=<本次远端HEAD> 定位。若尚未可见则明确记“触发待核实”，不轮询、不为运行编号另启文档提交循环。当前完整CI、Windows构建及包校验结论均待核实。
- 集成：[Draft PR #2](https://github.com/Aides8Stack/GankSoft/pull/2)，head recovery → develop；保持Draft、不合并、不删分支、不改main、不发布Release。Windows10/11人工验收 NOT_RUN，保持0.7.3 RC。安装器/便携包的独立下载与SHA256SUMS核验待后续，不能把GitHub外层artifact摘要当作安装器摘要。

## 下次恢复步骤（等待用户“检查 CI 并继续”）

1. 读取真实远端HEAD、工作区与本次交接提交的Actions；不重复A1—A5或重置快照。检查push与PR的Linux quality、Windows quality、Windows-package最终状态；未完成仍标运行中/待核实。
2. 成功：读取实际被测SHA、产物来源与保留期限，核实安装器/便携包和SHA256SUMS，补交付记录；安排同一测试包Windows10/11人工验收，未签核继续RC。PR仍不自动合并。
3. 失败：保留本次与既有检查点，读取失败Job/日志定位真实缺陷；只修必要范围，不删除断言、不增加超时掩盖问题、不绕过质量门禁。运行对应本地回归，更新三份记录，沿本分支非强制提交/推送并远程读回，再确认Actions触发后交接退出，不等待新CI。
4. API/推送失败：保留本地修改与备份并报告未远程保存；远端前移先核查，不force push、不reset、不删除已有成果。禁止把仅创建Commit对象当作分支保存完成。

---

# 最终恢复入口：自动开发完成，待人工签核（2026-10-19）

唯一开发分支feature/unified-image-recovery。最新业务源码检查点6982c8b255bfad851480044d38b2aa496e81084c（父ee112298及已批准develop c8db715）；后继文档回执SHA从远端HEAD读取。A4=39872e1125786165ceef81544303d1c383e2ec5b，A5=ee112298b6d5e115cb54a147d329f77157e893cc，均已保存。repo-snapshot保留；许可证RTF本地格式差异排除提交。
A6本地215测试/协议/类型/构建、5基础设施、1中文ZIP、UTC/上海各15组GUI、12组ASAR/UI与缺插件回归（图片smoke28组）PASS。源码6982c8b的push Actions39276029426、PR Actions39276185861完整SUCCESS，六个Job均成功，含Windows便携/安装后程序、安装、启动与卸载。真实回执见TEST_REPORT末尾和PR说明。
已有Draft PR #2：https://github.com/Aides8Stack/GankSoft/pull/2 ，head恢复分支、base develop，禁止重复创建或自动合并。本次仅补充4份文档；后继文档提交自动CI需从远端实际核验，不把源代码包误称含后继文档。
剩余：IMAGE_ACCEPTANCE.md中的Win10/11同包人工验收（系统剪贴板/原生对话框/DPI等）全部NOT_RUN；保留RC和Draft，等待用户审核。不自动发布Release、不删分支、不改main/develop。恢复时读HEAD/当前CI/PR状态，若没有新问题无需重跑已有效验证的开发阶段。TEST_RC安装器/便携ZIP和SHA256SUMS在上述Actions的成功test-package工件，默认保留14天；最终最新工件以PR说明为准。

---

# 当前交接入口（2026-10-19，覆盖以下历史）

仓库Aides8Stack/GankSoft；唯一开发分支feature/unified-image-recovery。原工作区repo-snapshot保留，为源码快照而非Git checkout，禁止重建/重置。远端A4=39872e1125786165ceef81544303d1c383e2ec5b，A5=ee112298b6d5e115cb54a147d329f77157e893cc，两者完整CI均SUCCESS；64f7e3a仅历史检查点。
A6本地最终215测试/21协议重跑/边界/TypeScript/构建、5基础设施、1中文ZIP、UTC/上海GUI、全12组ASAR/UI/缺插件隔离已通过。新增原图读取哈希及缓存回归使v072为28组。原始失败与最终日志见TEST_REPORT末尾，不以旧失败或旧成功代替当前验证。
A6有效变化已经审查；许可证RTF读取格式差异排除。API保存以真实HEAD tree和第一父提交为基线、force=false+expected_sha。develop c8db715已批准基础设施与当前同名文件完全相同，AGENTS仅schema604→605；在恢复分支记录其额外父提交以对齐已批准历史，保留全部图片与任务文档，不向develop/main写入。
恢复时先读取远端HEAD及其git/commits/递归tree，确认本阶段后继提交包含ee112298；随后读取当前SHA的Actions/jobs/artifacts和head为本恢复分支的PR，复用已有Draft，目标develop。CI未成功不得宣布A6自动验收完成；失败先修、测试、提交、读回。PR创建及最新CI回执也保留在PR说明，禁止重复创建。
Windows10/11人工仍NOT_RUN；按IMAGE_ACCEPTANCE同包验收。取消表单未绑定草稿保守保留，独立清理需重查引用，不能以用户暂停推断可删除。旧media.remove/import/paste为METHOD_RETIRED拒绝桩，capabilities排除，不能重新接入旧写通路。后续只做剩余CI/集成检查和人工验收，不重做A1—A5、不自动合并/删分支/发布。

---

> I0 通用基础设施升级已完成，当前权威入口见本文末尾 I0 最终状态；前文保留 M0 历史。先读 STANDARDS 与 TASK，不直接执行旧任务的下一步。

# 新 Codex 任务恢复入口

仓库：https://github.com/Aides8Stack/GankSoft （private）
开发分支：feature/unified-image；集成 develop；稳定 main。禁止自动合并/修改后两者。
最新已确认远程 Commit（写入本回执时）：d743c10c09c4e1bbd57d2749f8665fd5dae8c9ae（M0 初始化检查点）。
当前阶段 M0 DONE：管理文档、实际检查、初始化提交和远程读回均完成。下一阶段 P1 NOT_STARTED；P2—P6 均 NOT_STARTED。
本文件不能嵌入承载自身提交的 SHA；最新文档检查点需读取远程 HEAD 和 git log -1 -- docs/development 核实，下次更新回填前序已确认 SHA。

## 最近工作与未完成修改
已读取真实远程树、历史、README、package、图片主要前后台链路；新增六份管理文档并确认远程保存；本回执保守更新 PROGRESS/HANDOFF/TEST_REPORT；未修改业务代码。
基线中每组共用 width，尺寸不持久保存；不是已实现独立图片缩放。
无本轮未完成业务代码；任务被突然中断时，先检查 git status/diff 与 WIP 提交，不能假设没有部分修改。
详细路径、初始分支 SHA、风险与权限事实见 AUDIT.md。

## 恢复步骤（每次都执行）
1. 核对 origin 为 Aides8Stack/GankSoft；确认有真实检出。若只有连接器，按固定远程 SHA 读取，不伪称有本地分支。
2. 检查 git status --short --branch、git remote -v、git rev-parse HEAD；git fetch origin 后核对 origin/feature/unified-image。保留用户脏工作区，禁止 reset/强推。
3. 读取根 AGENTS.md，再读 PLAN、PROGRESS、本文件、TEST_REPORT 和需要的 AUDIT。
4. git log -10 --oneline --decorate；核对最新文档检查点与远程包含关系，不把文档中前序 SHA 误作当前 HEAD。
5. 用代码和测试调查文档声明；冲突先修记录。检查未完成 diff/WIP，从第一个未完成或证据失效阶段继续。
6. 下一项业务任务是 P1：补齐全仓图片调用图、设计/API、完整依赖基线；本次初始化不授权跳过设计直接一次性重写。

## 关键入口
ImageAttachments / QuestionEditor → src/services.ts → shared/protocol/registry.ts / data.ts / model-codec.ts
→ electron/preload.cts 的 gank:protocol → main.ts / protocol/gateway.ts → modules/media/drafts.ts / questions
→ infrastructure/schema.ts / images.ts；app-media://asset/draft/history 读取。
ReviewWorkspace、ReviewRecordDetail 是其他显示入口；sessions/events、review、export/import、backup 必须覆盖。
初审风险：尺寸字段缺失，历史/草稿模型不同，严格协议过滤字段，跨集隔离，Windows 原生解码。

## 标准检查点
以下命令在实际仓库、正确分支且无冲突时逐条执行，不能直接在快照目录执行：
```bash
git status --short --branch
git remote -v
git fetch origin
git rev-parse HEAD origin/feature/unified-image
git diff
git diff --check
# 按 PLAN 执行阶段检查，更新 PROGRESS/HANDOFF/TEST_REPORT
# 逐项 git add <本阶段文件>；检查暂存内容及秘密/产物
git diff --cached --stat
git diff --cached --check
git diff --cached
git commit -m "docs: initialize persistent development checkpoints"
git push origin HEAD:refs/heads/feature/unified-image
git fetch origin
git merge-base --is-ancestor HEAD origin/feature/unified-image
git ls-remote origin refs/heads/feature/unified-image
```
提交标题应随实际阶段改变；WIP 标明阶段与未完成部分。远程前移/拒绝不得强推，先调查。
未完成且需结束：记录状态 IN_PROGRESS/BLOCKED，保存 WIP；push 失败如实报告本地 SHA 和原因。

若 CLI 缺凭据但 GitHub 连接可写：读取目标 HEAD → 以其 tree 为 base_tree 创建仅允许文件的 tree → 以该 HEAD 为 parent 创建 commit → 重读 HEAD → force=false 更新 feature ref → 读回 ref/tree/compare 验证；并发变化先重审，绝不覆盖其他提交。
只有 PR 工作流时，保存到受支持的任务分支，记录 PR 的 base=feature/unified-image、head、URL 和未合入状态；未实际创建不得声称可用。不得创建 develop/main 的自动合并流程。

## 测试命令与限制
完整 checkout / Node>=24 后：npm ci；npm run check；按影响 npm run smoke、npm run smoke:v071、npm run test:package。
本版 UI：npm run build 后 node tools/smoke-v073.mjs。GUI smoke 需要 Electron/显示及系统库，失败据实记。
Windows 打包 npm run package:portable:win；真机按 docs/v0.7.3-windows-acceptance.md、tools/validation/windows-test.ps1；新增图片用例必须覆盖持久/交换/恢复。
当前 Linux 边界检查 PASS，其余本轮未执行；不能引用旧版 198 项报告来替代新基线。

## 本轮 GitHub 实际保存能力
终端没有私有仓库认证，但已通过连接器成功 create_tree(base_tree_sha)、create_commit(parent_sha)、update_ref(branch_name, sha, force=false)，并独立读回验证 d743c10c09c4e1bbd57d2749f8665fd5dae8c9ae。
没有创建 PR、没有合并；PR 创建能力仍未实测，不要求人工完成本初始化保存。main/develop 未变。
一次空参数 ref 能力探测被自动审批拒绝（缺明确目标/父链保护）；未执行变更。随后提供真实目标分支、已验证父链/tree、非强制参数后通过。未来禁止空参数探测写操作。

## 当前恢复入口覆盖说明 — I0 基础设施任务
本节是当前任务入口；上文为保留的 M0 历史记录，不应直接照抄旧 feature 硬编码流程到新分支。
先读通用 STANDARDS.md，再读当前 TASK.json 和本节。目标仍 feature/unified-image；仅升级基础设施，不能启动图片 P1。
远程前序 HEAD：27d39307d9581334f906e02b2a62db85fe8f4cfc；本地是逐 blob 验证的远程快照，不是 Git clone，没有本地分支/HEAD。
下一步：读 Actions 实际 run/jobs/artifacts；失败调查日志、只修基础设施；以 develop 精确基线另建 infra 分支，仅移植通用文件并创建 develop PR，不合并。
手动 workflow_dispatch 需默认 main 含工作流，当前不自动修改 main；首次用 push/PR。

### I0 已验证检查点与恢复
feature 远程检查点 ab404a5cf2e05b3ae9b90b5b1e0ca9c9233ae4a1；infra/development-pipeline 检查点 856e55d6ead81806d7737aa148f9c0c0a7b0baf3。
PR：https://github.com/Aides8Stack/GankSoft/pull/1，base develop，独立基础设施，未合并。
故障分支 infra/ci-gate-probe 永不合并；run39214033112 已证明测试失败阻断 Windows 包。正常运行 run39214134268 已通过两平台 quality，Windows 包仍需读取最终结果；当前分支最新运行39214363793、infra最新 push39214409453/PR39214414111。
后续依据真实 runs/jobs/artifacts 补记结果，若失败读取 logs 后修复辅助脚本；不能把正在执行记成 PASS。Win10/11 人工验收仍 NOT_RUN。

最近修复：Windows 包 run39214134268 在 ZIP 中文清单编码处失败，便携/安装后 GUI 已通过；UTF-8 修复与新的编码回归已完成本地验证。下一步读本修复提交的最新 run，不再等待旧编码版本的构建。

## I0 最终状态（当前权威入口）
DONE：通用规范、任务归档、双平台门禁、Windows自动构建/GUI/安装/卸载、ZIP/来源/校验值，以及真实失败阻断已完成并验证。
被测feature源码32ff1725c7a7726f6e990e2c0ccad7886ba32646 /run39215579198，独立infra源码ef976d707bb4f042e2d24f74654044bd528365bb /PR run39215634338，均全部SUCCESS。安装包和证据详见 TEST_REPORT.md 最终回执。
PR#1待用户审核，未合并；main/develop仍为a0fb65d8。Windows10/11人工NOT_RUN，保持TEST_RC。图片P1—P6未开始，本轮没有业务改动。
新任务：先核实远程HEAD/工作区，读取STANDARDS和TASK；新分支从用户指定的已批准基线创建并归档初始化任务文件。继续当前图片任务须以用户新需求为依据，从保留的P1计划开始，不重做I0。当前文档检查点从远程Git历史解析，不把前序被测SHA当作永远最新HEAD。


## 本轮当前恢复入口（覆盖旧I0入口）
用户授权图片业务。目标feature/unified-image，基线a39a7da；当前A0已完成，下一步A1，详见IMAGE_DESIGN/PLAN。I0已完成，不重复task:init。PR1已合入develop c8db715，旧“未合并”失效。终端没有Git凭据，本地是源码快照，保存用base_tree+parent+force=false+expected_sha的GitHub API；不得重建仓库。每阶段继续先核实remote HEAD。


## A1检查点恢复
A1已实现并通过本地全量；从远端最新提交解析本阶段SHA。下一步A2，禁止重复重写资源层。MediaAsset存settings media-asset:hash；草稿在media-draft:id；实际业务引用源集中于references.ts。pending日志放attachments/.media-staging，保留到外层事务结束后的恢复边界；不能在事务未定时删原图。显式维护collectOrphanMedia仅删除无业务引用的受管哈希文件，默认只预览。参考IMAGE_DESIGN。尚未做尺寸/UI/全入口接入，不能说图片模块完成。


## A2恢复入口
下一步A3统一其余业务显示和作答草稿/历史节点，随后A4增强、A5交换恢复、A6回归和PR。A2已经实现卡片内独立布局和保存重开，使用现有结构化附件，不更换编辑器。学习显示仍有旧共享imageWidth滑块，须移除并改用ImageNode只读；responseImages仍是ID数组，须贯通结构化节点布局和历史；记忆/选项实际能力需按审计设计适配，不把文本字段假称富文本。新类型/模型由models:generate生成，协议层不可import ../image-node（边界违规），应import ./image-node。


## A3当前恢复
已接通现有学习/列表/历史图片、作答草稿和每次复盘独立布局。下一步A4非破坏变换/裁剪/批注/替换；然后A5交换布局和备份完整性、生命周期与失败恢复；最后A6 CI/PR。后续须检查清理共享哈希文件时metadata和未提交事务的协同，不能沿用直接unlink的旧逻辑。历史只读使用ImageAttachments resolveUrl回调构造app-media://history路径，所有实际img由ImageNode呈现。新选项/记忆编辑图片入口未做（当前纯文本），若按主指令全面扩展仍属未完成范围，须明确记录，不能虚构。


## A3b恢复覆盖
当前源码schema605，AGENTS已更新；memory_assets是记忆领域引用表，media资源/实例布局共用。主指令选项/记忆入口现已实现；下一步A4。新角色和记忆图必须在A5贯通export/import/backup/integrity，不能因为当前UI正常而遗漏交换。被测当前阶段前序476fefe，实际阶段SHA从远端记录解析。最新有效本地check和smoke详见账本；不要重复之前已修正的模板尝试。

## 恢复检查点继续入口（覆盖此前分支与阶段记录）
目标feature/unified-image-recovery，已保存父链476fefe→64f7e3a1fe586349947f07cb50eac82a26b561cd。37文件已远程逐字节核验，许可证格式差异排除。当前是既有任务延续，不重新初始化。恢复后check通过209项及协议/类型/构建；UI发现列表刷新时行内学习按钮可点击但被start静默忽略，增加真实disabled状态后重跑。通过前不进入A4。

恢复验证补记：修复后完整smoke-v072 PASS（25组），本地恢复门禁通过。下一步A4，不能重复A1—A3b。

## A4恢复入口
A4已完成本地211项及27组UI验证；源码检查点由本节Git历史/恢复分支HEAD解析，前序99f379e。ImageLayout.edit是可选严格字段；批注使用纯文字，坐标相对最终画面。替换输入replacementId只用于已有内容实例，同作用域草稿被消费，ID/布局保留，旧文件供历史引用。原图预览始终使用原始URL。thumbnail参数仍须先通过asset/draft/history句柄授权，只返回可重建缓存。下一步A5：export/import尚未贯通布局/记忆/选项；backup须验证草稿和记忆历史；修复嵌套事务内回收站unlink及孤儿metadata一致性。不得重复A1—A4。

## A5恢复入口
A5完成215项check、5组系统UI、27组图片UI；前序39872e1，源码保存SHA用本节历史/远程HEAD解析。新media/integrity.ts仅在恢复staging严格验证全域图片数据，不依赖原生解码插件。备份创建仍能打包损坏库以保存现场，不能把创建成功等同可恢复；stageBackup必须通过业务和媒体验证。导入仍走原exchange流程与allowItemUpdates开关，不新增协议通道，旧包无layout/hash可读，新导出始终含两者。未绑定草稿保守保留，显式discardMediaDraft受会话保护；清空所属卡片集会解除其草稿引用，独立collectOrphanMedia维护才删除无引用原图。嵌套trash仅报告待清理，不在未知提交状态删字节。下一步A6 npm run ci:quality + 全ASAR十二组UI/缺插件回归，核实CI并创建develop Draft PR，不合并不发布。
