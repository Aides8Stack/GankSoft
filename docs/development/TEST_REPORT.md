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

# 2026-10-29 当前连续修复结果（优先于历史）

基线c564227；原分支/原Draft PR15。Windows M08真实6/6 DONE（CI40814534105），正式Schema606九组PASS；本轮统一修复全部8处UI内容区尺寸、编辑器同步销毁与旧测试定位，后续spike门禁改接现有正式R6/R7安全/真实操作验收。Linux专项结果与替代映射见 `docs/v076/rebuild-v37-source-first/stages/R7/R7.4-WINDOWS-UI-CLOSURE.md`，恢复见RECOVERY-NEXT.md；本轮Windows本地NOT_RUN。

R7.4 IN_PROGRESS：待新SHA Windows Quality；R7.5 IN_PROGRESS：准备完成待质量确认；当前无已确认的核心/数据安全阻断。R8及Win10/11同ZIP人工NOT_RUN。业务562/协议21继承基线CI，未重复全跑。原PR普通推送独立核验后立即退出，不等待CI、不合并发布、不绕过pr-trust所有者审核。

---

以下为历史记录，不覆盖上方当前状态。

# 本轮保存结果与下一步（2026-10-29）

API保存映射：本地实现检查点99f24dd2459c2ae808f555a20df06fd530b5da7c → 远端实现检查点cf0f25aede96d1b80d7900a4856b8a4a01c98446，完整tree均为ee11c48f7e598f0f76edcba42dfb36788aa00692。最终保存SHA从远端HEAD解析。

本轮基线 e3b91d4f4df97d23a2005031790e4e196313c94a；原分支 feature/v075-unified-learning-workspace、原Draft PR #15 → develop。两个修复检查点：M08 fresh606准入/迁移隔离与阶段诊断；13套旧ASAR集中分类及契约/证据更新。未改生产业务、版本、锁文件、下载、CI矩阵或pr-trust。

实际本地：M08真实Electron 6/6（独立PID见m08-report.json），迁移领域18/18；正式P1七项、正式606 ASAR9组、retained604 13套/107场景、证据契约21/21、CI core5/5、生产隔离262/410、构建及源码/工作流/Electron安全扫描PASS。已同时淘汰两处旧颜色变量及纯固定尺寸等断言；业务保护仍必需。完整test:pipeline 180 PASS/3 FAIL：离线冷安装缺zwitch缓存及其依赖测试失败；记录FAIL，不重试安装，不伪造PASS。

Windows本轮 **0/6 NOT_RUN**；原CI40810266737的环境预检真实PASS保持有效。M08 Windows Gate仍BLOCKED，R7.5/R8 NOT_STARTED。下一轮仅读取新SHA现有Windows M08报告与质量门禁：真实Windows6/6且质量阻断解除即直接按R7.5-ENTRY.md精简验收，不重新审计R0–R7/数据库；若失败只处理报告的具体阶段。pr-trust保持所有者完整SHA独立复核，不自动批准。

权威收口报告：docs/v076/rebuild-v37-source-first/stages/R7/CI-CLOSURE-20261029.md；文本证据与精确源码/文件哈希见同目录evidence/ci-closure-20261029/manifest.json。M08实现检查点99f24dd；最终保存SHA由远端HEAD/本文件Git历史读取。保存读回后立即退出，不等待CI、不新分支/PR、不强推、不合并发布。

## 2026-10-29 检查点 A：M08 fresh606 契约修复

本轮基线 e3b91d4f4df97d23a2005031790e4e196313c94a；原分支/原Draft PR15。迁移验证与正式fresh606 UI分离，生产准入策略未改，未伪造标记。Linux正式Electron六组6/6，独立PID重启/全表与附件读回PASS；迁移领域专项18/18。加入阶段、心跳、首窗口与进程输出、有限超时和强制清理。Windows真实0/6 NOT_RUN，M08 Gate仍BLOCKED。证据：stages/R7/evidence/ci-closure-20261029/m08-report.json；后续只完成本轮旧ASAR集中分类/补验和统一保存，不进入R7.5/R8。

# 本轮验证账本

仓库Aides8Stack/GankSoft；唯一分支feature/v075-unified-learning-workspace；原Draft PR15→develop；基线39311546cfb7cb79f75e3b469a24a267f1d5bca3。当前提交SHA从Git历史/远端HEAD读取。

本轮只做M08正式Electron补验准备和CI生产隔离修复。隔离修复已实现并本地PASS：正式606 merge契约/controller/service与旧S8.b入口分离，复用中立图/身份/历史算法；旧代码仍内部测试隔离。原隔离检查器未改，源码262模块/产物410文件PASS；构建、协议21/160方法、相关导入/备份恢复/Markdown交换通过。169/169及18/18继承，不重复全量；因共用身份/来源提取，仅补M08受影响存档1例PASS。

M08仍BLOCKED，正式Electron六组本轮NOT_RUN。当前Linux Work已有SIGTRAP/Unix socket EPERM证据，未再次启动。脚本已按平台选择启动参数，六组断言保留，新增来源/构建指纹与不同PID证据；现有Windows Quality在隔离之后新增必需m08-native-integrity-windows步骤，报告由原PR Reports保存。没有真实6/6报告不能标DONE。

本轮权威恢复：docs/v076/rebuild-v37-source-first/stages/R7/R7.4-M08-CI.md；证据evidence/r74/m08-ci/checks.json。不要重复读取R0–R7历史。下一步读取最终SHA的Windows validation-results/m08-integrity/report.json及ci/quality.json；按真实结果关闭M08或只修具体失败。不进入R7.5/R8；M01–M07保持，B02人工项仍交R8 NOT_RUN。

基线Quality40805896252双平台/最终pr-gate FAIL，均隔离门禁；基线pr-trust40805894615因完整SHA所有者复核要求FAIL。最终提交将触发原PR CI，状态提交后读取；本轮不等待。所有者审批入口actions/workflows/pr-trust.yml，选择main：pr_number=15，source_sha=最终完整SHA，confirm=review 最终完整SHA。不绕过/自批。

正常保存到原PR并独立核验HEAD、完整tree、关键文件后立即结束；不新分支/PR、不强推、不合并发布。

详细命令、通过数与初始失败修正见R7.4-M08-CI.md，不将历史测试或排队CI冒称本轮PASS。


## 2026-10-29：最终两项 CI 精准修复
基线80e5f8dd2aa0f3487aad88626125f57fb06bfeb5，原PR15/原分支。P1语义定位与继续学习名称修复，本地真实PASS；Electron准备拆为独立必需门禁，原校验installer及缓存、文件/运行时版本架构验证、本地首次及复用PASS。构建/原生产隔离PASS，core 5/5及语法/diff PASS；未重跑全量业务。Windows准备及M08六组NOT_RUN，M08 BLOCKED，R7.5待真实6/6和相关质量阻断解除。详见RECOVERY-NEXT.md及R7.4-M08-CI.md末节；保存后退出，不等待CI、不合并发布。
