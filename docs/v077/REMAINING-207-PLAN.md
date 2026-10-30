# GankSoft v0.7.7 — 剩余 207 条测试的完整分阶段执行计划

> **2026-10-30 固定排期：不是测试结果。** 基于 `feature/v077` 源码账本 e40c896a1876c9f6c4115c6267e96b16e2564e0a 的 `electronUi=NOT_RUN` 快照自动生成。用户已要求先测试并集中收集问题、I3 统一归类、F4 集中修复。**这份文件安排全部 207 条，不删除、不遗漏、不双计。**

## 1. 冻结统计与阶段分配

- 250 条总用例：41 `electronUi=PASS`、2 `FAIL`、0 `BLOCKED`、**207 `NOT_RUN`**。
- 剩余 207：P0 **35**；P1 **150**（其中 Windows 9 独立安排在 T2-W）；P2 **22**。
- 明确计数：**35 + 141 + 22 + 9 = 207**。17 个小批次；平均约 12 条/批，最小 8、最大 19。每条 CASE 恰好分配到一个**主要执行批次**。
- 本文件是计划/静态快照；执行时由 `docs/v077/E2E-RESULTS.json` 作为唯一实时状态来源。修复后已真实 PASS 的项不得从本批再次无意义重测，未执行与 Linux 环境不具备的 Windows 项不得伪造 PASS。

| 批次 | 业务内容 | 对应原功能组 | 计划 CASE 数 |
| --- | --- | --- | ---: |
| `T2-P0.1` | 核心卡片和旧卡草稿 | NEW/OLD | 12 |
| `T2-P0.2` | 剪贴板与三种卡复盘 | CLIP/REVIEW | 11 |
| `T2-P0.3` | 备份、回收站及故障安全 | BACK/TRASH/FAULT | 12 |
| `T2-P1.01` | 启动、环境和卡片集 | ENV/CAT | 18 |
| `T2-P1.02` | 新卡与旧卡常规路径 | NEW/OLD | 11 |
| `T2-P1.03` | 卡片列表与检索 | LIST | 10 |
| `T2-P1.04` | 编辑器常规操作 | EDITOR | 19 |
| `T2-P1.05` | 剪贴板与内容交换 | CLIP | 8 |
| `T2-P1.06` | 筛选学习与调度 | PLAN | 12 |
| `T2-P1.07` | 复盘常规路径 | REVIEW | 9 |
| `T2-P1.08` | 知识节点与图谱 | KNOW | 12 |
| `T2-P1.09` | Markdown 功能 | MD | 9 |
| `T2-P1.10` | 图片与内容包导入导出 | MEDIA/EX | 16 |
| `T2-P1.11` | 备份、回收站与故障恢复 | BACK/TRASH/FAULT | 17 |
| `T2-P2.01` | 首页次要功能与学习分析 | HOME/AN | 13 |
| `T2-P2.02` | 编辑器弹窗和系统设置 | EDITOR/SET | 9 |
| `T2-W.01` | Windows 实机/原生交互专项 | WIN | 9 |
| **合计** | **17 个批次，覆盖全部207条** | — | **207** |

## 2. 执行顺序和阶段关口

1. **T2-P0：3批共35条**，先检查核心保存、发布、复盘、剪贴板以及备份/恢复数据安全。来源可能要求 Windows 物理输入的 CASE 可先生成 Linux 自动化旁证，但不能把 Linux 合成剪贴板当 Windows 真实 PASS；在 T2-W 同批补验未实测环境。
2. **T2-P1：11批共141条**，按业务模块分批推进，不需要重新梳理功能清单。测试脚本/夹具允许小修，生产源码冻结，只收集缺陷。
3. **T2-P2：2批共22条**，首页、学习分析、设置、编辑器窗口体验。用户实报两个窄窗口 `EDITOR-20/21` 必须明确给出尺寸/长文本可达性观察。
4. **T2-W：1批共9条**，WIN-01～WIN-09，每项独立区分 Windows Runner、Win10 Real、Win11 Real 和必要用户物理操作。优先在具备环境时并行开展，不必等 P2 才尝试。**T2-P0.2 中涉及真实 Windows 的 CLIP 用例也是本阶段平台补验的交叉索引，不重新计入这9条。**
5. **I3（GPT-6.1 Sol / High）**：在上述可执行批次完成、真实 Windows 剩余阻断被明确登记后，将全部 FAIL 与 USER_REPORTED 归类去重、按根因和风险排序；不能将测试基础设施失败当成产品缺陷。
6. **F4（GPT-6.1 Sol / High）**：集中修改生产源码，按修复影响范围回归原失败 CASE、相邻核心链和持久化/Windows 数据安全，不必无差别重新跑250条。
7. **R5**：实际 Windows 便携 ZIP 和最终发布准入。无法获得 Windows 真机时应保留受限状态，不能把 `I3/F4` 对已证实缺陷的处理无限延期；但同样不能宣布完全通过 Windows 验收。

## 3. 每个小批次的准确 CASE ID（完整207条）

### T2-P0.1 — 核心卡片和旧卡草稿（12 条）

**模块：** cards。**优先级：** P0。**原始功能组：** NEW、OLD。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`NEW-05, NEW-09, NEW-13, NEW-19, OLD-02, OLD-06, OLD-07, OLD-08, OLD-09, OLD-10, OLD-11, OLD-14`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


### T2-P0.2 — 剪贴板与三种卡复盘（11 条）

**模块：** editor,learning。**优先级：** P0。**原始功能组：** CLIP、REVIEW。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`CLIP-03, CLIP-09, CLIP-14, CLIP-15, CLIP-16, REVIEW-02, REVIEW-03, REVIEW-04, REVIEW-10, REVIEW-11, REVIEW-17`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


### T2-P0.3 — 备份、回收站及故障安全（12 条）

**模块：** storage,reliability。**优先级：** P0。**原始功能组：** BACK、TRASH、FAULT。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`BACK-05, BACK-06, BACK-07, BACK-10, BACK-11, BACK-13, TRASH-03, TRASH-08, TRASH-09, FAULT-04, FAULT-05, FAULT-14`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


### T2-P1.01 — 启动、环境和卡片集（18 条）

**模块：** app,catalog。**优先级：** P1。**原始功能组：** ENV、CAT。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`ENV-02, ENV-03, ENV-04, ENV-05, ENV-06, ENV-07, ENV-08, ENV-09, CAT-01, CAT-03, CAT-04, CAT-05, CAT-06, CAT-07, CAT-08, CAT-09, CAT-10, CAT-11`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


### T2-P1.02 — 新卡与旧卡常规路径（11 条）

**模块：** cards。**优先级：** P1。**原始功能组：** NEW、OLD。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`NEW-04, NEW-06, NEW-07, NEW-08, NEW-10, NEW-11, NEW-15, OLD-04, OLD-05, OLD-12, OLD-13`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


### T2-P1.03 — 卡片列表与检索（10 条）

**模块：** cards。**优先级：** P1。**原始功能组：** LIST。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`LIST-02, LIST-03, LIST-04, LIST-05, LIST-06, LIST-07, LIST-08, LIST-09, LIST-10, LIST-11`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


### T2-P1.04 — 编辑器常规操作（19 条）

**模块：** editor。**优先级：** P1。**原始功能组：** EDITOR。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`EDITOR-01, EDITOR-02, EDITOR-03, EDITOR-04, EDITOR-05, EDITOR-06, EDITOR-07, EDITOR-08, EDITOR-09, EDITOR-10, EDITOR-11, EDITOR-12, EDITOR-13, EDITOR-14, EDITOR-15, EDITOR-16, EDITOR-17, EDITOR-18, EDITOR-19`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


### T2-P1.05 — 剪贴板与内容交换（8 条）

**模块：** editor。**优先级：** P1。**原始功能组：** CLIP。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`CLIP-05, CLIP-06, CLIP-07, CLIP-08, CLIP-10, CLIP-11, CLIP-12, CLIP-13`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


### T2-P1.06 — 筛选学习与调度（12 条）

**模块：** learning。**优先级：** P1。**原始功能组：** PLAN。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06, PLAN-07, PLAN-08, PLAN-09, PLAN-10, PLAN-11, PLAN-12`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


### T2-P1.07 — 复盘常规路径（9 条）

**模块：** learning。**优先级：** P1。**原始功能组：** REVIEW。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`REVIEW-06, REVIEW-07, REVIEW-08, REVIEW-09, REVIEW-12, REVIEW-13, REVIEW-14, REVIEW-15, REVIEW-16`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


### T2-P1.08 — 知识节点与图谱（12 条）

**模块：** knowledge。**优先级：** P1。**原始功能组：** KNOW。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`KNOW-01, KNOW-03, KNOW-04, KNOW-05, KNOW-06, KNOW-07, KNOW-08, KNOW-09, KNOW-10, KNOW-13, KNOW-14, KNOW-15`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


### T2-P1.09 — Markdown 功能（9 条）

**模块：** knowledge。**优先级：** P1。**原始功能组：** MD。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`MD-02, MD-03, MD-04, MD-05, MD-06, MD-08, MD-09, MD-10, MD-11`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


### T2-P1.10 — 图片与内容包导入导出（16 条）

**模块：** media,exchange。**优先级：** P1。**原始功能组：** MEDIA、EX。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`MEDIA-02, MEDIA-04, MEDIA-05, MEDIA-06, MEDIA-07, MEDIA-08, EX-01, EX-04, EX-06, EX-07, EX-08, EX-09, EX-10, EX-11, EX-12, EX-13`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


### T2-P1.11 — 备份、回收站与故障恢复（17 条）

**模块：** storage,reliability。**优先级：** P1。**原始功能组：** BACK、TRASH、FAULT。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`BACK-02, BACK-08, BACK-09, BACK-12, BACK-14, TRASH-01, TRASH-05, TRASH-06, TRASH-07, FAULT-01, FAULT-06, FAULT-07, FAULT-09, FAULT-10, FAULT-11, FAULT-12, FAULT-13`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


### T2-P2.01 — 首页次要功能与学习分析（13 条）

**模块：** app,analytics。**优先级：** P2。**原始功能组：** HOME、AN。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, HOME-06, HOME-07, HOME-08, AN-02, AN-03, AN-04, AN-05, AN-08`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


### T2-P2.02 — 编辑器弹窗和系统设置（9 条）

**模块：** editor,settings。**优先级：** P2。**原始功能组：** EDITOR、SET。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`EDITOR-20, EDITOR-21, SET-05, SET-06, SET-07, SET-08, SET-09, SET-10, SET-11`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


### T2-W.01 — Windows 实机/原生交互专项（9 条）

**模块：** reliability。**优先级：** P1。**原始功能组：** WIN。

**本批必须逐项安排的 CASE ID（冻结在 e40c896a1876c9f6c4115c6267e96b16e2564e0a 时均为 NOT_RUN）：**

`WIN-01, WIN-02, WIN-03, WIN-04, WIN-05, WIN-06, WIN-07, WIN-08, WIN-09`

正常功能、错误/取消和重启读回的验收要求一律以 `docs/v077/E2E-FULL-OPERATION-CHAINS.md` 对应 CASE 的 `operation` 和 `assertion` 为准；脚本按功能模块写入现有 `scenarios/`，不要新建重复框架。只有真实 UI 和必要持久化验证成功才能 PASS。


## 4. 每轮 Work 的统一节约 Token 指令（仅替换批次ID）

**推荐模型：GPT-6.1 Sol / Medium**。每个 Work 只负责**一个固定批次**，若有足够额度且仅修改测试脚本可继续下一小批，但必须分别归档结果，原则上避免一次上下文塞入207条。第一批固定为 `T2-P0.1`。

```text
继续 Aides8Stack/GankSoft 的 feature/v077，最新HEAD以远端为准。
阅读 AGENTS.md、STANDARDS.md、RECOVERY-NEXT.md、
docs/v077/REMAINING-207-PLAN.md 中当前批次小节、
仅涉及该批次的模块文件，不重新读取全部历史或250条用例。

当前批次：<例如 T2-P0.1>。只实现并运行该批次列出的CASE ID。
environment.mjs status → 优先复用有效依赖/410构建文件/匹配的CI构建Artifact，
必要时才 prepare。已有41条PASS不重复重跑；
已有NEW-16与MEDIA-03两条FAIL保留并关联。
先将自动化脚本正常提交GitHub，再针对确定SHA在隔离Schema606运行。
Electron/Playwright完成真实GUI、正确的五态反馈、
只读SQLite/IPC和必要的新进程重启验证；不可API-only。
运行日志自动收集，只向模型反馈FAIL/BLOCKED摘要。
按collect.mjs dry-run审阅后write；promote.mjs按真实SHA晋升结果。
同步E2E-RESULTS.json和DEFECT-INBOX.json，
生成docs/v077/<批次ID>-REPORT.md，并更新RECOVERY-NEXT.md；
独立核验远端完整SHA、文件树、记录。
本轮只允许修复测试基础设施，不改生产业务源码。
所有未执行CASE保持NOT_RUN；受环境阻断也必须记录具体原因。
不等CI、不自动合并/发布；本批保存后结束。
```

## 5. 具体如何减少模型消耗与防止阶段失控

- 执行：通过现有 `tools/validation/v077/run.mjs` 批量运行本批已注册场景；尚未注册的先补场景和注册表。**不能用 `--mapped-only` 的绿灯冒充整批完成。**
- 新测试按模块写进 `tools/validation/v077/scenarios/`，不为每CASE新建文件；复用 `helpers.mjs`、现有 T1-A/B/C 脚本和 Schema606 最小合成数据。
- 汇报仅给每个批次：总数、PASS/FAIL/BLOCKED/NOT_RUN、真实SHA、失败 CASE ID、证据位置、环境复用状态。PASS 不传大量日志与截图到模型上下文。
- 按普通增量 GitHub 保存脚本和报告；新 Work 先用 `environment.mjs status` 检查可用构建指纹，再决定是否安装/编译。没有跨Work已完成的 Artifact 时不宣称永远无需编译。
- 每一批的完成门槛是**所有CASE都有明确的真实执行结果或环境限制说明**，不是要求所有CASE都PASS；FAIL 留待 I3/F4 处理。遇疑似数据损坏，停止危险分支，保护隔离测试数据证据。
- 每完成一个宏阶段应审计剩余 `electronUi=NOT_RUN` 数量，核对每条未测都能追溯到剩余批次或真实平台阻断；不得通过删除用例或降低断言来制造进度。
- T2-W 包含的 Windows 物理剪贴板/IME/原生窗口及实际 Win10/11 使用由具备这些资源的环境完成；Windows CI 合成结果不代签真人实机状态。

## 6. 中间交接与最后确认

本文件总表/每批固定 CASE ID 不随执行改变；单批实际结果进入 `E2E-RESULTS.json` 和各批报告。单批出现 `FAIL` 不自动改业务源码，I3 统一收集后修复。到T2末期尚无法执行的 Windows 物理用例保留 NOT_RUN 或有明确阻断证据的 BLOCKED，继续为R5保留专项清单。

**当前已完成的 T1-A/T1-B/T1-C 结果不受本计划影响。此文件的写入本身不产生任何新 CASE PASS。**
