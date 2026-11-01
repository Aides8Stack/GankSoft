# 当前优先策略（2026-10-30）：先全模块测试并收集问题，后集中修复

参见 [模块测试重组和 D0→T1→T2→I3→F4→R5](./MODULE-TEST-ARCHITECTURE.md)、[12份逐模块路径](./modules/INDEX.md)、[可复用环境和合成最小数据](./ENVIRONMENT-REUSE.md)、[缺陷收集总账](./DEFECT-INBOX.json)。

- D0：设计与代码组织，完成后先验证工具，**不修改业务或冒充新测试PASS**。
- T1/T2：按模块运行真实Electron GUI、持久化、重启和失败反馈；**仅收集FAIL/BLOCKED与复现证据，不边测边修生产代码**。P0危险路径失败即停止该路径，不影响继续测试其它安全模块。
- I3：统一比对同根因、分清真实产品缺陷/脚本失败/平台差异，确定修复批次。
- F4：按同根因集中修源码，必须原失败路径和相邻模块回归；高风险用 High，复杂竞态按需 Extra High。
- R5：Windows Runner、同包Win10/11实机与便携交付审核；不绕过门禁，不自动发布。
- 原文 M0/H1/M2/H3/X4/M5/H6 及相关历史报告**仅供继承证据和操作命令参考，不再规定本轮测试顺序**。

```bash
node tools/validation/v077/environment.mjs status
node tools/validation/v077/environment.mjs prepare
node tools/validation/v077/module-plan.mjs audit
node tools/validation/v077/module-plan.mjs list
node tools/validation/v077/run.mjs list --module cards --baseline
node tools/validation/v077/run.mjs run --module cards --baseline
# T1/T2运行后审阅失败，再统一收集：
node tools/validation/v077/collect.mjs --summary validation-results/v077/runs/<RUN_ID>/summary.json --dry-run
```

---

# GankSoft v0.7.7 — 自动化优先、分模型分阶段执行手册

> 版本：v0.7.7 稳定性专项。**本文件是执行指令，不是 PASS 测试报告。** 当前 250 条合同已建立，自动化第一批 6 条已经编码（NEW-01/02/03、OLD-03、CLIP-01/04），**还没有在实际 Electron 进程中运行验收**；其余 244 条保持 NOT_RUN。

**当前最小可用验收优先入口（2026-10-30 补充）**：先看 [`MODULE-BASELINE-SMOKE-AND-FEEDBACK.md`](./MODULE-BASELINE-SMOKE-AND-FEEDBACK.md) 的 20 组最短 UI 操作链、用户成功/失败反馈及 G0→G2 闸门；250 项原用例与唯一逐 CASE 账本继续保留。本链接只更新执行优先级，不表示新增用例已实跑或通过。

## 唯一目录结构和资料职责

| 路径 | 唯一职责 |
| --- | --- |
| `tools/validation/v077/run.mjs` | 统一 CLI：查询覆盖、选择用例、逐条运行、汇总结果 |
| `tools/validation/v077/registry.mjs` | 唯一**已实现**用例注册表；没有具体场景不得加入 |
| `tools/validation/v077/helpers.mjs` | 既有隔离 Schema606 夹具、正式 Electron 启动、草稿箱 UI、重启后读回 |
| `tools/validation/v077/scenarios/*.mjs` | **按功能模块**归档模拟人工场景，禁止一个用例一个文件 |
| `tools/validation/v077/promote.mjs` | 按精确源 SHA 审核测试结果，显式更新 Electron UI 状态；**不会写人工 Windows 或 CI 状态** |
| `tests/v077-e2e-runner.test.ts` | npm test 纳入的执行器/用例映射校验 |
| `docs/v077/E2E-FULL-OPERATION-CHAINS.md` | 唯一完整的 250 项用户操作链规范（不重复抄写） |
| `docs/v077/E2E-RESULTS.json` | 唯一逐项、逐平台验收状态账本 |
| `docs/v077/ISSUES-AND-ACCEPTANCE.md` | Issue #16–#20 和其后新增真实缺陷的索引 |
| `docs/v077/WORK-E2E-EXECUTION.md` | **本文件**：分模型阶段交接/入口 |
| `validation-results/v077/runs/` | 可丢弃临时 JSON/日志/截图（已被 .gitignore 排除） |

**禁止**把 v0.7.7 新脚本放到旧 R4–R7 测试目录、项目根目录、docs 临时子目录或新增平行 Actions 工作流。实际新增业务测试只扩展 `scenarios/` 并在注册表写唯一 ID。新业务模块可以按模块新增一个场景文件。

仓库：`Aides8Stack/GankSoft`。**唯一目标分支：`feature/v077`；目标 PR base：`develop`。**每轮以 GitHub 远端真实 HEAD 为准；不要从旧 `feature/v077-editor-paste` 恢复。必须先遵守 `AGENTS.md` 和 `docs/development/STANDARDS.md`，复用现有任务记录，不重复 `task:init`，不访问用户真实库，不强推、不绕过审批。

## 1. 采用自动脚本而非每条调用大模型

- 已实现操作链由 Node/Playwright/Electron 一次启动、连续点击/输入/返回/重启来验证；**执行一条无需调用一次模型**。
- 只有出现 FAIL、未映射的交互、测试夹具失效或业务逻辑不清时，才启动对应推理强度的 Work。
- 工具本身不会自动切换 GPT 模型，也不会在后台调用 Medium/High/Extra High。**每个 Work 阶段由用户在模型菜单选定强度后独立启动**；下阶段只读 GitHub 检查点，避免重复消耗额度。
- 普通无分支变更的脚本批量运行可用 Medium；涉及保存/历史/事务、源代码修复使用 High；两轮 High 仍失败的并发/数据一致性疑难问题才升级 Extra High。
- 250 条测试不是一口气交给一个 Work。按 P0→P1→P2 实现自动化、运行并修复，分小批次提交，持久化精确 case ID 和 SHA。

## 2. 所有阶段通用命令

```bash
# 新环境仅首次需要 npm ci；不要每轮重复构建
npm ci
npm run build

# 快速静态验证：无需真实 Electron 测试数据
node --experimental-strip-types --test tests/v077-e2e-runner.test.ts
npm run test:e2e:v077:list
node tools/validation/v077/run.mjs list --group NEW

# 当前已注册的6条独立 Electron 操作链（FAIL 应如实保留）
npm run test:e2e:v077

# 单组选例（未实现的用例继续 NOT_RUN；退出码 2 不等于成功）
node tools/validation/v077/run.mjs run --group NEW

# 仅运行本组已实现用例，供开发阶段使用；不能冒称已覆盖全组
node tools/validation/v077/run.mjs run --group NEW --mapped-only

# Work 确认报告确属当前 SHA，且复核真实证据后，才晋升账本
node tools/validation/v077/promote.mjs validation-results/v077/runs/<run-id>/summary.json --dry-run
node tools/validation/v077/promote.mjs validation-results/v077/runs/<run-id>/summary.json
```

生成日志/截图只留在 gitignored 的 `validation-results/`；GitHub 永久保存**精简**失败信息、CASE ID、对应 SHA、相邻回归结果。需要保存原始失败证据时通过既有 CI Artifacts，不向仓库批量上传 PNG。

## 3. 分阶段模型路由（独立 Work 调用）

### M0 — Medium｜检查测试框架和已有覆盖（首轮）

**执行指令**：从 `feature/v077` 最新 HEAD 恢复，检查 `tools/validation/v077/`、`tests/v077-e2e-runner.test.ts` 和 250 项账本的映射；运行静态校验和 `npm run build`；执行 `npm run test:e2e:v077:list`。只修复测试入口/脚本运行环境问题，**不调试复杂业务缺陷**。列出哪些用例已有真实自动化、哪些仍未实现。不能将本阶段脚本编写记为业务通过。

**完成门槛**：执行器列出 250 个 ID，第一批 6 条明确显示已注册、244 条未覆盖；静态/构建结果有真实证据。失败或 BLOCKED 留确切命令。提交并核验 SHA。

### H1 — High｜P0：自动草稿与粘贴修复

**执行指令**：运行 `node tools/validation/v077/run.mjs run --ids NEW-01,NEW-02,NEW-03,OLD-03,CLIP-01,CLIP-04`；用原始 FAIL 复现 Issue #16/#17/#19，排查保存控制器、草稿箱 UI、正文序列化、剪贴板适配。实施**最小业务修复**，保持危险 HTML 拒绝、安全媒体检查、事务/epoch/幂等保护。对三类新卡与已发布卡，都验证**自动保存，不按保存键 → UI 草稿箱 → 点击打开 → 新 Electron PID → 重启仍完整**；保存草稿不能偷偷改正式版。修复后重跑这些 ID 及关联 API/GUI 回归，真实证据写账本。

**完成门槛**：上述已实现测试针对真实生产 UI PASS，且保存失败/冲突分支可恢复。若失败不掩盖；不要因 P0 尚未全映射就在报告中宣称“58/58 通过”。本阶段自动修复已经授权，无须每个小问题问用户。

### M2 — Medium｜批量实现其余功能组的自动化操作链

**新增 UI 专项**：纳入 #20 的 `EDITOR-20`、`EDITOR-21`。模拟打开两个内容审阅弹窗，输入/预览长文本，在 1500×900、1366×768 和 900px 宽度检查文本区域、滚动、按钮与键鼠可达性。此项归为 P2；**不得因只需修样式就扩大为旧原型逐像素重审**。

**执行指令**：从 `E2E-RESULTS.json` 按优先级筛选尚未映射案例（只取当前组，不把整个 JSON 输出到上下文），每轮 **10–20 条**，把共用步骤写进 `helpers.mjs`，把具体操作追加到现有 `scenarios/<module>.mjs`。只测**正式 Electron 可见控件**，以读 API/SQLite 核验结果；复用 R4–R7 现成测试能力。每个场景必须涵盖 UI/落盘/返回/重开/必要时重启，不能把后台直接写入算成操作通过。增加注册表 ID，按组选跑并记录实测结果。**复杂业务 FAIL 不在 Medium 阶段反复猜测修复**，写失败摘要转 H3。

**批次顺序**：先 NEW/OLD/CLIP 的 P0 未覆盖项，再 REVIEW/BACK/TRASH/FAULT；后续 CAT/EDITOR/LIST/PLAN/KNOW/MD/MEDIA/EX，最后 ENV/HOME/AN/SET/WIN。P1 未处理的真实功能缺陷同样要记录，不因用例太多跳过。

### H3 — High｜集中处理确证的业务失败

**执行指令**：只读本轮报告中 `FAIL` 与 P0 `BLOCKED` 的 CASE ID 和最小失败日志，按根因合并处理 1–3 类问题：定位 Vue 事件→业务 API→事务→持久化；最小改代码；重跑**原失败场景+相邻回归+新进程读回**；更新 GitHub Issue、证据和代码。不要重复审计无关 R0–R7。

**升级条件**：同一根因经两次有证据的 High 修复仍复现，或出现高风险数据一致性/竞态，再交 X4。

### X4 — Extra High（按需）｜复杂并发、冲突和数据安全

**调用条件**：H3 留下失败输入、原/期望状态、两次尝试 SHA 和复现结果。仅对保存竞态、异步图片选择区、SQLite 事务/epoch 冲突、历史与回收站一致性等疑难问题启用。优先精简确定性重现，设计正确性约束后修复并做最小影响回归。**不对 250 项全面使用 Extra High**；不需要时跳过本阶段。

### M5 — Medium｜复验、Windows Runner 和证据汇总

**执行指令**：复用现有 `pr-quality.yml`、`npm run ci:quality`，在 P0 GUI 场景可靠通过后，将必要自动化入口**小范围接入现有 CI 门禁**（不新建工作流，不削弱旧质量检查）；验证 Ubuntu/Windows 的真实 run/job/artifact，回填 SHA、CASE ID 和平台。未跑的 Win10/Win11 真机物理剪贴板、中文 IME、原生弹窗保留 `NOT_RUN`，Windows Runner 不能代签。Windows 构建独立完成即可，不等待 CI 长时间运行。

**完成门槛**：报告清晰区分 Unit/API、Electron GUI、Windows CI、Win10 Real、Win11 Real；旧 PASS 不因为别的 SHA 被沿用。仅按真实证据晋升账本。

### H6 — High｜发布前最终用户操作闭环审查

核验 250 条案例映射覆盖、重点 **58 条 P0 发布阻断用例**、所有用户报告缺陷状态、数据完整性、真实 Windows 剩余验收清单。P0 缺失真实 GUI 或 Windows 必需证据时不得宣布版本已完整验收；P1 的真实严重故障不得放行。按仓库规则准备 Draft PR → `develop`；**不自动合并、审批信任门禁或发布**，最后由用户作交付决定。

## 4. 各阶段交接的固定输出（严格节约额度）

每次 Work 的最后只交付一个精简摘要：

```text
Stage / Model:
Branch / full HEAD:
Implemented IDs this round:
Executed IDs: PASS / FAIL / BLOCKED / NOT_RUN:
New bugs / fixed issues:
Tests actually run + OS:
Commit(s) pushed + independently verified:
Next Stage / Model / first case IDs:
Remaining critical blockers:
```

不重新粘贴完整 250 项原文，也不把 67KB JSON 读入上下文；模型只看当前组 ID、少量失败证据与必要源码。保留所有原始有效文件与结果，禁止强推、reset、删测试或虚报 PASS。当前阶段源码修复尚未发生；v0.7.7 的 `package.json` 仍为 0.7.6，真正交付前按版本门禁更新。


## M0 实测记录 — 2026-10-30（当前恢复权威）

状态：DONE（本地验收完成；GitHub 保存以本记录提交的远端 HEAD/父链核验为准）。模型：GPT-6.1 Sol / Medium。唯一分支 feature/v077，目标 develop；被测基线 `6eca78c9d90a13f1d0c93cf6d9a16f4639dd048f` 加本轮执行框架工作树，未把工作树测试冒充干净基线测试。未进入 H1。

旧分支 feature/v077-editor-paste：SUCCESS，`git ls-remote --heads origin 'feature/v077*'` 只返回 feature/v077，未执行额外删除。工作区初始干净。TASK/恢复文档原为继承的 v0.7.6 状态；按用户继续依据修正，未执行 task:init。

### 自动生成覆盖基线

总数 250；P0 58 / P1 163 / P2 29；已映射 6 / 未映射 244。唯一 ID 校验通过。映射 ID：CLIP-01, CLIP-04, NEW-01, NEW-02, NEW-03, OLD-03。

| 功能组 | 总数 | 已映射 | 未映射 |
| --- | ---: | ---: | ---: |
| ENV | 9 | 0 | 9 |
| HOME | 8 | 0 | 8 |
| CAT | 11 | 0 | 11 |
| NEW | 19 | 3 | 16 |
| OLD | 14 | 1 | 13 |
| EDITOR | 21 | 0 | 21 |
| CLIP | 16 | 2 | 14 |
| LIST | 11 | 0 | 11 |
| PLAN | 12 | 0 | 12 |
| REVIEW | 17 | 0 | 17 |
| AN | 8 | 0 | 8 |
| KNOW | 15 | 0 | 15 |
| MD | 11 | 0 | 11 |
| MEDIA | 8 | 0 | 8 |
| EX | 13 | 0 | 13 |
| SET | 11 | 0 | 11 |
| BACK | 14 | 0 | 14 |
| TRASH | 9 | 0 | 9 |
| FAULT | 14 | 0 | 14 |
| WIN | 9 | 0 | 9 |

逐平台账本统计（脚本统计，未更改原 E2E-RESULTS.json）：

| 层级 | PASS | FAIL | BLOCKED | NOT_RUN |
| --- | ---: | ---: | ---: | ---: |
| unitApi | 0 | 0 | 0 | 250 |
| electronUi | 0 | 0 | 0 | 250 |
| windowsCi | 0 | 0 | 0 | 250 |
| win10Real | 0 | 0 | 0 | 250 |
| win11Real | 0 | 0 | 0 | 250 |

### 实际命令和证据

Linux x64，Node v24.22.1 / npm 11.9.0；锁定依赖 npm ci 成功（381 packages）。Electron 44.9.1、Playwright 版本依 package-lock；无 Xvfb，复用既有 Ozone headless 正式生产入口成功。

- `npm ci`：PASS。
- `node --experimental-strip-types --test tests/v077-e2e-runner.test.ts`：最终 7/7 PASS；首轮 4/4 为修改前结果，不重复计算。
- `npm run build`：PASS（仅已有 chunk 大小提示）；无生产源码更改，后续仅测试代码/记录修改，不重复构建。
- `npm run test:e2e:v077:list`：PASS，250 / 6 / 244；列表成功不代表业务成功。
- `node tools/validation/v077/run.mjs list --group NEW`：PASS，19 / 3 / 16。
- `node tools/validation/v077/run.mjs run --ids AN-01`：预期退出 2，NOT_RUN=1，不更新账本。
- `node --experimental-strip-types tools/validation/v077/smoke.mjs`：1 次框架冒烟 PASS；正式 Vue、真实所有卡片控件、独立 Schema606、重启 PID 102 → 171、读回原合成卡片、无 renderer pageerror；cleanup=REMOVED_ISOLATED_FIXTURE。这不是 250 条业务 CASE 的任何一次 PASS。

框架测试 PASS=7 / FAIL=0 / BLOCKED=0；Electron 框架冒烟 PASS=1。业务 electronUi PASS=0 / FAIL=0 / BLOCKED=0 / NOT_RUN=250。Windows CI、Win10/Win11 实机各 250 NOT_RUN，物理剪贴板/IME/原生弹窗未验证；不查询或等待 CI。原始临时输出位于 gitignored validation-results/v077/ 与本机 /tmp/gank-m0-*，可重跑上述命令，不作为永久外部证据引用。

### 框架修改与限制

1. promote 拒绝未映射用例 PASS、API-only proof、summary 与 case.json 的步骤/证据不一致；拒绝过程不会写账本。增加负向回归。仍需人工审阅真实证据，JSON 自身不是不可伪造签名。
2. helpers 在关闭 Electron 后，限定临时父路径、前缀及 synthetic606 子路径，删除本次隔离数据/配置；清理失败记 FAIL，不删除用户数据。smoke 实测清理成功。启动在 session 返回前异常时继承 launcher 的进程回收能力未专项故障注入，不宣称覆盖全部异常路径。
3. 提取退出码纯函数供真实 runner 使用，校验 PASS=0、FAIL 优先=1、BLOCKED/NOT_RUN/空结果=2；实际未映射命令验证退出 2；纯未映射选择无需生产构建，支持 CI 在 build 前运行框架测试。
4. 增加仅框架可行性 smoke.mjs，复用既有 host/helpers，不注册为业务案例、不调用 promote。用户动作仅通过 UI，业务 API 只断言；fixture 初始化允许合成写入。

不修复 #16–#20 草稿/粘贴/弹窗业务问题；未修改生产源码、Schema606、锁文件、版本或 CI 门禁。无 M0 关键阻断。现有6条脚本仍未业务实跑，其余244条无映射。

被测测试源码 SHA256（本提交含自身SHA不可能，以上基线+以下文件哈希定位实测工作树）：

- `tools/validation/v077/registry.mjs`：`e8f2b1f1cb9455a9e6e3c75a8a52c40bf9744f7796b2c93079c38035908263c1`
- `tools/validation/v077/run.mjs`：`2435a9eae6a17d599747fecd05a351abdfa50455e26922057000fe1b8e15a125`
- `tools/validation/v077/helpers.mjs`：`40100814f452ec1dd2f73fcd28c764fee5fa7391ffd68e00c1363a96e588a2ba`
- `tools/validation/v077/promote.mjs`：`e42c44d1c222b63d00d7104b4dfaa6d47905d7b3b67154baaebea0d03977a858`
- `tools/validation/v077/smoke.mjs`：`d5e1f847f11c0d8114848ae83eac32d1007e50b09e8552069d29d7629b4f73a5`
- `tests/v077-e2e-runner.test.ts`：`f9ac838110055b91d8111fb2053ab7f361821f2084548428b480d0666cc8fd20`

### 下一阶段

H1 / GPT-6.1 Sol / High。先读取本节、ISSUES-AND-ACCEPTANCE.md 和 v077 helpers/scenarios，构建后运行 NEW-01,NEW-02,NEW-03,OLD-03,CLIP-01,CLIP-04；按真实失败最小修复草稿/粘贴，再审核证据晋升。新环境先 npm ci。本轮保存核验即结束，不进入 H1、不创建/合并 PR、不发布。


## H1 当前结果 — 2026-10-30

H1 BLOCKED；正式完整报告见 [H1-REPORT.md](./H1-REPORT.md)。8条Electron PASS，43项模块回归及7项框架PASS；Windows原始问题待补证据。不进入M2。覆盖映射现为8/250，其余242未映射。此前6/250为M0历史。

## T1-A 起持续有效的 Token 节约规则（2026-10-30）

- Node/Playwright 批量执行模块操作链；模型只读统计和 FAIL/BLOCKED 必要摘要，原始日志/截图落文件。
- 只读当前模块必需文件，不重复加载250条清单或历史报告；PASS仅统计，失败才列CASE、错误、日志及源码位置。
- 已校验依赖与410个构建文件继续复用；仅生产源码/构建输入变化才安装或构建。
- 已通过且未受影响的检查不重跑；最终只做必要框架回归和本轮操作链。
- 注册表变化时精确更新旧断言，按真实注册状态及操作合同核验；不删除有效断言或降低强度。
- 测试基础设施允许最小修复；T1/T2生产故障只收集，I3分类后F4集中修复。
- 脚本先保存GitHub，再针对准确远端SHA执行；更新报告、唯一账本和恢复记录后核实远端，不等CI、不合并发布。
