# 2026-10-28 R7.4 第二轮最新结果

本轮M02数据不变性/漏测修复、M04类型确认、M05危险确认三个授权单元均DONE；正式Electron14组、受影响领域55项及最终生产构建PASS。M02原MAJOR视觉残差仍IN_PROGRESS，M01/M03仍IN_PROGRESS，R7.4整体IN_PROGRESS；R7.3/R1/R7仍IN_PROGRESS，严格视觉/B01/B02仍BLOCKED。未进入M06–M08/R7.5/R8。

权威结果和恢复：`docs/v076/rebuild-v37-source-first/stages/R7/R7.4-ROUND2.md`及`evidence/r74/round2/`。基线8fe0ccaa3588b9b79cd3d07b7e42784a24ea052e，原分支/Draft PR15→develop；一次集中保存并独立核验后主动结束。下一Work按新授权从M06交换布局/菜单遮挡开始；本段替代下方旧“先M02阻塞/M04–M06未开始”恢复指令，历史原文保留。不合并/发布/等待CI。

# 2026-10-28 R7.4 第一轮结束 — BLOCKED / C有效WIP

原分支/Draft PR15→develop；A已独立保存e86e677389c96546b842993f8e3b98cf6ab025b5，B已独立保存3c2d6c486315d74bcf5d22f1ebce273a01dbf6ae，完整tree均核对一致；本次C提交自身SHA从Git历史解析。三个单元均已做可执行生产修改；M01/M03残余视觉IN_PROGRESS，M02 BLOCKED，不能报告三个MAJOR全部关闭。

A恢复图谱已有目录/子导航，正式Electron3组和知识11项PASS。B压缩选项/正文留白、收起揭示后思路、定位错误及答案/评分，正式Electron3组和复盘14项PASS。C修复Crepe首屏/空图片区/工具顺序/大纲密度和目录折叠状态，编辑/草稿/Markdown56项及正式卡片编辑1组PASS；大纲三宽/目录折叠断言已通过，但整个大纲组因无编辑正文规范化写回FAIL。未改动B源码的同路径也复现“-→*、追加换行、revision2→3”，baseline源码指纹5/5相同；不是本轮可关闭的UI差异。C图片/导出/长中文后续Electron组NOT_RUN。最终WIP构建与被测源码指纹记录见本轮TEST_REPORT及stages/R7/R7.4-ROUND1.md、evidence/r74/。

R7.3/R1/R7保持IN_PROGRESS、严格视觉BLOCKED，B01/B02未关闭。没有重审R0–R6或重跑R7.1/R7.2，没有上传新PNG/ZIP/数据库，没有改606/FSRS/历史/不可变发布合同，不等CI、不强推/新分支/新PR/合并/发布。

本轮到C保存核验后立即结束。下一轮先从R7.4-ROUND1.md的M02阻塞与readonly两份证据、tools/validation/r7/r74-round1.ts最小诊断入口恢复；不得跳过数据不变性失败。随后M04–M06入口为R7.4-HANDOFF.md对应三行：CardDraftForm.vue类型确认→UnifiedCardBatch.vue移入确认→KnowledgeMarkdownExchange.vue/KnowledgeExchangeMap.vue交换布局，均未开始。本记录优先于下方历史“R7.4 NOT_STARTED/禁入”恢复文字。

# 2026-10-28 R7.4-A 检查点

当前授权M01→M03→M02三个单元后结束；不再受旧R7.3“禁止进入R7.4”恢复范围约束。A正式外壳隐藏差异关闭，三宽及正式Electron3组/知识领域专项/构建PASS；合成根与连线视觉差异仍在，M01 IN_PROGRESS。B/C待继续。本轮记录：stages/R7/R7.4-ROUND1.md与evidence/r74/A.json。R7.3/R1/R7仍IN_PROGRESS，严格视觉BLOCKED，B01/B02不豁免；不等CI。

## 2026-10-28 精简保存及证据去重（当前规则）

已停止PNG/ZIP二进制Blob上传、49152/98304分块导出及新增采集；进程检查未发现运行中的补采/导出任务。原待提交159文件共16,433,120字节：111 PNG（14,312,334）、24 gzip快照（1,472,110）、24文本（648,676）。运行目录587文件/117,324,295字节含失败重试/接触表/合成缓存，不是提交范围。

111图按旧manifest哈希及状态来源分类：73缺失状态补证、28受夹具/状态修正影响的重采、10与旧manifest哈希相同的重复原型参考图。111内部重复哈希为0；10重复参考图不计新增独立证据。5图仅作诊断（与上述分类交叉），其中原生恢复背景不能当原生确认框验收。旧66原图不可读取，未作跨批逐像素人工复核；只核对manifest哈希及状态来源。原33对/66图和45检查继续继承，未重跑R7.1/R7.2。

全部原159文件和逐文件SHA-256索引已保存为独立检查点备份GankSoft-R73-20261028-checkpoint.tar（16,803,840字节，SHA-256 0670b09ed2a7e22b940ec66bd3f9a7bb42fba342f6f8e2dde93e6fd3feaa57fd）；独立取回备份并验证159文件哈希PASS。恢复标识及分类见supplemental-20261028/export-audit.json。全部本地成果保留，未删除旧图/运行记录；不创建新ZIP或Git Bundle。

源码仓库仅保存必要测试脚本、差异JSON、验收/进度/恢复文档；本次PNG、gzip快照、ZIP、数据库、运行缓存上传数均为0。原始PNG/DOM/CSS仅在本地与已核验独立备份，manifest中的文件名是备份索引，不表示GitHub存在这些文件。历史打包脚本summarize-supplement.py仅保留本地/备份，不纳入本次提交。没有新增业务源码变更；不访问真实用户数据库。提交前核对远端文件树/已有blob，仅保存有差异的文本；小批量UTF-8文件提交，禁止二进制Blob/分块循环。

R7.3/R1/R7仍IN_PROGRESS，严格视觉BLOCKED；2 BLOCKER、8 MAJOR、3未批准MINOR保留。R7-01/04/06 BLOCKED；R7.4/R7.5/R8 NOT_STARTED。原PR #15 Draft→develop，远端保存独立核验后停止，不等待CI、不合并/发布。

---

# R7 — 全应用集成、跨页回归与严格视觉验收：验收矩阵

**阶段：IN_PROGRESS；R7.1/R7.2 DONE。** 只对实际完成的功能/安全门禁记PASS；严格视觉、最终全量/性能与差异终局未验收。

## 验收清单

| 编号 | 验收标准 | 状态 | 可追溯证据 |
| --- | --- | --- | --- |
| R7-01 R1 遗留关闭 | 文字侧栏、顶栏、目录和设置入口/导航保护真实 E2E、三宽对照通过，不保留未结高优先差异。 | BLOCKED | 功能子集已PASS：evidence/shell/attempt-regression.json；R7.3续验已证明900px滚动入口可达，旧不可达归因撤回；知识视图主壳仍有MAJOR；R1尚未关闭，见R7.3-VISUAL-REVIEW.md |
| R7-02 主流程闭环 | 编辑/复盘/统计/知识树/Markdown交换/图片/设置/备份跨页真实 UI→IPC→606→新进程读回。 | PASS | evidence/integration/attempt-final2.json：正式同库8组与正常退出/不同PID精确读回；TEST_REPORT.md |
| R7-03 安全回归 | CAS、幂等、未知回执、取消零写、回滚、图片引用和 FSRS/已发布/历史不退化。 | PASS | evidence/checks.json 安全45/45；integration 原ID+epoch未知/取消零写/字节保护；R5/R6未受影响CAS/回滚按原范围继承 |
| R7-04 原型视觉 | 主页面典型和异常状态三宽精确对应，截图/DOM/CSS/布局量测/差异结论完整。 | BLOCKED | 继承33对/66图；新增49对/111图，补异常/媒体/交换/长中文/非空回收/根选择。B01全局同态资格、B02原生确认及M08永久删除缺项仍未结，严格视觉仍BLOCKED，见R7.3-VISUAL-REVIEW.md |
| R7-05 全量与性能 | 受影响回归+长期17场景、按计划全量测试、性能及资源上限实际记录；阻断项有责任与复验。 | NOT_RUN | 受影响专项与长期17/17 PASS；最终全量/性能留R7.4–R7.5，整项NOT_RUN |
| R7-06 差异终局 | BLOCKER/MAJOR 清零；MINOR 经用户明确批准；Windows 实机及便携 ZIP 保留 R8，不虚报。 | BLOCKED | R7.3续验登记2 BLOCKER、8 MAJOR、3未批准MINOR；未擅自标PASS，Windows/ZIP留R8 |

## 验收口径

- 功能仅有入口、静态截图、mock IPC、单独 SQLite 数据或 CI 绿色均不能代表真实 E2E 通过。
- 有真实 UI 的场景必须通过正式 Electron + typed IPC + Schema606/FSRS/媒体服务，并在需要时正常退出、新进程重开；错误、取消和回滚场景不得产生悬空引用或损坏用户数据。
- 视觉场景采用冻结 v3.7 同数据/同状态/同尺寸/同字体/同缩放，保留 1500/1366/900 宽的原型与生产截图/DOM/computed CSS 与差异结论；无视觉变化部分可清楚继承有效证据。
- Windows 10/11 人工真机、系统中文 IME、物理剪贴板和最终便携 ZIP 由 R8 验收；在此前独立标 NOT_RUN，绝不以 Linux 替代。
- 阶段状态只能 NOT_STARTED、IN_PROGRESS、BLOCKED、DONE；验收项只能 PASS、FAIL、BLOCKED、NOT_RUN。任何阻断事项不得通过更改标签跳过。
- 只有所有本阶段必需 Gate 有真实证据通过（或明确阶段不适用且说明理由），并在原 PR #15 安全保存核验后才可将状态改成 DONE。

## 严格范围与退出

- 不为了截图给正式 UI 写入伪造统计或替换真实 IPC/SQLite。
- 不以静态 HTML、Linux 截图、CI 绿色或按键 DOM 响应冒充全应用验收。
- 不重做已无影响且有有效证据的阶段；受公共壳/协议影响的相关门禁必须重新验证。
- R8 才进行真实 Win10/11 同一便携包验收；未运行保持 NOT_RUN。

**完成后交接**：通过 R7 后生成 R8 Windows 候选前校验矩阵；R8 必须使用已验证的同源提交，不能用 R7 Linux 证据替代 Windows 签核。
