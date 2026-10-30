# GankSoft v0.7.7 — 5个合并测试阶段（最新执行计划）

> 当前执行入口。2026-10-30基于远端 `1942ada28d8a8307cef9f395a12014f39308a827` 的250条唯一账本制定。原17批仍保留历史CASE映射，但不再逐批单独开Work。

## 一、已完成与剩余

72 PASS / 3 FAIL / 3 BLOCKED / **172 NOT_RUN**。前35条P0已经31 PASS、1 FAIL、3 BLOCKED；三条Windows环境阻断为NEW-13、CLIP-03、CLIP-09，归入Windows阶段额外复验，不重复计入172条。

| 合并阶段 | 内容 | 尚未运行 | 内部保存点 |
| --- | --- | ---: | ---: |
| `T2-M1` | 启动、首页、卡片集、新旧卡和列表 | 47 | 4 |
| `T2-M2` | 编辑器、剪贴板与两个窗口 | 29 | 3 |
| `T2-M3` | 学习调度、复盘、知识图谱、Markdown与分析 | 47 | 5 |
| `T2-M4` | 图片、导入导出、设置、备份和故障 | 40 | 3 |
| `T2-M5` | Windows原生操作 | 9 | 1 |
| **合计** | **5个大阶段** | **172** | **16个内部保存点** |

## 二、每个阶段固定的原CASE清单

### T2-M1 — 启动、首页、卡片集、新旧卡和列表（47条）

- 内部保存点 `M1-01`（原 `T2-P1.01`，18条）：`ENV-02, ENV-03, ENV-04, ENV-05, ENV-06, ENV-07, ENV-08, ENV-09, CAT-01, CAT-03, CAT-04, CAT-05, CAT-06, CAT-07, CAT-08, CAT-09, CAT-10, CAT-11`
- 内部保存点 `M1-02`（原 `T2-P1.02`，11条）：`NEW-04, NEW-06, NEW-07, NEW-08, NEW-10, NEW-11, NEW-15, OLD-04, OLD-05, OLD-12, OLD-13`
- 内部保存点 `M1-03`（原 `T2-P1.03`，10条）：`LIST-02, LIST-03, LIST-04, LIST-05, LIST-06, LIST-07, LIST-08, LIST-09, LIST-10, LIST-11`
- 内部保存点 `M1-04`（原 `T2-P2.01`，8条）：`HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, HOME-06, HOME-07, HOME-08`

### T2-M2 — 编辑器、剪贴板与两个窗口（29条）

- 内部保存点 `M2-01`（原 `T2-P1.04`，19条）：`EDITOR-01, EDITOR-02, EDITOR-03, EDITOR-04, EDITOR-05, EDITOR-06, EDITOR-07, EDITOR-08, EDITOR-09, EDITOR-10, EDITOR-11, EDITOR-12, EDITOR-13, EDITOR-14, EDITOR-15, EDITOR-16, EDITOR-17, EDITOR-18, EDITOR-19`
- 内部保存点 `M2-02`（原 `T2-P1.05`，8条）：`CLIP-05, CLIP-06, CLIP-07, CLIP-08, CLIP-10, CLIP-11, CLIP-12, CLIP-13`
- 内部保存点 `M2-03`（原 `T2-P2.02`，2条）：`EDITOR-20, EDITOR-21`

### T2-M3 — 学习调度、复盘、知识图谱、Markdown与分析（47条）

- 内部保存点 `M3-01`（原 `T2-P1.06`，12条）：`PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06, PLAN-07, PLAN-08, PLAN-09, PLAN-10, PLAN-11, PLAN-12`
- 内部保存点 `M3-02`（原 `T2-P1.07`，9条）：`REVIEW-06, REVIEW-07, REVIEW-08, REVIEW-09, REVIEW-12, REVIEW-13, REVIEW-14, REVIEW-15, REVIEW-16`
- 内部保存点 `M3-03`（原 `T2-P1.08`，12条）：`KNOW-01, KNOW-03, KNOW-04, KNOW-05, KNOW-06, KNOW-07, KNOW-08, KNOW-09, KNOW-10, KNOW-13, KNOW-14, KNOW-15`
- 内部保存点 `M3-04`（原 `T2-P1.09`，9条）：`MD-02, MD-03, MD-04, MD-05, MD-06, MD-08, MD-09, MD-10, MD-11`
- 内部保存点 `M3-05`（原 `T2-P2.01`，5条）：`AN-02, AN-03, AN-04, AN-05, AN-08`

### T2-M4 — 图片、导入导出、设置、备份和故障（40条）

- 内部保存点 `M4-01`（原 `T2-P1.10`，16条）：`MEDIA-02, MEDIA-04, MEDIA-05, MEDIA-06, MEDIA-07, MEDIA-08, EX-01, EX-04, EX-06, EX-07, EX-08, EX-09, EX-10, EX-11, EX-12, EX-13`
- 内部保存点 `M4-02`（原 `T2-P1.11`，17条）：`BACK-02, BACK-08, BACK-09, BACK-12, BACK-14, TRASH-01, TRASH-05, TRASH-06, TRASH-07, FAULT-01, FAULT-06, FAULT-07, FAULT-09, FAULT-10, FAULT-11, FAULT-12, FAULT-13`
- 内部保存点 `M4-03`（原 `T2-P2.02`，7条）：`SET-05, SET-06, SET-07, SET-08, SET-09, SET-10, SET-11`

### T2-M5 — Windows原生操作（9条）

- 内部保存点 `M5-01`（原 `T2-W.01`，9条）：`WIN-01, WIN-02, WIN-03, WIN-04, WIN-05, WIN-06, WIN-07, WIN-08, WIN-09`

## 三、怎么执行、怎么节约Token

每个**大阶段**作为一次Work的目标；同一Work内按保存点循环，代码脚本执行真正Electron/Playwright GUI，模型仅处理脚本缺口和失败摘要。保存点是**自动执行/归档边界，不是新的Work阶段**。额度不足可中止并保存，下一次从当前大阶段剩余用例续跑，不重建/重读全量历史。

```bash
node tools/validation/v077/environment.mjs status
node tools/validation/v077/phase.mjs audit
node tools/validation/v077/phase.mjs list T2-M1
node tools/validation/v077/phase.mjs run T2-M1
```

`phase.mjs run T2-M1`仅选择**第一个尚未执行的内部保存点**（最多19条），缺失GUI处理器时报告缺失列表，不能将NOT_RUN当成PASS；实现并注册脚本后先提交GitHub，按准确SHA执行。每次运行后审阅`collect.mjs --dry-run`、再`--write`，用`promote.mjs`更新真实CASE结果并保存GitHub，然后重复相同命令处理下一个保存点。

Windows阶段`T2-M5`须使用真实Windows环境，其9条WIN案例执行完后用`phase.mjs run T2-M5 --retry-blocked`补验历史3条P0 BLOCKED；不能用Linux和普通Windows CI冒充Win10/11用户原始输入。

保持生产源码冻结，保留现有3 FAIL（NEW-16、MEDIA-03、FAULT-05）与用户待复现项。T2收集完进入I3（High）统一归类，再F4（High）集中修复，最后R5验收。所有原始250条CASE、旧脚本、环境缓存、精简证据、历史17批归属均保留不删；本计划**不改变任何真实用例结果**。

每个阶段增量更新 `docs/v077/T2-M1-REPORT.md` 等阶段报告、`E2E-RESULTS.json`、`DEFECT-INBOX.json` 及`RECOVERY-NEXT.md`，提交原分支`feature/v077`，独立核验远端SHA。严禁强推/合并/发布/等待CI。
