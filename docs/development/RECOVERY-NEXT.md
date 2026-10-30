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
