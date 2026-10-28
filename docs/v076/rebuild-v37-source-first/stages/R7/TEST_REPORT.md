
最终构建核验：npm run build 在恢复后的C WIP源码通过；5/5生产文件SHA256与C-c4被测源码相同，验证摘要见evidence/r74/validation-summary.json。未修改的B基线构建也PASS，但其只读路径断言FAIL。
# 2026-10-28 R7.4 第一轮结束 — BLOCKED / C有效WIP

原分支/Draft PR15→develop；A已独立保存e86e677389c96546b842993f8e3b98cf6ab025b5，B已独立保存3c2d6c486315d74bcf5d22f1ebce273a01dbf6ae，完整tree均核对一致；本次C提交自身SHA从Git历史解析。三个单元均已做可执行生产修改；M01/M03残余视觉IN_PROGRESS，M02 BLOCKED，不能报告三个MAJOR全部关闭。

A恢复图谱已有目录/子导航，正式Electron3组和知识11项PASS。B压缩选项/正文留白、收起揭示后思路、定位错误及答案/评分，正式Electron3组和复盘14项PASS。C修复Crepe首屏/空图片区/工具顺序/大纲密度和目录折叠状态，编辑/草稿/Markdown56项及正式卡片编辑1组PASS；大纲三宽/目录折叠断言已通过，但整个大纲组因无编辑正文规范化写回FAIL。未改动B源码的同路径也复现“-→*、追加换行、revision2→3”，baseline源码指纹5/5相同；不是本轮可关闭的UI差异。C图片/导出/长中文后续Electron组NOT_RUN。最终WIP构建与被测源码指纹记录见本轮TEST_REPORT及stages/R7/R7.4-ROUND1.md、evidence/r74/。

R7.3/R1/R7保持IN_PROGRESS、严格视觉BLOCKED，B01/B02未关闭。没有重审R0–R6或重跑R7.1/R7.2，没有上传新PNG/ZIP/数据库，没有改606/FSRS/历史/不可变发布合同，不等CI、不强推/新分支/新PR/合并/发布。

本轮到C保存核验后立即结束。下一轮先从R7.4-ROUND1.md的M02阻塞与readonly两份证据、tools/validation/r7/r74-round1.ts最小诊断入口恢复；不得跳过数据不变性失败。随后M04–M06入口为R7.4-HANDOFF.md对应三行：CardDraftForm.vue类型确认→UnifiedCardBatch.vue移入确认→KnowledgeMarkdownExchange.vue/KnowledgeExchangeMap.vue交换布局，均未开始。本记录优先于下方历史“R7.4 NOT_STARTED/禁入”恢复文字。

# 2026-10-28 R7.4-A 检查点

当前授权M01→M03→M02三个单元后结束；不再受旧R7.3“禁止进入R7.4”恢复范围约束。A正式外壳隐藏差异关闭，三宽及正式Electron3组/知识领域专项/构建PASS；合成根与连线视觉差异仍在，M01 IN_PROGRESS。B/C待继续。本轮记录：stages/R7/R7.4-ROUND1.md与evidence/r74/A.json。R7.3/R1/R7仍IN_PROGRESS，严格视觉BLOCKED，B01/B02不豁免；不等CI。

# 2026-10-28 紧急最终交接：保存后停止

R7.3/R1/R7 IN_PROGRESS，严格视觉BLOCKED；R7.1/R7.2 DONE，R7.4/R7.5/R8 NOT_STARTED。R7-01/04/06 BLOCKED，R7-02/03继承PASS，R7-05 NOT_RUN。未结2 BLOCKER、8 MAJOR、3未批准MINOR，逐项证据文件/窗口宽/预期/复验见stages/R7/R7.4-HANDOFF.md。900px末导航可达，旧不可达结论撤回。

本轮停止开发/截图/额外验收/PNG Blob和分块导出；GitHub仅保存必要文本，不上传111张PNG或完整DOM/CSS。原159文件已独立备份并取回逐哈希核验。按最新用户明确要求新增一份独立交接ZIP（替代早先“不创建新ZIP”的保存方案）：GankSoft-R73-20261028-evidence.zip，15,226,657字节，147文件，111 PNG、24必要原始快照归档；内含146条SHA256SUMS，所有成员可读/CRC/逐文件校验PASS。ZIP SHA-256：09fe71386f0d6e03bdb0ee37cb4e4564aefd725db2a75a40ff34573146117552。持久化标识见supplemental-20261028/export-audit.json.finalHandoverZip。原图不依赖Work目录唯一保存，旧66图仍取原离线备份。

111图分类：73缺失状态、28受影响重采、10与旧manifest重复参考图；5仅诊断（交叉项），0损坏文件，不能将5诊断或10重复计为新增独立视觉PASS。ZIP内旧capture文本仅作原始溯源，当前GitHub报告和export-audit为最终真值；恢复原图时仅提取images/、snapshots/，不覆盖GitHub最新报告。

新账号最小入口：原分支最新HEAD和PR15→AGENTS/STANDARDS→本恢复入口/TASK/HANDOFF→阶段tracker→R7.3-VISUAL-REVIEW、ACCEPTANCE、TEST_REPORT、R7.4-HANDOFF→两组manifest/comparison与attribution/export-audit→下载ZIP先校验外部SHA及内部清单。当前不执行R7.4；新账号按其当轮授权继续。只使用合成606，不读真实用户库。终端此前已证实无推送凭据，采用已连接GitHub文本文件保存，真实parent/base tree、expected_sha、force=false；独立核验远端SHA/文件树后立即退出，不等待CI。

---

## 2026-10-28 精简保存及证据去重（当前规则）

已停止PNG/ZIP二进制Blob上传、49152/98304分块导出及新增采集；进程检查未发现运行中的补采/导出任务。原待提交159文件共16,433,120字节：111 PNG（14,312,334）、24 gzip快照（1,472,110）、24文本（648,676）。运行目录587文件/117,324,295字节含失败重试/接触表/合成缓存，不是提交范围。

111图按旧manifest哈希及状态来源分类：73缺失状态补证、28受夹具/状态修正影响的重采、10与旧manifest哈希相同的重复原型参考图。111内部重复哈希为0；10重复参考图不计新增独立证据。5图仅作诊断（与上述分类交叉），其中原生恢复背景不能当原生确认框验收。旧66原图不可读取，未作跨批逐像素人工复核；只核对manifest哈希及状态来源。原33对/66图和45检查继续继承，未重跑R7.1/R7.2。

全部原159文件和逐文件SHA-256索引已保存为独立检查点备份GankSoft-R73-20261028-checkpoint.tar（16,803,840字节，SHA-256 0670b09ed2a7e22b940ec66bd3f9a7bb42fba342f6f8e2dde93e6fd3feaa57fd）；独立取回备份并验证159文件哈希PASS。恢复标识及分类见supplemental-20261028/export-audit.json。全部本地成果保留，未删除旧图/运行记录；不创建新ZIP或Git Bundle。

源码仓库仅保存必要测试脚本、差异JSON、验收/进度/恢复文档；本次PNG、gzip快照、ZIP、数据库、运行缓存上传数均为0。原始PNG/DOM/CSS仅在本地与已核验独立备份，manifest中的文件名是备份索引，不表示GitHub存在这些文件。历史打包脚本summarize-supplement.py仅保留本地/备份，不纳入本次提交。没有新增业务源码变更；不访问真实用户数据库。提交前核对远端文件树/已有blob，仅保存有差异的文本；小批量UTF-8文件提交，禁止二进制Blob/分块循环。

R7.3/R1/R7仍IN_PROGRESS，严格视觉BLOCKED；2 BLOCKER、8 MAJOR、3未批准MINOR保留。R7-01/04/06 BLOCKED；R7.4/R7.5/R8 NOT_STARTED。原PR #15 Draft→develop，远端保存独立核验后停止，不等待CI、不合并/发布。

## 收尾保存前检查（无新增截图/业务测试）

- 已运行`verify-supplement.py --verify-raw`：111原图及原始快照哈希PASS；随后默认摘要校验PASS，默认输出明确标记raw NOT_RUN，不冒充原图验证。备份独立取回159文件逐哈希PASS。
- `node --check`两份TS和`git diff --check`通过。补采脚本仅增加显式用例/状态、已有缓存和禁止覆盖旧attempt的前置保护；未再次启动Electron。
- GitHub只提交24个文本文件，二进制上传0；旧打包器仅保留本地/备份，不再执行。manifest.finalToolSha256是历史捕获工具，currentSavedToolSha256是本次保存脚本，两者分开记录。

---

# 2026-10-28 R7.3 续验（当前）

基线0912fb55b6fac2116c8cd85ec8c9c740c6555429；Linux/Node24.22.1/Electron44.9.1、隔离真实606、实际Noto Sans CJK SC。正式实现指纹与继承manifest一致；源码src/electron/shared/冻结原型未改。R7.1/R7.2和45检查仅继承，未重跑。

| 命令/检查 | 结果 | 证据 |
| --- | --- | --- |
| npm ci；npm run build | PASS，锁文件未改；build exit0，只有已有体积提示 | 本轮环境恢复构建；未将其算R7.1重跑 |
| `R73_CASES=fixture-audit R73_ATTEMPT=fixture-final2 node --experimental-strip-types tools/validation/r7/supplemental-visual.ts` | PASS局部精确断言；全世界同态BLOCKED | fixture-audit.json：10标题来源/共享演示内容选项、12节点正文、242/53/18 |
| `...supplemental-visual.ts` 选择相应R73_CASES | 有效补采49对/111图；24状态；原生确认/永久删除视觉BLOCKED | manifest selectedRuns/cases；实际命令字段在各运行报告；不是全应用视觉PASS |
| `python tools/validation/r7/summarize-supplement.py --runs ... --out .../supplemental-20261028` | PASS，原始PNG/压缩DOM完整性验证 | manifest.json、comparison.json；哈希可追溯 |
| `node --check` 两份TS；`python tools/validation/r7/verify-supplement.py`；`git diff --check` | PASS：111原图/原始快照哈希、49对、原型/生产/旧证据未改、阶段状态一致 | evidence/r73/supplemental-20261028/checks.json |
| 图像查看 | Codex查看1366主要对照、900重点及明确单侧状态；不是用户/Win人工签核 | R7.3-VISUAL-REVIEW.md、manifest.reviewSamples |
| R7-01 / R7-04 / R7-06 | BLOCKED | attribution：2 BLOCKER/8 MAJOR/3 MINOR |
| 最终全量/性能、Windows/IME/物理剪贴板/同包ZIP | NOT_RUN | R7.5/R8未进入 |

原始工具失败保存在attempts.json：复制夹具未同步控制路径/marker被正常拒绝；分页/同名根/status/heading定位；跨VM数组原型断言；复盘未填必填思路；外部更新活动正文导致CAS/离页保护；尝试100%缩放步进无法准确到达。均未改生产/弱化业务断言。最终森林取运行态，画布按实际matrix与原型会话等比；外部正文准备先离开活动编辑器。原生confirm关闭headless进程属于环境限制，未删残留锁，后续从封闭pristine快照创建新隔离副本；恢复续验仅注入确认boolean，真实UI→IPC→606继续。

有效选中运行中有些是早期总脚本FAIL之前已经完成的独立状态；manifest标出sourceRun，attempts保留失败，未把整个失败运行改写PASS。后续仅重拍受影响/漏拍状态。所有新原图和原始DOM仅保留本地与已核验独立备份；仅文本分批保存GitHub，不上传PNG/gzip/ZIP/Bundle/构建/运行数据库。

---

## 以下为历史报告；冲突归因以上文为准

# R7.3 — IN_PROGRESS（严格视觉未通过）

## 本轮诊断

| 命令/检查 | 结果 | 证据 |
| --- | --- | --- |
| `R6_ATTEMPT=r73-probe node --experimental-strip-types tools/validation/r6/visual.ts` | BLOCKED：字体预检要求Noto Sans CJK SC，当前解析为DejaVu Sans；0截图 | `evidence/r73/settings/font-preflight-failure.json` |
| `R73_ATTEMPT=settings-fallback-1 node --experimental-strip-types tools/validation/r7/settings-visual.ts` 首次启动 | FAIL（脚本相对导入误指向r7/storage-support.ts）；已改为复用r6/storage-support.ts并完整重跑，不改产品代码 | 仅保留最终证据，不将初始脚本接线错误归因为产品缺陷 |
| `R73_ATTEMPT=settings-fallback-1 node --experimental-strip-types tools/validation/r7/settings-visual.ts` 最终运行 | PASS（仅诊断）：30张图、45项几何/CSS比较、8个设置相关状态，3宽，exit 0 | `evidence/r73/settings/attempt-settings-fallback-1.json` |
| 1366×900 原型/生产截图人工对照 | BLOCKED用于视觉判定：中文缺字，且原型演示与生产606夹具语义数据不匹配；不将可见差异归为产品缺陷 | `evidence/r73/settings/prototype-general-1366.png`、`production-general-1366.png` |

严格视觉门禁BLOCKED；R7.3/R7整体及R1保持IN_PROGRESS。只完成了设置诊断，未覆盖总览、卡片集、编辑/筛选、复盘、图谱、分析、媒体、交换和所需异常/弹窗/滚动状态。R7.2有效的8组跨页、45安全、17长期、主壳/图谱几何与回收返回证据继承，但不充当视觉PASS。R7.4未进入。完整差异、严重度及继续条件见R7.3-VISUAL-REVIEW.md和evidence/r73/differences.json。

---

# R7 测试报告

## R7.1

源码 ae6b338827d1e494bc3f6a9c7c745aae12f14239 + tools/validation/r7/shell.ts 工作树；Linux / Node24.22.1 / Electron44.9.1 / Schema606 / b2Fixture v2。npm ci及Electron安装成功，锁文件未改。

| 命令 | 结果 | 证据 |
| --- | --- | --- |
| npm run build | PASS exit0 | 正式Vue/TS/Electron/Vite构建；仅已有bundle体积提示 |
| node --experimental-strip-types --test --test-concurrency=1 tests/unified-workspace-v075.test.ts tests/card-drafts-v075.test.ts | PASS 32/32 exit0 | evidence/shell/checks.json；无skip/cancel |
| R7_ATTEMPT=final node --experimental-strip-types tools/validation/r7/shell.ts | PASS 5组 exit0 | evidence/shell/attempt-final.json；真实main/preload/typed IPC/606，新PID19→90 |

首轮失败为专项编写时的夹具/选择器适配：默认队列无到期卡；fixture留有已提交但未完成会话，选中学习会恢复result；direct模式无单选独立思路；图谱正式返回名为“返回所有卡片”。最终通过UI完成旧会话再新开direct复盘，检查反思及实际返回。未改变产品或削弱精确保存断言。原初失败保留attempt-0.json，其余重复诊断归纳于此；不是已确认产品缺陷。R1历史脚本不反复重拍12图。

严格视觉、Windows/IME/物理剪贴板、便携包、全量性能：NOT_RUN；分别留R7.3–R7.5/R8。R1未标DONE。此处为第一次保存时状态；R7.2最终结果见下。R7整体不能DONE。

## R7.2（当前检查点工作树）

父检查点 `4d0aa3e54b99e46721ef25853bedb94a58f7b023`。正式源码只改 UnifiedWorkspace.vue 的回收后返回刷新、v37/pages/knowledge.css 的图谱父高度；Schema606、FSRS、协议、存储与媒体引擎未改。所有数据为可再生合成夹具。

| 命令 / 范围 | 结果 | 证据 |
| --- | --- | --- |
| npm run build；npm run build:editor-spike | PASS exit0 | evidence/checks.json；后者仅供原17场景 |
| R7_ATTEMPT=final2 node --experimental-strip-types tools/validation/r7/integration.ts | PASS 8组 exit0 | evidence/integration/attempt-final2.json；真实main/preload/typed IPC/606，全程同一隔离数据世界 |
| R7_ATTEMPT=final node --experimental-strip-types tools/validation/r7/recycle-return.ts | PASS 1组 exit0 | evidence/recycle-return/attempt-final.json；真实恢复+返回刷新/查询/选择/发布/历史/FSRS/字节 |
| R7_ATTEMPT=regression node --experimental-strip-types tools/validation/r7/shell.ts | PASS 5组 exit0 | evidence/shell/attempt-regression.json；修改returnSystem后补受影响设置往返与新PID |
| R7_ATTEMPT=final node --experimental-strip-types tools/validation/r7/layout.ts | PASS 4宽 exit0 | evidence/layout/attempt-final.json；1366/900/1500/720精确内容/画布/footer边界 |
| 安全专项：unified-review、unified-card-lifecycle、editor、knowledge-markdown-boundaries、knowledge-exchange、media-library、full-restore-protocol、merge-public | PASS 45/45 exit0 | evidence/checks.json有完整命令/统计/日志hash；后端未改，不机械重复 |
| node --experimental-strip-types tools/workspace-spike/smoke.ts | PASS 17/17 exit0 | evidence/long17/attempt-final.json；保留全部行为场景与精确断言，真实服务辅助spike；正式main/正常退出另见integration |

正式8组包含三种卡片UI创建/Crepe编辑/草稿/发布；发布不可变与知识关联取消；混合集与错题高自评/客观错分离、pause/resume、真实历史/分析；多根九层map/outline、原生Markdown编辑保存与文件/剪贴板交换、keep/取消零写、共享图片与不可变引用；原生移入确认/取消、设置内回收恢复；整库ZIP备份取消/恢复、提交后未知回执冻结和原ID+epoch重放；独立606合并新增完整副本，原有每一行/图片字节不变；正常退出释放租约、不同Electron PID精确读回所有业务表、正文、层级、发布及会话。未知期间观察器旧epoch拒绝是正确保护，测试没有放松协议。

两项原始产品FAIL及最终复验见FAILURE-LEDGER.md和evidence/layout/attempt-0.json、evidence/recycle-return/original-workspace-fail.json；重复环境/定位诊断归纳保存，运行库、锁、profile、缓存均不入Git。源码/脚本具体hash由VERIFICATION.json绑定本保存工作树；报告输出ID均为合成。

R5/R6未受影响的CAS、回滚、跨集媒体、未知回执等有效证据按原范围继承，45项补本轮安全回归。当前协议检查继承R6的21项/157方法通过，未冒充本轮重新执行。最终全量、严格逐页三宽、性能、Windows真机/IME/物理剪贴板/便携ZIP仍NOT_RUN，留R7.3–R7.5/R8。

中断恢复只继续未完成的长期场景与集中保存，没有重跑有效的8组正式闭环、45安全、5组主壳、4宽几何或构建。原17场景最近14项后在第三次启动的目录summary原生click回执超时；诊断与最终处置见FAILURE-LEDGER.md。最终17/17、无renderer错误/外链、未调用workspace.read；完整trace不重复上传，仅保存场景、数量与hash。


## R7.3 恢复续验（本检查点）

Noto Sans CJK SC 已通过两端实际平台字体检查。复用 `matched-v37-real606-v1` 隔离夹具及原型状态，捕获11页面/状态 × 1500/1366/900三宽，共33对、66张；DOM、computed CSS、布局几何和SHA均由 `tools/validation/r7/strict-visual.ts` 记录。`tools/validation/r7/compare-strict.py` 生成机器比较，人工复核1366接触表，重点查看知识图谱、复盘、大纲和回收站。捕获过程PASS，但视觉验收不通过/未闭合：内容数据并非完全等价，必需异常/弹窗/媒体/交换/非空回收状态缺失，且发现未结MAJOR。详情及逐项证据见 `R7.3-VISUAL-REVIEW.md` 与 `evidence/r73/current-matched/`。R7.3、R1 IN_PROGRESS；R7-01/R7-04/R7-06 BLOCKED；未进入R7.4。
