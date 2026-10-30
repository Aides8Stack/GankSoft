# 2026-10-30 v0.7.7 模块测试结构重组（当前优先于全部历史阶段）

用户决定改为**先设计 → 按模块测试 → 收集完问题 → 归类去重 → 集中修复 → 统一回归**。此前 M0/H1 的实际证据保留，不再照旧 H1→M2 边测边修的顺序执行。

本轮 D0：建立12模块→20原功能组→250原 CASE 的稳定映射、每模块正常和异常操作路径及用户反馈、自动化模块筛选/缺陷收集入口、GitHub最小夹具配方、环境缓存指纹与PR quality Artifact归档。见：
- \`docs/v077/MODULE-TEST-ARCHITECTURE.md\`
- \`docs/v077/modules/INDEX.md\` 与同目录12份模块路径
- \`docs/v077/ENVIRONMENT-REUSE.md\`
- \`docs/v077/DEFECT-INBOX.json\`（用户报告不等于 v077 复现）
- \`docs/v077/D0-STRUCTURE-REPORT.md\`

**未运行新的 Electron/Windows 基础模块测试；未修复任何生产业务；不能宣称功能PASS或真正已缓存一份可下载产物。** H1历史8项Linux Electron PASS保持原证据；本轮没有运行/更改其他242项状态，Windows CI/Win10/Win11实机未执行。源码与测试本次结构改动需在可用Node24 Work进行专项CLI/质量核验。

下一轮唯一入口：**T1 / GPT-6.1 Sol · Medium**。先运行 \`node tools/validation/v077/environment.mjs status\`，如果存在同OS且输入指纹匹配的GitHub Actions Artifact则恢复，否则 \`prepare\`；运行 \`module-plan.mjs audit\`；先卡片主链，再每模块按 \`run.mjs run --module <id> --baseline\`。T1/T2收集缺陷而不修改生产代码，至I3统一分类后才进入F4集中修复。按模块报告与新错误写 GitHub；禁止访问用户数据库、不等CI、不合并发布。

---

# 2026-10-30 v0.7.7 模块基础可用性验收设计入口（文档已保存，不代表测试通过）

按 `docs/v077/MODULE-BASELINE-SMOKE-AND-FEEDBACK.md` 的 20 组最小 UI 操作链、用户反馈合同和 G0→G2 顺序推进；原 250 条 CASE 定义及 `E2E-RESULTS.json` 保持唯一权威。优先补 `NEW-14/16/17`（鼠标手动保存/必填校验/发布）与已发布卡草稿，随后逐模块真实 Electron GUI 运行、定位 FAIL、最小修复并新进程读回。用户实测 #17/#21 不能用旧 R7 测试或 UI toast 代签。上次 H1 8 条 Linux Electron PASS 不因本次纯文档提交自动失效，其余状态保持账本记录；Windows CI/Win10/Win11 实机未据此变更。

---

# 2026-10-30 H1 当前入口

H1 BLOCKED；精确被测SHA fa308d835ef1488074eb24886281db1c5535aa4a；8条Linux正式Electron PASS（首批6条+NEW-12/18），模块43/43、框架7/7、编辑器专项PASS。修复普通文本HTML字面字符被拒绝；未修改草稿生产逻辑。Windows原始#16/#17来源未充分复现，#19全模式/平台未覆盖，不宣称全部解决。账本Electron PASS8/NOT_RUN242；Windows及逐CASE Unit/API保持NOT_RUN。报告：docs/v077/H1-REPORT.md。

下一计划M2 / GPT-6.1 Sol / Medium，先H1续验（High）补Windows原始来源及OLD-01等准入项。本轮保存核验后结束，不进入M2/不等CI/不合并发布。

---

# 2026-10-30 v0.7.7 M0 当前入口（优先于下方继承历史）

唯一分支 feature/v077 → develop。M0 本地核验 DONE；远端保存状态以本记录提交 HEAD 与独立远端读回确认。基线 6eca78c9d90a13f1d0c93cf6d9a16f4639dd048f。模型 GPT-6.1 Sol / Medium。未重复 task:init，未进入 H1。

权威精简报告：docs/v077/WORK-E2E-EXECUTION.md 的“M0 实测记录”。250 条：P0=58/P1=163/P2=29，映射6、未映射244；五层账本各0 PASS/0 FAIL/0 BLOCKED/250 NOT_RUN。框架7/7、构建PASS、一次真实Electron启动/控件/重启/隔离清理PASS；不代表业务用例PASS。旧粘贴分支不存在。已修复晋升证据校验和临时资源清理，补退出码测试；业务与Schema/CI未改。

下一阶段仅 H1 / GPT-6.1 Sol / High，入口与六个ID见权威报告。Windows CI与Win10/11实机未运行。无M0关键阻断；#16–#20留后续。保存至feature/v077并独立核验后本轮结束，不等待CI、不合并发布。

---

以下为继承历史，不代表v0.7.7当前任务。

# 2026-10-29 当前恢复入口：R7 DONE；R8候选构建准备完成

仓库Aides8Stack/GankSoft；原分支feature/v075-unified-learning-workspace；Draft PR15→develop。起点远端完整SHA `f1e6e9806b1b072bded9eb8888672b460b1f960f`，对应CI40826741821四项success。R7.4/R7.5技术DONE，历史33组/18项继承，不重做R7.3/M08/业务测试。

R8 IN_PROGRESS。R8.1准备DONE；R8.2准备完成、实际ZIP BLOCKED（必须所有者审核最新完整SHA并合入develop才触发现有出包流程）。版本package/lock根项同步0.7.6，依赖树未改，锁SHA256 `5b1e2cd201ee5cfcbaf0976444ea112b1f01e66833e7201de34408da58a51a28`。现有develop-rc.yml不变，仅win64 ZIP，目标GankSoft-v0.7.6-win64-portable.zip、顶层GankSoft/；无安装器、无第二流水线。没有构建包，不提供虚构下载链接。

R8详情：docs/v076/rebuild-v37-source-first/stages/R8/PROGRESS.md、TEST_REPORT.md、ACCEPTANCE.md、OWNER-NEXT.md、WINDOWS-CHECKLIST.md；evidence/preparation-20261029.json记录构建脚本哈希与实时规则。Win10/Win11同包人工全部NOT_RUN。规则API已读：develop严格pr-gate/pr-trust、PR与解决讨论、防删除/强推；main有PR/防删除/强推，无required checks。规则集active，但公开API未返回bypass_actors，不能宣称无bypass已核验；环境API403，需所有者独立查看rc-publish-owner必需审核人，不改设置/门禁。

下一步仅所有者：核验本轮最终完整SHA（本文件Git历史/远端HEAD）→main分支手动pr-trust，pr_number=15，source_sha=最终SHA，confirm=review 最终SHA→最终pr-gate通过后Ready并正常合并develop。合并产生的develop SHA才是实际包source.sha，不等同PR SHA；从同一次develop-rc的rc-packages Artifact取ZIP、source.json、TEST_REPORT.json、SHA256SUMS.txt。不要批准release-rc环境来只取Artifact；本轮未授权发布。下载同一个ZIP完成Win10/11清单后另行决定发布。

本轮普通保存原PR并独立核验完整SHA/tree后立即结束。不查询/等待/轮询新CI；不自动批准/合并/修改develop或main/创建Release。


---

以下为历史记录，不覆盖上方当前状态。

# 2026-10-29 当前状态：CI换行修复与R7.5实质验收（优先于以下历史）

基线134b48b11c7705aa39f79ea25a3386bd71e6dd5b；原分支/原Draft PR15→develop。已读取完成的CI40818749596：Ubuntu Quality PASS；Windows已通过业务562、协议21、Schema606九组、编辑器/卡片/复盘/图谱，后因原型LF/CRLF哈希失败。M08 Windows6/6 DONE继承，不重做业务模块。

本轮修复仅CRLF规范化的冻结原型来源检查，保留原始字节指纹与内容损坏拒绝；原型/生产源码/版本/锁文件未改。R7.5已实际完成Linux六页×1500/1366/900共18项可用性抽验、主壳6组、设置3/回收7/迁移6/备份恢复9/追加隔离2组、身份2/CI core5、构建/隔离PASS。原有业务/协议/Windows专项继承有效证据，未冒充本轮重跑。

R7.4 IN_PROGRESS：已知故障已修复，PENDING_WINDOWS_CI。R7.5 IN_PROGRESS：本地实质验收DONE，Windows当前SHA后续专项及完整Quality待确认。R8 NOT_STARTED：Win10/11同一真实便携ZIP、中文IME、物理剪贴板/鼠标、原生弹窗B02及实际窗口状态人工NOT_RUN。当前未发现真实核心业务/数据安全阻断。不要再按旧记录重开M08或R7.3大规模视觉验收。

权威报告：`docs/v076/rebuild-v37-source-first/stages/R7/R7.5-FINAL-20261029.md`；最小文字证据：`stages/R7/evidence/r75-final-20261029/checks.json`。下一轮只读取已结束CI，通过后关闭R7.4/R7.5对应门禁并进入R8；失败仅修具体项。源码及验证工具已准备保存到原PR；最终SHA从本文件Git历史与远端HEAD解析，不在提交内虚构自身SHA。独立核验远端后立即结束，不等待/查询/轮询新CI；不强推、不绕过pr-trust、不合并发布。

---

以下均为历史记录，不覆盖本节。

# 当前恢复入口：Windows UI 与后续门禁已集中修复（2026-10-29）

基线 c564227b06d6e64043179a3d8e043e5d5b9f2955，原分支 feature/v075-unified-learning-workspace / Draft PR #15 → develop。当前保存SHA由远端HEAD及本文件Git历史解析，不写入自身SHA。

已独立读取完成CI40814534105的Windows日志：M08 6/6、正式Schema606 9/9、Electron44.9.1准备PASS；M08 DONE，不重复开发。Windows直接失败1484≠1500已统一修复ui-v076.ts全部8处内容尺寸/截图契约；完整编辑器销毁顺序与后续过时UI定位/门禁已集中修复。旧界面门禁改接现有正式R6/R7专项，业务/安全保护保持。详细替代映射、实际命令及本地结果见 docs/v076/rebuild-v37-source-first/stages/R7/R7.4-WINDOWS-UI-CLOSURE.md。

Linux本地：正式首页三宽、原生表格57、完整编辑器11异步/3原生剪贴板及同步销毁、复盘6、分层7、图谱3、主框架5、设置3、回收站7、隔离2、迁移6、备份恢复/合并9、启动器、编辑器领域7/core5、构建/生产隔离PASS。卡片最终结果见上述收口记录。不重跑562全量；基线CI的业务/协议证据保留，最终源码Windows和完整质量交新CI。

R7.4 IN_PROGRESS：剩本轮新SHA的Windows Quality复验，当前没有已确认未解决的核心功能/数据安全阻断。R7.5 IN_PROGRESS：准备完成、待质量门禁确认；未冒称正式最终验收通过。R8 NOT_STARTED，B02及Win10/11同便携ZIP人工项NOT_RUN。原生窗口Windows最大化/恢复仅待Runner，Linux不冒充Windows。

下一Work只读新SHA已完成CI：质量通过直接精简R7.5；真实失败只修具体项，不能重开R0–R7或R7.3大截图。pr-trust是所有者完整SHA独立审核，不能自动批准/绕过；不当作软件缺陷。普通推送/核验原PR后本轮立即结束，不等待或轮询新CI，不合并、不发布。
