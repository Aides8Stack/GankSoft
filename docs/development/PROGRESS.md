# 2026-10-30 F1–F3：已知缺陷修复检查点（本轮最新）

本轮授权范围已结束：实际修复3BUG，GH-20→EDITOR-20/21、MEDIA-03、NEW-16共4条正式Linux Electron PASS；均FIXED_PENDING_WINDOWS。FAULT-05真实复验仍FAIL，现行文档明确暂存后不自动删除，标记CONTRACT_REVIEW_REQUIRED，未改清理逻辑或断言。GH-16/17/21用户P0报告原样保留，不宣称已修。

权威 `docs/v077/KNOWN-DEFECT-FIX-REPORT.md`；永久证据 `docs/v077/evidence/KNOWN-DEFECT-FIX-RESULTS.json`。生产保存F1 `5057ea4eba38cb79d73580fa92054cc4b053d525`，F2 `4e2e0fe3e208c7134763332d9d872983538205bc`；精确被测本地SHA及相同Git tree映射见证据。Shell push缺凭证，使用已有GitHub连接器非强推追加，最终文档SHA由远端HEAD读取。

唯一账本经现有promote.mjs更新本轮5CASE，当前87PASS/1FAIL/3BLOCKED/159NOT_RUN；其他245条对象/全部Windows层未变。F1/F2必要构建均成功；依赖/有效初始构建复用，无安装/锁修改；反馈和既有草稿/发布关联测试27/27 PASS。未跑其余P1/91/250，不等CI、不合并develop、不发布、不改版本。Win10/11真实桌面/物理剪贴板/中文字体视觉未验，不冒充已通过。

下一：先核远端feature/v077最新HEAD；按新授权做Windows补验、FAULT-05请求级暂存清理合同决定或继续独立P1测试Work。本Work最多F1/F2/F3，保存并核验后停止；不要重开已有效PASS或恢复旧T2-A指令。并行Work成果必须按字段合并，禁止旧副本覆盖。

---

# 2026-10-30：91条优先精准增量验收收口（本轮最新）

本轮A/B/C检查点完成并停止，不继续M4/扩展159条、不修生产。权威 `docs/v077/PRIORITY-91-INCREMENTAL-ACCEPTANCE.md`；范围初始清单 `PRIORITY-91-MANIFEST.json`，当前派生 `PRIORITY-91-FINAL.json`。

- 只新增执行原13条普通NOT_RUN：11 PASS / 2 FAIL；原67 PASS、3 FAIL全部逐记录不变且零重跑。优先91最终78 PASS / 5 FAIL / 3 BLOCKED / 5 NOT_RUN；全250为83/5/3/159。
- Windows8条零执行；3原BLOCKED、5原NOT_RUN保持。无真实Windows交互桌面，勿再在Linux制造阻塞回执。
- 25次单CASE尝试，12次TEST_INFRA错误属8类已修；均仅重试未取得业务结论的受影响CASE，未将设施失败晋升产品FAIL。收集/晋升完成。
- 新确认原用户报告GH-20（EDITOR-20/21同一根因）；和原NEW-16、MEDIA-03、FAULT-05去重共4BUG/5FAIL。下一轮Sol High先P1 GH-20（Prompt209px、粘贴680px）及MEDIA-03，再P2校验字段提示/暂存图片清理合同；最小复现和定向回归见报告交接表。不必重新读250条。
- Node24/Schema606临时库；381依赖版本核对复用，无安装；旧可用构建源码不符，仅必要构建一次410输出并复用。CAT-10/11在Linux仅注入系统confirm返回，真实GUI写入及持久化断言完整；绝非Windows物理弹窗签核。中文字体缺失不作为Windows视觉证据。
- 永久摘要 `docs/v077/evidence/PRIORITY-91-INCREMENTAL-RESULTS.json`；来源SHA/tree映射 `PRIORITY-91-SOURCE-IDENTITY.json`。原67及3FAIL原证据原样保留；raw PNG仅本地。生产src/shared/electron/锁文件零修改。
- Shell push无凭证，GitHub连接器基于远端最新tree普通追加；保留并发Work的M4源码，最终合并父链保留完整同tree测试源码检查点。最终文档SHA从远端分支读取，不强推、不等CI、不合并develop、不发布。

---

# 2026-10-30 T2-A 紧急保存检查点（优先于历史）

T2-A IN_PROGRESS，按所有者额度收尾指令停止；35条P0已登记31PASS/1FAIL/3BLOCKED/0NOT_RUN，不宣称P0全部通过。全账本72PASS/3FAIL/3BLOCKED/172NOT_RUN；原41PASS/2FAIL未重跑且逐CASE保留。新观察FAULT-05：异步粘贴被拒后未引用暂存图片重启仍在，待I3合同评估；未修生产源码。3项平台阻塞NEW-13/CLIP-03/CLIP-09交T2-W；所有Windows签核层NOT_RUN。

被测生产基线e40c896a1876c9f6c4115c6267e96b16e2564e0a；测试工作树与最终脚本指纹详见docs/v077/evidence/T2-A-RESULTS.json。依赖/410构建哈希复用，无安装/编译；框架14PASS。10次工具失败尝试及定向复验保留。原始二进制截图仅本地，不冒称GitHub已保存PNG。

唯一feature/v077→develop。恢复只读docs/v077/T2-A-REPORT.md、E2E-RESULTS.json、REMAINING-207-PLAN.md；先environment.mjs status，再batch.mjs list T2-P1.01，实现本批缺少处理器后运行。其余172 NOT_RUN全部已有安排。保持现有计划原样；远端17批计划原样保留；新结果仅追加到唯一账本与派生JSON。T2-C/T2-W入口同表；已有3FAIL留I3/F4，不在收集阶段改业务。用户数据禁止访问。保存后立即结束，不等CI、不合并发布。

当前文档保存SHA由远端HEAD和Git历史解析；此段不虚构自身SHA。下方历史仅供必要时查证。

---

# 2026-10-30 T1-C 当前检查点（优先于下方历史）

T1-C DONE（指定Linux收集范围）：exchange 3PASS、settings 4PASS、storage 5PASS、reliability 3PASS+WIN-09 NOT_RUN；补充 KNOW-12 PASS。合计16条新增有效PASS，无新增业务BUG。累计实测待修2项（NEW-16、MEDIA-03）及4项USER_REPORTED保留；7条本轮测试失败观察归4类TEST_INFRA，均定向复验PASS。全账本41PASS/2FAIL/207NOT_RUN，未碰Windows层。

权威 docs/v077/T1-C-REPORT.md；永久摘要/回执/文件索引 evidence/T1-C-RESULTS.json。精确测试SHA分批见报告；最终定向脚本377c6c41d4bd3162a22cc911d19dc9be05388ff5。dependencies+410构建全复用，无安装/编译；框架12/12。未改src/electron/shared生产代码，不等CI、不合并发布，本轮结束。

I3初步归类条件具备，但全平台收集未完；下一仅T2最小补验：真实WIN-09+原Windows草稿反馈；WIN-05原复制源/GH-16；EDITOR-20/21窗口；BACK-09独立数据库合并；BACK-10中文空格迁移；WIN-07真实原生弹窗。不要重跑250条或重开已通过Linux项。KNOW-12不再遗留为未测；重名/缺父等变体没有冒称覆盖。

---

# 2026-10-30 T1-B 当前检查点（优先于下方历史）

T1-B DONE：指定9条8PASS/1FAIL；扩展KNOW-12 NOT_RUN，所以模块命令共8PASS/1FAIL/0BLOCKED/1NOT_RUN。analytics3PASS、knowledge/Markdown4PASS+1NOT_RUN、media1PASS/1FAIL。新增真实MEDIA-03宽度30/80变80/80，独立复现两次，只收集未修生产。继承NEW-16。

权威报告docs/v077/T1-B-REPORT.md；证据evidence/T1-B-RESULTS.json。最后脚本SHA7389b5ac034179649aba091a373d8772b5df8d46，首批SHA d2c0cb67d36dae3def2fd28922df402b0b71bd02。依赖/410输出全程复用，无ci/build；框架12/12。Windows NOT_RUN；累计25PASS/2FAIL/223NOT_RUN。下一T1-C /Sol Medium，测试exchange/settings/storage/reliability等；不进入I3/F4。保存核验后结束，不等CI、不合并发布。

---

# 2026-10-30 T1-A 当前检查点（优先于下方历史）

T1-A DONE：核心5模块10条实际操作链，9 PASS /1 FAIL /0 BLOCKED /0 NOT_RUN。NEW-16错误提示显示内部correctOptionId，持久化与拒绝发布正确；只收集未修业务。测试工具问题单独记录并按受影响范围复验。框架12/12；全账本17PASS/1FAIL/232NOT_RUN，旧8条不计本轮。

权威报告docs/v077/T1-A-REPORT.md；逐CASE精确SHA见evidence/T1-A-RESULTS.json。依赖/410文件构建首次完成后均复用；没有可下载同平台Artifact。最后脚本检查点50ef476ba948ac458cbfb152e82ecfb51fabc247，文档保存SHA从远端读取。生产源码/Schema/锁/发布流程未改；Windows NOT_RUN。下一T1-B /Sol Medium继续分析、知识、图片等模块，I3/F4尚未进入。节约规则已永久写入WORK-E2E-EXECUTION.md。

本轮保存核验后结束；不等CI、不合并发布。

---

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

# 当前进度

仓库Aides8Stack/GankSoft；唯一分支feature/v075-unified-learning-workspace；原Draft PR15→develop；基线39311546cfb7cb79f75e3b469a24a267f1d5bca3。当前提交SHA从Git历史/远端HEAD读取。

本轮只做M08正式Electron补验准备和CI生产隔离修复。隔离修复已实现并本地PASS：正式606 merge契约/controller/service与旧S8.b入口分离，复用中立图/身份/历史算法；旧代码仍内部测试隔离。原隔离检查器未改，源码262模块/产物410文件PASS；构建、协议21/160方法、相关导入/备份恢复/Markdown交换通过。169/169及18/18继承，不重复全量；因共用身份/来源提取，仅补M08受影响存档1例PASS。

M08仍BLOCKED，正式Electron六组本轮NOT_RUN。当前Linux Work已有SIGTRAP/Unix socket EPERM证据，未再次启动。脚本已按平台选择启动参数，六组断言保留，新增来源/构建指纹与不同PID证据；现有Windows Quality在隔离之后新增必需m08-native-integrity-windows步骤，报告由原PR Reports保存。没有真实6/6报告不能标DONE。

本轮权威恢复：docs/v076/rebuild-v37-source-first/stages/R7/R7.4-M08-CI.md；证据evidence/r74/m08-ci/checks.json。不要重复读取R0–R7历史。下一步读取最终SHA的Windows validation-results/m08-integrity/report.json及ci/quality.json；按真实结果关闭M08或只修具体失败。不进入R7.5/R8；M01–M07保持，B02人工项仍交R8 NOT_RUN。

基线Quality40805896252双平台/最终pr-gate FAIL，均隔离门禁；基线pr-trust40805894615因完整SHA所有者复核要求FAIL。最终提交将触发原PR CI，状态提交后读取；本轮不等待。所有者审批入口actions/workflows/pr-trust.yml，选择main：pr_number=15，source_sha=最终完整SHA，confirm=review 最终完整SHA。不绕过/自批。

正常保存到原PR并独立核验HEAD、完整tree、关键文件后立即结束；不新分支/PR、不强推、不合并发布。


## 2026-10-29：最终两项 CI 精准修复
基线80e5f8dd2aa0f3487aad88626125f57fb06bfeb5，原PR15/原分支。P1语义定位与继续学习名称修复，本地真实PASS；Electron准备拆为独立必需门禁，原校验installer及缓存、文件/运行时版本架构验证、本地首次及复用PASS。构建/原生产隔离PASS，core 5/5及语法/diff PASS；未重跑全量业务。Windows准备及M08六组NOT_RUN，M08 BLOCKED，R7.5待真实6/6和相关质量阻断解除。详见RECOVERY-NEXT.md及R7.4-M08-CI.md末节；保存后退出，不等待CI、不合并发布。
