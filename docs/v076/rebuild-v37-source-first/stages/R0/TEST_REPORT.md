# 2026-10-27 R0：12 节点基线与 24 项复核 — IN_PROGRESS

起始远端 `2235c62feea38dff74528bbd5277121195fadf45`，与本地暂存树一致，父 `a0fdba13b772b9507291773e16591d974f8bb75b`；PR #15 Draft。沿用已保存审计及回归，不重装依赖或重做全量测试。本轮仅 R0。

24 条原动态 NOT_RUN 行已逐条归类并记录事件、正式组件/DOM、typed API、数据源、候选测试、差异责任和下一步，见 `STATE-SEMANTIC-MAP.json` 的 `closureReview` 及 `R0-24-STATE-REVIEW.md`：14 BUSINESS_ADAPTED、10 MISSING_IN_PRODUCTION；类别不代表动态测试 PASS。另将三个 review-result 原型脚本注入别名标为 UNREACHABLE_IN_PROTOTYPE；其正式业务结果有独立证据。复盘固定演示、实际知识森林 12/4/3/2/3 与标示数字不同、设置 general/about 缺失及 operations/ai 必须保留的责任沿用 `SEMANTIC-GAPS.md`。

新工具 `tools/validation/r0/visual-12.ts` 复用已有隔离策略：冻结 HTML 两根森林，真实 typed IPC 创建并读取 Schema606 12 节点，逐项断言名称、父子及正文一致；选中语境分析、开启详情，采集原型与生产 Electron 的 1500×900、1366×900、900×900 PNG 和 DOM/computed-CSS 快照。首次执行因新脚本语法错误退出 1，修正后退出 0；证据 `evidence/visual-12/commands.txt` 和 `manifest.json`。截图采集 PASS 不等于视觉一致。

**R0 Gate：IN_PROGRESS。** 12 节点数据及选择经核验，但严格视觉同语义条件仍未全部满足：已通过 CDP 采集：原型图谱三宽均 100%，生产 1500/1366 宽为 100%、900 宽 `scaleFit` 为 70.9321%；所选中文节点字形两侧均为 Noto Sans CJK SC Regular（CSS 栈不同，未宣称所有字形一致）；逐节点展开状态未独立断言，生产截屏存在遮挡；原型还展示固定关联卡片数，隔离库没有对应关联。两侧均为浅色但颜色不同。截图显示生产合成展示根、左右图谱、右侧面板和工具栏与原型不同，后续 R5 负责 UI 差异；本轮不改生产实现。Windows、物理图片剪贴板、真实中文 IME 和视觉一致性 NOT_RUN，不把截图收集或静态分类称为测试 PASS。R1/R2 仍 NOT_STARTED。

继承上次 12 节点只读链路 5/5、未注入生产 Electron 18/18、37 项关联测试 PASS，详情见既有证据；本轮未重新运行。起始完整 SHA 的 pr-trust 为 failure（run 40483074386），需要所有者独立审核，不自行批准或绕过；当前检查点 SHA 由 Git 历史读取。下一轮关键任务：用同一节点集补齐 900 宽图谱缩放、展开状态及关联数语义，使三宽对照达到严格可比，再重新判断 R0 Gate。

---

# 2026-10-27 R0 收尾核验：IN_PROGRESS

本轮起始远端 `a0fdba13b772b9507291773e16591d974f8bb75b`，PR #15 为 Draft；本地树与该远端树一致。确认 `milkdown-adapter.ts` 仅过滤序列化前后相同的通知，保留真实变更回调。继承上轮 12 节点隔离 Schema606 A–E 修复后 5/5、未注入生产 Electron 18/18，以及真实编辑、导出不写入与 Electron 重启读回证据（`evidence/readonly-matrix/`）；不把历史修复前失败删除，也不重新声称旧视觉截图在新源码指纹下通过。

本轮补测：`node --experimental-strip-types --test --test-concurrency=1 tests/card-draft-controller-v075.test.ts tests/card-drafts-v075.test.ts tests/knowledge-markdown-media-v075.test.ts` 退出 0，37/37 PASS，覆盖自动保存排队、失败重试、CAS 冲突、关闭前未保存错误、图片数据库及重开；`npm run build:editor-spike` 退出 0；`node tools/smoke-editor-v075.mjs` 退出 0，17 个记录项 PASS（另有一个无状态颜色探针），覆盖编辑器自动保存/失败重试、注入剪贴板图片、Markdown、真实 IPC 及资源、异步粘贴目标和编辑器销毁重建。该 spike 图片走注入剪贴板、重启使用 JSON 夹具与真实暂存资源，不能冒充系统剪贴板或 Schema606 UI 端到端；详细证据 `evidence/closure-a0fd/`。原有 Schema606 数据服务与真实 Electron 重启证据独立继承。

**Gate：IN_PROGRESS。** 52 条状态源码/责任映射已保存，旧统计中的两条关联原失败已被修复后对应链路证据替代，但其余 24 条未运行/缺失能力并未因本轮回归变成动态 PASS；须逐项完成可执行状态与事件闭环、对不可达或未实现状态明确责任。严格同语义视觉基线仍只部分可比：28 节点规模夹具不等于原型 12 节点森林；既有 overview/editor/settings 差异归后续 UI 阶段，不要求在 R0 修复，但必须建立可比证据。系统图片剪贴板、Windows 实机与真实中文 IME 为 NOT_RUN；不可将注入路径或截图采集视为通过。R1/R2 均 NOT_STARTED。

复盘固定答案和 08:42 为演示、result 为不可达注入别名；知识点原型真实森林分别为 12/4/3/2/3 而非显示数字；设置 general/about 缺失，operations/ai 必须保留，详见 `SEMANTIC-GAPS.md` 与状态映射。不要修改 FSRS、Schema606 或生产数据以适配原型。起始完整 SHA 的 pr-trust 为 failure，run 40482172698；既有原因 CI_POLICY_REVIEW_REQUIRED，需所有者独立审核新完整 SHA；未自行批准或绕过。

下一轮关键任务：针对 24 条未闭环映射补可执行动态证据并标清不可达/缺失项，建立 12 节点同语义视觉比较；在可用系统剪贴板/Windows 环境补真实图片粘贴验收。无须重复已有效基础索引或全部测试。最终远端提交以本文件 Git 历史为准。

---

# 本轮R0：知识只读写入修复，阶段仍 IN_PROGRESS

起始远端b3ba983bf16d78391c40dab7f9eaf40a71b71eca，父08893a4eb328bcc72589c4da8e8a8bb65f922870；同一历史未覆盖。隔离12节点五场景中修复前C/E发生无用户编辑的revision/hash/正文变化；确认Milkdown新旧序列化字符串相同却通知changed，后续dirty/flush提交CAS。已针对无变化回调作最小修复，未改Schema606/FSRS。

诊断构建A–E修复后5/5 PASS，真实编辑保存、导出预览无写和关闭重启读回PASS；不含诊断注入的生产构建重跑原18场景18/18 PASS；关联24项编辑器/知识/Markdown测试24/24 PASS。完整命令、前后原始字节/修订/hash与调用堆栈见stages/R0/evidence/readonly-matrix。新旧生产源码指纹不同，旧截图及测试只保留为历史证据，不声称本轮重新通过。Windows、全量视觉及所有剩余状态NOT_RUN；R0 IN_PROGRESS，R1/R2 NOT_STARTED。

下一轮先审查新修复对其他编辑/媒体路径及R0剩余动态状态的影响，按实际代码变更补必要回归，再完成同语义视觉基线和阶段Gate。起始b3ba983的pr-trust仍failure/run40480180171，需要所有者对相应完整SHA独立审核；不自批、不改门禁、不合并不发布。当前检查点自身SHA由Git历史解析。

---

# R0 本轮状态/语义补测报告

被核验远端4765bef6966ceb4cb277779daa8db3716578d52a；工作树起点cb32104074c9f97797c82388eef25e9705565239与远端tree一致。Linux、既有Node/Electron/build；生产指纹0f2932e50b3eaa98455b64c0ac86ae4df51080c36117a76a2f511814bdabe4dc保持不变。

| 实际命令/检查 | 退出码 | 本轮结果 |
|---|---:|---|
| node --experimental-strip-types tools/validation/r0/semantic-checks.ts（最终run5） | 1 | 18个不同场景：17 PASS，1 FAIL；独立场景收集结果，整体仍失败 |
| node --experimental-strip-types tools/validation/r0/normalization-repro.ts（最终缩小路径） | 0 | 两条严格不变性PASS；NOT_REPRODUCED，不代表原失败修复 |
| python3 tools/validation/r0/state-matrix.py | 0 | 52行合同引用核验；26行关联PASS、2行关联同一FAIL、24行动态NOT_RUN，不算功能通过率 |
| 既有生产指纹/103个二进制证据SHA256核验 | 0 | PASS，保留42PNG/24并排图/36DOM CSS及52状态压缩证据 |
| git diff --check；JSON解析；Python编译；Node工具语法检查；敏感模式扫描 | 0 | 保存前检查，无生产测试含义 |

前序run1 headless视口未显式设定导致click超视口，run2未等设置异步组件挂载导致空分类列表，修正工具等待真实条件；run3/run4保留严格只读不变性失败及原始断言。run5以独立场景记录失败并保持exit1，没有忽略修订、放宽deepEqual或给失败标PASS。缩小路径最初“必须复现”的诊断假设未满足而exit1，最终区分correctness结果与NOT_REPRODUCED，全部尝试保留在semantic-v1/attempts。

## 门禁（范围明确）

- 源码与语义映射：52行完成审读与责任归属；动态事件完整闭环仍未通过。
- UI_INTERACTION/IPC_API/BACKEND_INTEGRATION/PERSISTENCE_RESTART：新增场景的具体PASS见result.json；知识只读路径为FAIL，不将整个业务模块标PASS。
- NEGATIVE_SECURITY：新question冻结改写拒绝、弹窗/预览取消有补证；只读出口不变性FAIL。
- VISUAL：继承已有明确差异，非PASS；未重拍或重新视觉签核。
- REGRESSION：旧59项有效结果按同生产指纹继承，本轮未重新执行；未跑全量。
- WINDOWS_REAL：NOT_RUN。

pr-trust起始SHA failure/run40476383506/job122095533132日志为CI_POLICY_REVIEW_REQUIRED；中途08893a4仍failure/run40479030390。不审批或绕过，不等待/轮询CI。

---

# 上轮报告（继承，不是本轮重跑）

# R0 实际测试报告

起始远端bccf6ff9f601bb586d5a3f1203378c825ac28eb8；本地同tree parent c074dfa33dc4786fdd77e6215b470baae1433c4f。Linux / Node24.22.1 / npm11.9.0 / Electron44.9.1；采集工作树包含新增工具和记录，生产实现指纹见manifest。没有修改生产源或锁文件。

| 实际命令 | 退出码 | 结果 |
|---|---:|---|
| sha256sum docs/v075/reference/OPEN-ME-v3.7.html package-lock.json | 0 | 原型与锁文件匹配预期 |
| timeout 90s npm ci --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000 | 0 | 381 packages / 11s；联网成功；http-proxy配置warning |
| npm ls --depth=0；首次require(electron) | 0 | 无缺项；下载锁定44.9.1二进制 |
| npm run build | 0 | 类型检查/生产bundle通过；保留大chunk提示 |
| node --experimental-strip-types --test --test-concurrency=1 tests/dashboard-v076.test.ts tests/unified-analytics-catalog-v075.test.ts tests/protocol-v2.test.ts | 0 | 28/28 PASS |
| npm run check:protocol | 0 | 21/21再次PASS，边界/类型PASS，导出148方法 |
| node --experimental-strip-types --test --test-concurrency=1 tests/unified-knowledge-v075.test.ts tests/unified-review-v075.test.ts tests/unified-workspace-v075.test.ts | 0 | 31/31 PASS |
| node tools/validation/r0/source-audit.mjs | 0 | AST/CSS/SFC/148协议索引，不算产品测试 |
| node tools/validation/capture-ui-reference-v076.mjs overview | 0 | 初步3图；缺字体试拍，不用作最终视觉证据 |
| node --experimental-strip-types tools/validation/r0/capture.ts（最终run7） | 0 | 3组实际验证，36张PNG；真实production UI/IPC/数据库与新进程读取 |
| node tools/validation/r0/reference-states.mjs | 0 | 52个原型DOM状态；只证明原型渲染 |
| python3 tools/validation/r0/collect.py | 0 | 36图尺寸/hash核验、36压缩快照、18并排图 |
| git diff --check；JSON/gzip/image/敏感模式检查 | 0 | 必须在保存前完成，不作为产品测试 |

59个不同业务/协议测试通过；包含check:protocol重复执行后合计80次通过执行，不把重复21项加成80个不同用例。

## 失败与修复（未改生产逻辑/断言）

1. 夹具多传mode/title → strict input ZodError（exit1）。改为仅传契约scope。
2. question/qa未reveal即submit → SESSION_STAGE_CONFLICT（exit1）。按真实状态机先reveal。
3. submit反思未存草稿 → SESSION_DRAFT_CONFLICT（exit1）。先保存一致反思。
4. direct已处reveal还改独立思路 → ANSWER_FROZEN（exit1）。保留被冻结思路。
5. 图谱选择器误写tag、再遇多元素strict/隐藏返回按钮（exit1）。根据真实DOM使用class及用户可见角色入口，不force click、不加固定sleep。
6. 初始中文缺字：安装官方Noto CJK字体并记录hash；旧图拒为验收。补字体后完整重拍，最终run7 exit0。

失败详情保存在evidence/*.txt；部分失败是同一脚本不同修订，不算产品功能失败。最后没有跳过测试或放宽断言。

## 分类门禁（本轮范围）

| 类别 | 状态 | 覆盖边界 |
|---|---|---|
| VISUAL | FAIL | 已人工看到overview/editor/settings明显结构差异；完整逐图签核NOT_RUN，PNG采集PASS不替代一致性 |
| UI_INTERACTION | PASS | 仅六页导航与真实编辑器/会话显示；保存/所有弹层/键盘全覆盖NOT_RUN |
| IPC_API | PASS | 21协议测试、真实夹具及生产读取；全148方法逐端到端NOT_RUN |
| BACKEND_INTEGRATION | PASS | 所列领域测试、真实606夹具与完整性；未宣称全量 |
| PERSISTENCE_RESTART | PASS | 新Electron进程实际读取卡片数/知识/草稿/暂停会话 |
| NEGATIVE_SECURITY | PASS | 关联测试的CAS/跨集/权限/边界；所有UI负向分支NOT_RUN |
| REGRESSION | PASS | 59个不同测试范围；全量npm test/Windows回归NOT_RUN |
| WINDOWS_REAL | NOT_RUN | 当前Linux，非Win10/Win11/IME/物理剪贴板验收 |

pr-trust: run40471765200/job122080307175，failure=CI_POLICY_REVIEW_REQUIRED。只保存必要脱敏片段和15个控制路径，不自批、不改workflow。起始PR quality run40471768208观察时ubuntu成功、windows进行中；未等待/轮询，不声称整套通过。

最终补充：reference-states最终脚本exit0，52原型DOM状态+6张同appearance/full-map参考；额外6张并排图。合计42张PNG、24并排WebP。`evidence/CHECKPOINT-FILES.json` 列本轮修改/新增的完整路径、大小与blob/hash（不含其自身）；未添加或修改tests/下文件。完整图像逐区域签核仍NOT_RUN。

## 本轮命令（实际退出码）

| 命令 | 退出码 | 结果 |
|---|---:|---|
| `node node_modules/vite/bin/vite.js build --config tools/validation/r0/trace-vite.config.mjs`（首次） | 1 | 对Vue样式子模块误应用观察器；保留失败，修正后构建0 |
| `node --experimental-strip-types tools/validation/r0/readonly-matrix.ts`（修复前run2） | 1 | 5个隔离场景A/B/D PASS、C/E FAIL，严格revision/字节/treeHash断言未削弱 |
| `npm run build` | 0 | 修改后完整类型检查及生产构建通过 |
| `node node_modules/vite/bin/vite.js build --config tools/validation/r0/trace-vite.config.mjs`（修复后） | 0 | 仅为捕获实际调用来源的诊断构建 |
| `node --experimental-strip-types tools/validation/r0/readonly-matrix.ts`（修复后） | 0 | A–E 5/5；E包含真实编辑保存、导出不写、关闭重启读回 |
| `node --experimental-strip-types --test --test-concurrency=1 tests/editor-v075.test.ts tests/unified-knowledge-v075.test.ts tests/knowledge-markdown-store-v075.test.ts` | 0 | 24/24；含revision冲突和回滚/失败/导出预览断言 |
| `node node_modules/vite/bin/vite.js build` | 0 | 恢复无观察器的标准生产前端构建 |
| `R0_EXPECTED_PRODUCTION_FINGERPRINT=<实测修改后指纹> node --experimental-strip-types tools/validation/r0/semantic-checks.ts` | 0 | 原18个语义场景18/18，原严格断言保留；测试显式核对修改后指纹 |
| `git diff --check`、JSON与有限敏感模式扫描 | 0 | 保存前检查 |

原型截图、旧59测试及旧生产指纹未重跑，不称为修改后通过；本轮24+18为不同测试类型的执行结果，不合并为功能完成数。Windows、全量跨平台及剩余R0 Gate未运行。
