# 2026-10-30：Windows Server GitHub Actions 自动化补验成功（正式Win10/11仍未签核）

- 已新增仅限`feature/v077`的只读Windows推送测试工作流 `.github/workflows/v077-windows-proxy.yml`，不改PR/发布流水线。运行 **#41035381730 SUCCESS**，源码`44960f900aa94210f60e706aef2b666c7f62fff7`；Node24单元测试、安装、生产Electron构建、5条真实Windows Server GUI代理测试、证据上传均PASS。
- Windows Server 2025 Datacenter，build26100，ProductType3；此前仅按build号识别Win11的风险已修：原生验收要求ProductType1。补充`NEW-01/OLD-03/CLIP-01/CLIP-02/CLIP-04`的CI结果**5/5 PASS**；是新的Windows Server跨平台证据，不冒充真实Win11、Word/WPS剪贴板或IME实测。
- 8条原生Windows重点CASE状态**保持不变**：`NEW-13/CLIP-03/CLIP-09` BLOCKED；`WIN-04/05/06/07/09` NOT_RUN。不得把CI代理当成它们的PASS，也不得自动改250条账本。
- 证据与说明：`docs/v077/WINDOWS-HOSTED-CI-PROXY.md`；`docs/v077/evidence/WINDOWS-HOSTED-CI-RESULTS.json`；[CI运行](https://github.com/Aides8Stack/GankSoft/actions/runs/41035381730)；[证据包](https://github.com/Aides8Stack/GankSoft/actions/runs/41035381730/artifacts/12968156118)，SHA256 `98b02aa659c33ef7c663bf8ff731b2c3ca22c647198704b9d27c613896d2924e`。
- 下一步：如要完成8条物理验收，需真实Win10/11客户端交互式VM或自托管Runner；不可再使用GitHub托管Server替代。修复工作及P1其他Work结果不回滚。禁止自动合并/发布。

---

# 2026-10-30 P1五批次 B1 收尾（本轮最新）

仅B1：34条唯一CASE全部实际执行，43次尝试，30 PASS /2 PRODUCT_FAILURE /2 TEST_INFRA；账本2 NOT_RUN与两条设施问题为同一批，0 BLOCKED。原PASS/FAIL/BLOCKED零自动重跑，不进入B2。本轮状态IN_PROGRESS（两条设施问题未有可信结论），不是全PASS。

权威 `docs/v077/P1-B1-REPORT.md`、`docs/v077/evidence/P1-B1-RESULTS.json`；新增异步4 Worker `p1-parallel.mjs`及固定五批计划`P1-FIVE-BATCHES.json`。生产固定`4e2e0fe3e208c7134763332d9d872983538205bc`；测试脚本精确本地SHA c314ebbda54682fb30169c0c8cb0ad1f7a414968 /648be690963d0405683aa02222c76f18c98a8ff0；不可改写为最终文档SHA。依赖复用、仅一次构建411输出，全程匹配输入/输出指纹。原始证据ZIP及源码bundle见本轮证据回执。

新增真实缺陷ENV-05（窄窗口侧栏遮挡收起按钮）、CAT-03（空格名底层错误并锁住取消）。CAT-07/NEW-08设施重试各一次已耗尽，保持NOT_RUN；最后驱动补正未再次实测，不得自动第三次运行。调度器与聚合自检4/4 PASS，collect/promote原安全校验未改。

已按CASE合并并保留同期F3 `c00119f54530f59b0a42529e1ccdb1cadc2bc2fb`五条结果/缺陷字段；全250：117 PASS /3 FAIL /3 BLOCKED /127 NOT_RUN。未改生产/版本/锁/CI，所有Windows层保持原值。

下一轮只需environment status后运行 `node tools/validation/v077/p1-parallel.mjs run --batch B2 --workers 4`；不重新设计/拆小阶段，不自动重跑B1遗留。B5仅真Windows。本轮保存核验后立即退出，不等CI、不合并或发布。

---

# 2026-10-30 F1–F3：已知缺陷修复检查点（本轮最新）

本轮授权范围已结束：实际修复3BUG，GH-20→EDITOR-20/21、MEDIA-03、NEW-16共4条正式Linux Electron PASS；均FIXED_PENDING_WINDOWS。FAULT-05真实复验仍FAIL，现行文档明确暂存后不自动删除，标记CONTRACT_REVIEW_REQUIRED，未改清理逻辑或断言。GH-16/17/21用户P0报告原样保留，不宣称已修。

权威 `docs/v077/KNOWN-DEFECT-FIX-REPORT.md`；永久证据 `docs/v077/evidence/KNOWN-DEFECT-FIX-RESULTS.json`。生产保存F1 `5057ea4eba38cb79d73580fa92054cc4b053d525`，F2 `4e2e0fe3e208c7134763332d9d872983538205bc`；精确被测本地SHA及相同Git tree映射见证据。Shell push缺凭证，使用已有GitHub连接器非强推追加，最终文档SHA由远端HEAD读取。

唯一账本经现有promote.mjs更新本轮5CASE，当前87PASS/1FAIL/3BLOCKED/159NOT_RUN；其他245条对象/全部Windows层未变。F1/F2必要构建均成功；依赖/有效初始构建复用，无安装/锁修改；反馈和既有草稿/发布关联测试27/27 PASS。未跑其余P1/91/250，不等CI、不合并develop、不发布、不改版本。Win10/11真实桌面/物理剪贴板/中文字体视觉未验，不冒充已通过。

下一：先核远端feature/v077最新HEAD；按新授权做Windows补验、FAULT-05请求级暂存清理合同决定或继续独立P1测试Work。本Work最多F1/F2/F3，保存并核验后停止；不要重开已有效PASS或恢复旧T2-A指令。并行Work成果必须按字段合并，禁止旧副本覆盖。

---

# 2026-10-30 最新检查点：v0.7.7全250条CASE的自动化脚本全部注册（M4/M5尚未实测）

- 权威报告 `docs/v077/T2-M4-M5-SCRIPTS.md`；新增M4 40条（图片6/交换10/备份回收站9/故障8/设置7），M5剩余4条（WIN-01/02/03/08）。现有注册表 `tools/validation/v077/registry.mjs` **250/250**，原CASE无增删、零重复。新脚本 `scenarios/m4-{support,media,exchange,storage,faults,settings}.mjs`、`scenarios/m5-win-{package,ui}.mjs`，复用扩展 `win-dialogs.mjs` 处理 BACK-14，新增 `m5-pair-verify.mjs`、`tests/v077-m4-m5-handler-coverage.test.ts`。
- **只完成代码/注册/静态检查，不声明44条Electron实测PASS。** 另一个Work同期完成优先91实际补测，当前账本为 **83PASS / 5FAIL / 3BLOCKED / 159NOT_RUN**；已完成证据不可因补脚本重复运行或覆盖。
- 44条新增脚本的反馈判定至少涵盖GUI用户操作+可见状态/提示+业务读回+相关重启/文件/哈希；Windows需要真实物理输入及/或配对实机证据。不存在来源时继续NOT_RUN/BLOCKED，不冒充业务FAIL/PASS。
- 下一步先在完整Node24/Electron环境运行 `node --experimental-strip-types --test tests/v077-m4-m5-handler-coverage.test.ts` 和 `phase.mjs audit`；再从当前账本**只选NOT_RUN**的M4/M5 CASE进行首次实测。务必先辨别TEST_INFRA并定向修复测试驱动，业务FAIL交由Sol High；不得借此重测已通过83条或重复复现5条已确认FAIL。
- 禁止任何生产源码修改/自动合并/发布/等待CI；所有新源码与报告正常保存唯一 `feature/v077` 分支，以远端实际最新SHA恢复。

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

# 2026-10-30 最新检查点：91条优先测试全部具备脚本，原3条Windows BLOCKED有真实补验处理器

- 权威说明 `docs/v077/WINDOWS-PRIORITY-8-SCRIPTS.md`。新补8条：P0 `NEW-13/CLIP-03/CLIP-09` 原BLOCKED，P1 `WIN-04/05/06/07/09` 原NOT_RUN。对应 `scenarios/win-{ime,clipboard,dialogs,portable}.mjs` + 共享 `scenarios/win-native-support.mjs` + `win09-verify.mjs`，`registry.mjs` 现在206/250条，**用户优先91条全部注册91/91**。
- 实际质量账本**未修改**，全250仍72PASS/3FAIL/3BLOCKED/172NOT_RUN；优先91仍67PASS/3FAIL/3BLOCKED/18NOT_RUN。状态只为 **SCRIPT_IMPLEMENTED_NOT_EXECUTED**。
- 真实Windows门禁：Win10/Win11 x64 + 可见交互桌面 + `GANKSOFT_WIN_SUPERVISED=1` + 原生Word/WPS/浏览器/记事本/截图工具、可信IME组合输入/物理Ctrl+S、Ctrl+V和F8确认；缺条件继续BLOCKED，不虚报FAIL/PASS。原 `platform-required.mjs` 占位已被专属注册表覆盖。
- 这三条历史BLOCKED执行入口：`node tools/validation/v077/phase.mjs run T2-M5 --retry-blocked --checkpoint M5-P0-FOLLOWUP`，已调整为优先补验；其他优先CASE：`node tools/validation/v077/run.mjs run --ids WIN-04,WIN-05,WIN-06,WIN-07`。
- `WIN-09` 必须真Win10+Win11两端启动**同一便携ZIP解压EXE**，每端新卡→草稿→发布→复盘→重启，主流程分别生成本地proof；独立 `win09-verify.mjs` 检查同ZIP/EXE/生产SHA并输出`READY_FOR_HUMAN_REVIEW_NOT_AUTO_PASS`，绝不单机冒称通过。
- 新增 `tests/v077-windows-priority-8.test.ts` 可在Node24完整Work树静态+合同测试；当前仅远端注册和源码语法核验，没有真Windows执行。无生产代码修改，无新用例PASS，不等待CI、不合并、不发布。
- 之后建议先在真实Windows Work/本地环境执行这8个，额外M1/M2/M3新脚本也需要真Electron运行；完整250尚缺M4 40条与M5另4条，共44条脚本。

---

# 2026-10-30 最新检查点：T2-M3 47条已按模块编写自动化GUI脚本（尚未实测）

- 当前唯一分支 `feature/v077`，权威报告 `docs/v077/T2-M3-SCRIPTS.md`。M3 5组：PLAN 12、REVIEW 9、KNOW 12、MD 9、AN 5，47条全部注册到 `tools/validation/v077/registry.mjs`，无遗漏重复；新增 `scenarios/m3-{support,planner,review,knowledge,markdown,analytics}.mjs` 和 `tests/v077-m3-handler-coverage.test.ts`。
- **仅 SCRIPT_IMPLEMENTED_NOT_EXECUTED**：静态语法和远端CASE覆盖检查完成；Node24单元检查和真实Electron GUI尚未运行。不可冒充PASS，`E2E-RESULTS.json` 仍 **72PASS/3FAIL/3BLOCKED/172NOT_RUN**。
- 总脚本：M1 47 + M2 29 + M3 47 = 123条新增脚本（合计已注册198/250）；**尚缺M4 40 + M5 9 共49条专属处理器**。原Windows阻断、MEDIA-03/FAULT-05等缺陷仍保留。
- 如果继续写脚本，下一阶段**M4（40条）**；如果进入真实执行，推荐GPT-6.1 Sol Medium，先 `environment.mjs status`、再相应 `tests/v077-m3-handler-coverage.test.ts` 和 `phase.mjs audit/list/run T2-M3`，按实际GUI结果修测试设施并用collect/promote生成可信结果。先前M1/M2也尚未真正运行，不能跳过核验。
- 此次不改生产源码、不重复安装/构建、不等CI、不强推、不合并、不发布。当前记录以GitHub实际远端HEAD为准。

---

# 2026-10-30 T2-M2：29条自动化处理器已按模块补齐（SCRIPT_IMPLEMENTED_NOT_EXECUTED）

- 真实 CASE 覆盖已登记：EDITOR-01～19、EDITOR-20/21、CLIP-05/06/07/08/10/11/12/13，共 **29/29** 映射到4个模块驱动，公共支持见 `scenarios/m2-support.mjs`，注册表 `registry.mjs`。
- 详细报告：`docs/v077/T2-M2-SCRIPTS.md`；新增 `tests/v077-m2-handler-coverage.test.ts`。仅远端静态检查，**未在Node24/Electron实际运行**，不能标记CASE为PASS；唯一账本仍 **72 PASS / 3 FAIL / 3 BLOCKED / 172 NOT_RUN**。
- 先前 M1 47条脚本也尚未实际 Electron 验收。M3/M4/M5仍缺实现；不混淆脚本注册、单元测试与真机 GUI 操作。
- 下一 Work：GPT-6.1 Sol Medium；读最少恢复文档，执行 `environment.mjs status`、`node --experimental-strip-types --test tests/v077-m2-handler-coverage.test.ts`、`phase.mjs list/run T2-M2`，真实失败按 TEST_INFRA/PRODUCT_FAILURE 分类；**先提交修正后运行，按精确SHA收集**。默认执行阶段仍先T2-M1，除非用户另选。
- 保留 `MEDIA-03`/CLIP-12独立宽度严格断言、GH-20两个小窗口的1500/1366/900视觉可用性阈值，不允许为了PASS弱化。Windows物理来源独立签核。
- 此轮无生产代码修改、无新实测PASS；不等CI、不合并、不发布。

---

# 2026-10-30 T2-M1 按模块补齐47条自动化GUI场景（当前最优先）

**进度：SCRIPT_IMPLEMENTED_NOT_EXECUTED，绝不等于业务PASS。** 生产代码冻结；本轮新增模块场景与注册表及测试夹具，不执行真实Electron、不改业务状态。权威技术记录：`docs/v077/T2-M1-SCRIPTS.md`。最新远端HEAD以分支查询为准。

- 8 ENV：`scenarios/m1-app.mjs`；10 CAT：`m1-catalog.mjs`；8 HOME：`m1-home.mjs`；11 NEW/OLD：`m1-cards.mjs`；10 LIST：`m1-list.mjs`。总计47个原始CASE一一注册，无重复映射。
- 共享`m1-support.mjs`与`helpers.mjs`的`fixtureFactory`扩展提供真实空 Schema606 合成库和中文空格数据路径；所有用户操作经Electron Playwright GUI触发，IPC/SQLite只读断言用于验证，合法`fixtureSetup`仅初始化合成用例。
- 静态检验：47/47 CASE注册，0缺失、0重复，6个新增场景/共享模块语法可解析。附加`tests/v077-m1-handler-coverage.test.ts`可供Node24运行。尚未在Node24完整仓库执行单元/Electron，不能冒称自检PASS。
- 唯一结果账本保持 **72PASS/3FAIL/3BLOCKED/172NOT_RUN**；现有3业务FAIL与3Windows阻断未改变。
- 下一次Work `GPT-6.1 Sol Medium`：先`environment.mjs status`；运行`node --experimental-strip-types --test tests/v077-m1-handler-coverage.test.ts`、`phase.mjs audit`、`phase.mjs list T2-M1`。只针对实际错误修测试脚本，脚本先提交GitHub后再按正确SHA执行`phase.mjs run T2-M1`。
- 每次`phase.mjs run`只执行下一个未完成内部检查点。通过`collect.mjs`先dry-run再write、`promote.mjs`审证据、保存远端SHA，继续下一个；不要重跑历史72条已PASS。T2仍不修业务、不合并、不发布、不等待CI。
- 新场景可能遇到实际UI不支持或驱动定位不符，必须真实运行后才分类；M1不是已通过。剩余M2-M5各模块处理器仍按需补齐，Windows真人物理场景必须在Windows证据条件下执行。

---

# 2026-10-30 最新指令：剩余172条合并为5个对外执行阶段

- 新权威：`docs/v077/MERGED-5-STAGES.md` 和 `docs/v077/evidence/T2-MERGED-PLAN.json`。原17批历史计划原样保留为内部来源，不再每小批开Work。
- 当前72PASS/3FAIL/3BLOCKED/172NOT_RUN。五阶段：T2-M1 47、T2-M2 29、T2-M3 47、T2-M4 40、T2-M5 9；额外Windows补验3条原有P0 BLOCKED不双计。
- **下轮直接T2-M1，GPT-6.1 Sol Medium。**先`environment.mjs status`、`phase.mjs audit/list T2-M1`；`phase.mjs run T2-M1`逐内部检查点运行。一次Work可连续多个内部检查点，各次持久保存，额度不足立即停止。
- 本次只重排测试工具和文档，无新增CASE PASS，无生产源码改动；继承原3FAIL和4用户报告。不等CI、不合并/发布。

---

# 2026-10-30 T2-A 紧急保存检查点（优先于历史）

T2-A IN_PROGRESS，按所有者额度收尾指令停止；35条P0已登记31PASS/1FAIL/3BLOCKED/0NOT_RUN，不宣称P0全部通过。全账本72PASS/3FAIL/3BLOCKED/172NOT_RUN；原41PASS/2FAIL未重跑且逐CASE保留。新观察FAULT-05：异步粘贴被拒后未引用暂存图片重启仍在，待I3合同评估；未修生产源码。3项平台阻塞NEW-13/CLIP-03/CLIP-09交T2-W；所有Windows签核层NOT_RUN。

被测生产基线e40c896a1876c9f6c4115c6267e96b16e2564e0a；测试工作树与最终脚本指纹详见docs/v077/evidence/T2-A-RESULTS.json。依赖/410构建哈希复用，无安装/编译；框架14PASS。10次工具失败尝试及定向复验保留。原始二进制截图仅本地，不冒称GitHub已保存PNG。

唯一feature/v077→develop。恢复只读docs/v077/T2-A-REPORT.md、E2E-RESULTS.json、REMAINING-207-PLAN.md；先environment.mjs status，再batch.mjs list T2-P1.01，实现本批缺少处理器后运行。其余172 NOT_RUN全部已有安排。保持现有计划原样；远端17批计划原样保留；新结果仅追加到唯一账本与派生JSON。T2-C/T2-W入口同表；已有3FAIL留I3/F4，不在收集阶段改业务。用户数据禁止访问。保存后立即结束，不等CI、不合并发布。

当前文档保存SHA由远端HEAD和Git历史解析；此段不虚构自身SHA。下方历史仅供必要时查证。

---

# 2026-10-30 最新计划修正：剩余 207 条必须分批执行（优先于下方 T2 最小补验建议）

用户要求 **207 条全部有具体分阶段执行安排**。唯一权威批次表：`docs/v077/REMAINING-207-PLAN.md`；已冻结每条未测CASE的所属批次、数量和模块。原计划仅做少量T2补验不能视为207条完整执行。

- T2-P0：3批 12+11+12=35；**下一轮从 T2-P0.1 开始**（NEW/OLD P0合计12），GPT-6.1 Sol / Medium。
- T2-P1：11批共141，按ENV/CAT、NEW/OLD、LIST、EDITOR、CLIP、PLAN、REVIEW、KNOW、MD、MEDIA/EX、BACK/TRASH/FAULT依次执行。
- T2-P2：2批13+9=22，HOME/AN与EDITOR/SET。
- T2-W：9条WIN（属于P1但单独统计）；平台专属P0的物理Windows后续验证在此交叉补证，不额外重复计数。
- **总数35+141+22+9=207，不删不漏不双计。** 41条已PASS和2条已FAIL不进入本计划的207个新测试计数。
- 仍然先收集问题，再I3统一分类、F4集中修复；受阻Windows真机不能虚报PASS，也不无限阻止修复已证实问题。每批保持准确SHA、最小报告和Token节约规则。
- 此处仅修改计划文档，**没有新增任何实测PASS或生产修复**。执行前始终读取远端实际HEAD和唯一结果账本，已通过的场景不无意义重跑。

---

# 2026-10-30 T1-C 当前检查点

T1-C DONE（指定Linux收集范围）：exchange 3PASS、settings 4PASS、storage 5PASS、reliability 3PASS+WIN-09 NOT_RUN；补充 KNOW-12 PASS。合计16条新增有效PASS，无新增业务BUG。累计实测待修2项（NEW-16、MEDIA-03）及4项USER_REPORTED保留；7条本轮测试失败观察归4类TEST_INFRA，均定向复验PASS。全账本41PASS/2FAIL/207NOT_RUN，未碰Windows层。

权威 docs/v077/T1-C-REPORT.md；永久摘要/回执/文件索引 evidence/T1-C-RESULTS.json。精确测试SHA分批见报告；最终定向脚本377c6c41d4bd3162a22cc911d19dc9be05388ff5。dependencies+410构建全复用，无安装/编译；框架12/12。未改src/electron/shared生产代码，不等CI、不合并发布，本轮结束。

I3初步归类条件具备，但全平台收集未完；下一仅T2最小补验：真实WIN-09+原Windows草稿反馈；WIN-05原复制源/GH-16；EDITOR-20/21窗口；BACK-09独立数据库合并；BACK-10中文空格迁移；WIN-07真实原生弹窗。不要重跑250条或重开已通过Linux项。KNOW-12不再遗留为未测；重名/缺父等变体没有冒称覆盖。

当前唯一分支feature/v077→develop；最终文档SHA查远端HEAD。本轮实际来源依次c9c38e4、c3bf0ed、7162b9a、377c6c4，完整SHA在报告。先environment status核验410输出/指纹；同输入缓存继续复用，禁止重复prepare/ci/build。Windows CI/实机均NOT_RUN；测试注入不等于物理Windows操作。

用户真实数据禁止访问。T1-C只收集、未进入修复；继续须遵循下一轮授权，不自动I3/F4。
