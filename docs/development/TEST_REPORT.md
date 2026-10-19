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

# 实际测试与验证账本

状态：PASS=实际通过；FAIL=实际失败；BLOCKED=环境/依赖阻塞；NOT_RUN=未执行。
本轮环境：Linux / Node24.19.0 / npm11.9.0；源码读取固定基线 a0fb65d89b7273c6f06beb763e66b3c4d1899a05。
历史 docs/v0.7.3-validation.md 原样保留，未重新运行其 198 项及 Windows 包检查；不纳入本轮 PASS。
检查点 SHA 与被测代码 SHA 分开记录；初始化检查点 d743c10c09c4e1bbd57d2749f8665fd5dae8c9ae 已远程确认；本回执提交按 Git 历史解析。

| ID | 阶段 | 命令/操作 | 环境、关联版本 | 结果 | 证据与限制 |
| --- | --- | --- | --- | --- | --- |
| T00 | M0 | git status --short --branch / remote -v / log -8 --oneline | 起始 scratch | BLOCKED | 无 Git checkout，均报 not a git repository；不等于项目代码故障 |
| T00b | M0 | git ls-remote https://github.com/Aides8Stack/GankSoft.git | 终端 HTTPS | BLOCKED | 无私有仓库终端认证，could not read Username；使用已授权连接器 |
| T00c | M0 | GitHub 读取 refs/heads、commits、递归 tree、目标源码 | 远程 a0fb65d89b7273c6f06beb763e66b3c4d1899a05 | PASS | 三分支均为基线；tree 未截断，323 blob；读取权限已实际可用 |
| T01 | M0 | node tools/protocol/check-boundaries.mjs | Linux；固定基线中完整 shared/protocol/、services 与原脚本的文本副本 | PASS | exit 0：Protocol and frontend boundaries passed；仅静态边界，不是完整 checkout 或业务测试 |
| T02 | M0 | python 内联校验六文件集合/阶段状态/恢复引用/代码围栏/秘密模式；逐文件 git diff --no-index --check /dev/null <文件> | Linux；本初始化工作树 | PASS | exit 0；六文件均通过，无空白错误，无匹配密钥模式；仅变更文本扫描，不是全仓秘密审计 |
| T03 | M0 | GitHub 递归 tree 对比、git/commits 读取、refs/heads 独立读回 | d743c10c09c4e1bbd57d2749f8665fd5dae8c9ae | PASS | 329 blob，六文件新增，323 原文件 SHA 不变，无丢失；父链接基线；feature 指向本提交，main/develop 均仍为基线 |
| T04 | P1 | npm ci → npm run check | 当前无完整 checkout/依赖 | BLOCKED | 未调用 npm check；下一真实 checkout 任务必须补基线 |
| T05 | P1/P4/P6 | npm run smoke / smoke:v071 / build后 smoke-v073 / test:package | 当前环境 | NOT_RUN | 未安装并运行 Electron，不声称界面通过 |
| T06 | P6 | Windows10/11 W01—W40及新图片用例 | 两系统真机 | NOT_RUN | 未进行任何 Windows 实机验收 |
| T07 | M0 | 创建 PR | GitHub 连接 | NOT_RUN | 不需要集成 PR；未实测创建能力，不能保证工作流/分支保护允许 |

失败/阻塞必须保留原因和后续动作，不删去中间失败来“全部通过”。后续按阶段追加测试命令、被测 SHA/工作树、日期和日志证据。

## 检查点保存证据
- 初始化 commit：d743c10c09c4e1bbd57d2749f8665fd5dae8c9ae；tree：7f6ff5ebe29a8438129575b0f66e529368802b6f；parent：a0fb65d89b7273c6f06beb763e66b3c4d1899a05。
- API 非强制 update_ref 返回 success=true；独立 refs/heads 与 git/commits 读回一致。
- 自动审批拒绝过一次缺参数的 ref 探测，未执行；明确目标、验证父链和 force=false 后的实际更新成功。拒绝不计作业务测试 FAIL。
- 本回执只更新三份执行文档；保存后应再次读取远程和差异，不把“已创建 commit 对象”误写成“已更新分支”。

## I0 本轮实测（2026-10-19）
被测源码基线：27d39307d9581334f906e02b2a62db85fe8f4cfc；Linux Node24.19.0/npm11.9.0。本地完整内容快照逐项校验 329 Git blob SHA，非 Git 检出。
| 操作 | 结果 | 证据/限制 |
| --- | --- | --- |
| 远程 refs/tree/文档/package/测试脚本审计 | PASS | feature 前序如上；develop=a0fb65d8；无现存 .github/Actions runs |
| npm ci --fetch-retries=0 --fetch-timeout=20000 --no-audit --no-fund | PASS | 安装 524 packages；未改依赖及锁文件 |
| npm run check | PASS | 198 全量、21 协议测试，协议边界/类型/导出及 Vue/TS/Vite 构建成功 |
| node --test tools/ci/core.test.mjs | PASS | 4 项：分支防碰撞、真实失败阻断后续构建、成功账本、任务归档与防重复/稳定分支拒绝；测试使用临时 Git fixture |
| node tools/validation/package-check.mjs | PASS | 完整 12 组 ASAR/UI 回归与缺原生插件故障隔离；生成 package-v073.json |
| Windows CI/安装/启动/卸载 | NOT_RUN | 等实际 Actions，当前 Linux 不能代替 |
| Win10/11 人工签核 | NOT_RUN | 始终与 Windows Runner 分开 |
| 远程 CI 跨 job 失败阻断 | NOT_RUN | 本地子进程阻断实测通过，不代表 GitHub needs 实测 |

### I0 远程失败与修复记录
- e50aed203205a8087a032435e3ade865bc225a3a / run 39213719322：Linux quality PASS；Windows quality FAIL（197/198）。V08 错将 Windows 强制终止的退出码等同 POSIX signal；windows-package 实际 SKIPPED，未上传安装包。失败报告 artifact 12168199638。
- 修复仅涉及 tests/audit-v050.test.ts 与 tools/validation/crash-worker.ts：事务触发器中同步写证据后 SIGKILL；Windows 严格核验 exit=1/signal=null，POSIX 核验 SIGKILL/status=null；保留快照回滚并加第二次幂等重试。没有跳过、删除或削弱数据库断言。
- Linux 25 项相关回归及修复后 npm run check（198+21）再次 PASS。
- 71eb07cb594ab07df04a23f660b204f5ed09cf90 / run 39214134268：Linux/Windows quality 均 PASS；Windows 包链路读取时执行中，不能记 PASS。
- 故障专用 infra/ci-gate-probe，8e2b947886548bf36d21c58ca6983021a771690e / run 39214033112：两平台均按预期 FAIL；windows-package SKIPPED。该分支故意含失败测试，永不合并；提供真实跨 job 阻断证据。
- 当前测试安装目录与 AppId 随分支及源码标识隔离，feature 检查点 ab404a5cf2e05b3ae9b90b5b1e0ca9c9233ae4a1；独立 infra 检查点 856e55d6ead81806d7737aa148f9c0c0a7b0baf3。

### Windows 交付编码故障
run39214134268 的 Windows 便携与安装后 smoke 三组全部 PASS，安装/启动/卸载已实际执行；最终 ZIP manifest 因 Python 默认 cp1252 无法编码中文文件名而 FAIL，安装包未上传。日志/报告 artifact12169915117 已保留。
修复 tools/build/zip-windows.py 显式 UTF-8；新增独立中文文件名、文件内容及 SHA-256 完整回归，在禁用 Python UTF-8 模式、模拟默认 cp1252 的子进程下运行。Linux 测试 PASS；等待新 Windows Runner。一次 LC_ALL=C 的初版模拟触发 Linux 文件系统 surrogate，已改为只模拟文本编码、不改变文件系统编码；未削弱 ZIP/哈希断言。
同事件/同分支仅保留最新运行，其他分支不会互相取消。

## I0 最终验证回执（2026-10-19，当前权威状态）
I0 状态：DONE（通用基础设施实现与自动化验收完成；推广待用户审核 PR，不代表 develop 已生效）。图片 P1—P6 仍 NOT_STARTED。
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


## A0 本轮实际验证（源码a39a7da）
Linux/Node24.19.0/npm11.9.0；npm ci PASS（524 packages）；npm test 198/198 PASS；check:protocol 21/21 PASS（已含在198内）、boundary/type/export PASS。首次不完整下载时check FAIL（worker未下载），补齐后198全通过；首次完整文本快照build因缺PNG BLOCKED；通过API目录的下载入口补齐原始二进制并验证Git哈希后npm run build PASS。不替换Logo、不修改原源码。331文本文件+9二进制已核验Git blob；RTF文本读取规范化未用作业务或提交。源码baseline CI run39217129494 completed/success。Windows10/11人工NOT_RUN。


## A1验证
被测：38df8a8基础上的A1工作树（本阶段源码提交SHA由Git历史解析）；Linux Node24.19.0。新增media-resource七项PASS，含真实子进程exit造成SQLite未提交后的资源恢复，非仅模拟异常。原v072十七项PASS。首轮npm run check FAIL：V10晚期导入失败留下暂存；增加确认外层回滚后的即时补偿并保留不确定提交日志后重跑npm run check PASS：205测试全部通过（包含21协议项），check:protocol再次21/21、边界/类型/导出、Vue+Electron+Vite构建PASS。A1没有公共协议/SQL版本变更。GUI smoke和本阶段远端CI尚NOT_RUN；Win10/11人工NOT_RUN。


## A2验证
被测61ca5f2+A2工作树；Linux Node24.19.0。tests/media-instance两项PASS，覆盖非法/边界、同素材多实例、原图未改、保存重读/重启、快照独立和协议原子拒绝。npm run check PASS：207测试（含21协议）/协议重跑/边界/类型/构建。初版边界检查FAIL：data.ts从协议层外引schema；移动schema到shared/protocol/image-node并保持边界规则不变后PASS。初版新测试漏capabilities握手FAIL，修正测试按真实API启动后PASS。node tools/smoke-v072.mjs PASS，含真实Electron鼠标拖角、单图数值/对齐、另一图不变、撤销重做、max-width与保存尺寸、原有图片/学习/知识图谱回归。单击改为选择、双击预览，原smoke相应更新为dblclick，未删断言。Windows10/11人工NOT_RUN。


## A3验证
被测0c3cf0f+A3工作树；Linux/Node24。npm run check最终PASS：208全量（含协议21）+协议重跑/边界/类型/前后台构建；node tools/smoke-v072.mjs最终PASS，新增作答图512px布局冻结并写入历史，与原页面管理/图谱/剪贴板回归同时通过。新response布局测试PASS：两次记录220/660分别保持，跨集/重复引用拒绝，当前题目附件不受作答图影响。开发中历史模板v-for推断FAIL，改为复用只读附件组后构建PASS；一次构建尚未完成就启动smoke导致缺main.js失败，之后严格串行check→smoke重跑PASS。所有失败均未删测试或削弱断言。Windows10/11人工NOT_RUN。A1远端两平台quality SUCCESS，Windows包因A2新push取消；不当作包失败或成功。


## A3b验证
476fefe+A3b工作树，Linux Node24。npm run check PASS：209/209（含21协议）+协议重跑/边界/类型/契约导出/前后台构建。新增media-entrypoints测试验证选项角色、记忆双图、资源跨集去重、不同实例隔离、历史布局不可变及跨域引用拒绝；初版测试修改时漏expectedRevision触发REVISION_REQUIRED，补齐真实CAS参数后PASS。node tools/smoke-v072.mjs PASS：新增真实记忆卡粘贴图420px、保存、学习只读；新增选项A图片264px、保存、对应选项只读；所有既有smoke保留。全源码敏感模式扫描无匹配；不等于所有安全风险已证明不存在。Windows10/11人工NOT_RUN。

## 恢复后验证（2026-10-19）
被测64f7e3a及其后学习按钮修复工作树，Linux Node24.19.0。npm run check PASS：209/209全量（含21协议），check:protocol重跑21/21、边界/类型/契约导出、Vue/Electron/Vite构建PASS，日志recovery-validation.log。smoke-v072首次FAIL：记忆学习页等待超时；真实列表刷新竞态导致点击被忽略。行内按钮增加loading/failure/working禁用状态后npm run build和完整smoke-v072 PASS（25组），recovery-ui-retry.log。记忆420px、选项A264px、作答512px冻结/记录、独立拖拽和撤销均通过。Actions39242846944两平台quality SUCCESS，Windows-package读取时执行中；不能称全部CI PASS。Win10/11人工NOT_RUN。

## A4实际验证
99f379e+A4工作树，Linux Node24.19.0。tests/media-edit.test.ts 2/2 PASS；npm run check最终211/211 PASS（含21协议），协议重跑21/21、边界、TypeScript和前后台build PASS（a4-verified-check.log）。完整smoke-v072最终27组PASS（a4-final-ui.log），包括裁剪50%、90度旋转、翻转、字面量批注无HTML注入、撤销重做、素材替换前后ID/布局相同而fileName不同、记忆420px/选项264px只读。首轮build FAIL：编辑器加载误取MemoryAsset不存在的replacementId，已修复；首轮UI FAIL：可选replacementId=undefined违反JSON协议，改为缺省不发送并增加imageLayout清理undefined回归，保留原协议校验；新增替换断言初版使用领域file_name而非Wire fileName导致FAIL，已校正字段并增加非空字符串断言，未削弱业务断言。恢复基线64f7e3a Windows-package FAIL，日志证实相同行内学习竞态；99f379e已修，CI读取时两quality通过/Windows-package执行中。Win10/11人工NOT_RUN。

## A5实际验证
39872e1+A5工作树，Linux Node24.19.0。tests/media-exchange.test.ts最终4/4 PASS，覆盖JSON/ZIP/定向卡片集往返、选项和记忆角色、布局/edit/哈希、跨集实例隔离、显式更新只改布局不重置内容版本、非法哈希/裁剪/路径、完整备份恢复、独立历史旧素材与草稿缺图、manifest重新签哈希仍无法掩盖受管原图损坏、非法布局、外层事务回滚、共享资源、孤儿metadata重建/有引用缺图拒绝、清空卡片集的草稿清理。npm run check最终215/215（含21协议）PASS；协议再跑21/21、边界/TypeScript/build PASS（a5-final-check.log）。system-v060五组PASS（a5-system-ui.log）；完整smoke-v072二十七组PASS（a5-ui.log）。初版把全部业务验证提前到createBackup使3项故障现场备份测试FAIL，恢复既有可保存故障现场语义，严格校验仍在stageBackup安装前执行，未修改或削弱旧测试；新增更新测试初版用错overwriteItems选项，按实际allowItemUpdates修正后PASS。故障日志a5-tests.log和a5-target.log保留。恢复修复99f379e完整CI run39244001467 SUCCESS（两quality、Windows包/安装/启动/卸载），Win10/11人工NOT_RUN。

## A6最终本地证据及额度中断恢复（2026-10-19）
被测ee112298之后A6源码工作树；Node24.19.0/Linux，宿主TZ=Asia/Shanghai；最终阶段提交SHA由本节Git历史解析。原workspace和日志仍存在，源码/编译输出一致（main实际调用readMediaBytes）。恢复后对照远端树保护8改1增的有效A6变化，另有许可证RTF格式差异排除。未重新开发A4/A5。

| 操作 | 结果 | 证据 |
| --- | --- | --- |
| npm run check（最终源码） | PASS | a6-final-check.log；215/215，含21协议；协议再跑21/21，边界/TypeScript/Vue/Electron/Vite通过 |
| node --test tools/ci/core.test.mjs | PASS | a6-infrastructure.log；5/5 |
| python3 tools/ci/test_zip_manifest.py | PASS | a6-unicode-zip.log；1/1 |
| node tools/smoke-v070.mjs；TZ=UTC同命令 | PASS | a6-v070-shanghai.log、a6-v070-utc.log；每次15组，errors=[] |
| node tools/validation/package-check.mjs（最终重建） | PASS | a6-final-package.log、validation-results/package-v073.json；12组ASAR/UI全部passed及缺插件故障隔离passed；ASAR SHA256 3df0b68e683dfe50dfa610e471a50ea0fe276d9dbd630de0b344e9be181cd708 |
| 完整图片/页面GUI | PASS | 上述ASAR中的smoke-v072 28组，含420px记忆/264px选项/512px作答历史、编辑/替换/裁剪/批注/独立缩放及篡改原图和缩略图均409、恢复后返回原始字节200/no-store |
| npm run ci:quality（本地快照） | BLOCKED | a6-quality.log；provenance要求git rev-parse HEAD，本地无checkout；保留来源检查，未伪造Git。其各底层门禁分别实际通过，完整入口由GitHub checkout验证 |
| A4 GitHub Actions39245211105 | PASS | 39872e1，quality Linux/Windows及Windows包/安装/启动/卸载SUCCESS |
| A5 GitHub Actions39246601539 | PASS | ee112298，两平台quality及Windows包完整SUCCESS；不当作A6提交的CI结果 |
| 当前A6提交CI/PR | NOT_RUN | 提交后按当前SHA实际读取；最新回执写PR说明，不将创建提交视为CI成功 |
| Windows10/11人工 | NOT_RUN | IMAGE_ACCEPTANCE清单；Runner不能替代 |

失败及定位：新增null回归先FAIL（a6-null-regression.log），改为仅undefined使用缺省后全量PASS。完整ASAR首轮v070 FAIL（实际2、预期1），初判异步而等待后仍FAIL；继续证实fixture在生成复盘时继承宿主时区，后才改上海时区，导致有效记录不确定。固定fixture生成时区UTC，保留上海日期范围和原1/2计数断言、原超时，UTC/上海各15组及最终完整ASAR均PASS。没有删断言或加大超时。原图读取补强后再次重建并完整执行a6-final-check→a6-final-package成功，早期包不代替最终包。
一致性：media-resource/instance/entrypoints/edit/exchange与原回归覆盖当前图/记忆图/选项/作答草稿、不可变历史、原图哈希、跨集拒绝、JSON/ZIP与完整恢复、失败事务/半写补偿/共享资源清理。检索旧media.remove/import/paste仅剩明确METHOD_RETIRED拒绝桩且capabilities排除；学习等UI无旧共享imageWidth路径。未做Windows10/11人工、真实系统剪贴板/对话框、DPI验收，不宣称全部平台完成。

## A6远程最终回执（被测源码6982c8b）
- 源码：6982c8b255bfad851480044d38b2aa496e81084c；第一父ee112298，额外父已批准develop c8db715；13个有效文件已逐字节读回、完整359文件tree/模式/父链验证PASS，无丢失。许可证格式差异、产物和临时文件均未提交。
- push：https://github.com/Aides8Stack/GankSoft/actions/runs/39276029426 ，completed/success；quality Windows job118140457532 SUCCESS、quality Linux job118140457918 SUCCESS、windows-package job118141852973 SUCCESS。
- PR：https://github.com/Aides8Stack/GankSoft/actions/runs/39276185861 ，completed/success；quality Windows job118140982546 SUCCESS、quality Linux job118140982782 SUCCESS、windows-package job118142415943 SUCCESS。
- 两平台实际checkout运行ci:quality，原本本地快照provenance BLOCKED不再阻碍远程验证；全量业务/协议、边界/类型/构建通过，Linux完整ASAR/UI通过，Windows便携/安装后GUI、首次库、图片/交换/备份、安装/启动/卸载通过。Win10/11人工仍NOT_RUN。
- Draft PR #2：https://github.com/Aides8Stack/GankSoft/pull/2 ，head feature/unified-image-recovery@6982c8b、base develop@c8db715；open/draft=true/merged=false，mergeable=true，无冲突。未改main/develop、未删分支、未创建Release。
- 本回执提交只有TASK/PROGRESS/HANDOFF/TEST_REPORT四份文档；源码与6982c8b完全相同。回执后续CI按其真实HEAD另外核验，不循环提交自身SHA；最新完整CI/工件入口同时写在PR说明中。A6自动阶段DONE；正式放行仍等待IMAGE_ACCEPTANCE中的两系统人工验收。
