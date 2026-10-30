# GankSoft v0.7.7 — 自动化优先、分模型分阶段执行手册

> 版本：v0.7.7 稳定性专项。**本文件是执行指令，不是 PASS 测试报告。** 当前 248 条合同已建立，自动化第一批 6 条已经编码（NEW-01/02/03、OLD-03、CLIP-01/04），**还没有在实际 Electron 进程中运行验收**；其余 242 条保持 NOT_RUN。

## 唯一目录结构和资料职责

| 路径 | 唯一职责 |
| --- | --- |
| `tools/validation/v077/run.mjs` | 统一 CLI：查询覆盖、选择用例、逐条运行、汇总结果 |
| `tools/validation/v077/registry.mjs` | 唯一**已实现**用例注册表；没有具体场景不得加入 |
| `tools/validation/v077/helpers.mjs` | 既有隔离 Schema606 夹具、正式 Electron 启动、草稿箱 UI、重启后读回 |
| `tools/validation/v077/scenarios/*.mjs` | **按功能模块**归档模拟人工场景，禁止一个用例一个文件 |
| `tools/validation/v077/promote.mjs` | 按精确源 SHA 审核测试结果，显式更新 Electron UI 状态；**不会写人工 Windows 或 CI 状态** |
| `tests/v077-e2e-runner.test.ts` | npm test 纳入的执行器/用例映射校验 |
| `docs/v077/E2E-FULL-OPERATION-CHAINS.md` | 唯一完整的 248 项用户操作链规范（不重复抄写） |
| `docs/v077/E2E-RESULTS.json` | 唯一逐项、逐平台验收状态账本 |
| `docs/v077/ISSUES-AND-ACCEPTANCE.md` | Issue #16–#19 和其后新增真实缺陷的索引 |
| `docs/v077/WORK-E2E-EXECUTION.md` | **本文件**：分模型阶段交接/入口 |
| `validation-results/v077/runs/` | 可丢弃临时 JSON/日志/截图（已被 .gitignore 排除） |

**禁止**把 v0.7.7 新脚本放到旧 R4–R7 测试目录、项目根目录、docs 临时子目录或新增平行 Actions 工作流。实际新增业务测试只扩展 `scenarios/` 并在注册表写唯一 ID。新业务模块可以按模块新增一个场景文件。

仓库：`Aides8Stack/GankSoft`。**唯一目标分支：`feature/v077`；目标 PR base：`develop`。**每轮以 GitHub 远端真实 HEAD 为准；不要从旧 `feature/v077-editor-paste` 恢复。必须先遵守 `AGENTS.md` 和 `docs/development/STANDARDS.md`，复用现有任务记录，不重复 `task:init`，不访问用户真实库，不强推、不绕过审批。

## 1. 采用自动脚本而非每条调用大模型

- 已实现操作链由 Node/Playwright/Electron 一次启动、连续点击/输入/返回/重启来验证；**执行一条无需调用一次模型**。
- 只有出现 FAIL、未映射的交互、测试夹具失效或业务逻辑不清时，才启动对应推理强度的 Work。
- 工具本身不会自动切换 GPT 模型，也不会在后台调用 Medium/High/Extra High。**每个 Work 阶段由用户在模型菜单选定强度后独立启动**；下阶段只读 GitHub 检查点，避免重复消耗额度。
- 普通无分支变更的脚本批量运行可用 Medium；涉及保存/历史/事务、源代码修复使用 High；两轮 High 仍失败的并发/数据一致性疑难问题才升级 Extra High。
- 248 条测试不是一口气交给一个 Work。按 P0→P1→P2 实现自动化、运行并修复，分小批次提交，持久化精确 case ID 和 SHA。

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

**执行指令**：从 `feature/v077` 最新 HEAD 恢复，检查 `tools/validation/v077/`、`tests/v077-e2e-runner.test.ts` 和 248 项账本的映射；运行静态校验和 `npm run build`；执行 `npm run test:e2e:v077:list`。只修复测试入口/脚本运行环境问题，**不调试复杂业务缺陷**。列出哪些用例已有真实自动化、哪些仍未实现。不能将本阶段脚本编写记为业务通过。

**完成门槛**：执行器列出 248 个 ID，第一批 6 条明确显示已注册、242 条未覆盖；静态/构建结果有真实证据。失败或 BLOCKED 留确切命令。提交并核验 SHA。

### H1 — High｜P0：自动草稿与粘贴修复

**执行指令**：运行 `node tools/validation/v077/run.mjs run --ids NEW-01,NEW-02,NEW-03,OLD-03,CLIP-01,CLIP-04`；用原始 FAIL 复现 Issue #16/#17/#19，排查保存控制器、草稿箱 UI、正文序列化、剪贴板适配。实施**最小业务修复**，保持危险 HTML 拒绝、安全媒体检查、事务/epoch/幂等保护。对三类新卡与已发布卡，都验证**自动保存，不按保存键 → UI 草稿箱 → 点击打开 → 新 Electron PID → 重启仍完整**；保存草稿不能偷偷改正式版。修复后重跑这些 ID 及关联 API/GUI 回归，真实证据写账本。

**完成门槛**：上述已实现测试针对真实生产 UI PASS，且保存失败/冲突分支可恢复。若失败不掩盖；不要因 P0 尚未全映射就在报告中宣称“58/58 通过”。本阶段自动修复已经授权，无须每个小问题问用户。

### M2 — Medium｜批量实现其余功能组的自动化操作链

**执行指令**：从 `E2E-RESULTS.json` 按优先级筛选尚未映射案例（只取当前组，不把整个 JSON 输出到上下文），每轮 **10–20 条**，把共用步骤写进 `helpers.mjs`，把具体操作追加到现有 `scenarios/<module>.mjs`。只测**正式 Electron 可见控件**，以读 API/SQLite 核验结果；复用 R4–R7 现成测试能力。每个场景必须涵盖 UI/落盘/返回/重开/必要时重启，不能把后台直接写入算成操作通过。增加注册表 ID，按组选跑并记录实测结果。**复杂业务 FAIL 不在 Medium 阶段反复猜测修复**，写失败摘要转 H3。

**批次顺序**：先 NEW/OLD/CLIP 的 P0 未覆盖项，再 REVIEW/BACK/TRASH/FAULT；后续 CAT/EDITOR/LIST/PLAN/KNOW/MD/MEDIA/EX，最后 ENV/HOME/AN/SET/WIN。P1 未处理的真实功能缺陷同样要记录，不因用例太多跳过。

### H3 — High｜集中处理确证的业务失败

**执行指令**：只读本轮报告中 `FAIL` 与 P0 `BLOCKED` 的 CASE ID 和最小失败日志，按根因合并处理 1–3 类问题：定位 Vue 事件→业务 API→事务→持久化；最小改代码；重跑**原失败场景+相邻回归+新进程读回**；更新 GitHub Issue、证据和代码。不要重复审计无关 R0–R7。

**升级条件**：同一根因经两次有证据的 High 修复仍复现，或出现高风险数据一致性/竞态，再交 X4。

### X4 — Extra High（按需）｜复杂并发、冲突和数据安全

**调用条件**：H3 留下失败输入、原/期望状态、两次尝试 SHA 和复现结果。仅对保存竞态、异步图片选择区、SQLite 事务/epoch 冲突、历史与回收站一致性等疑难问题启用。优先精简确定性重现，设计正确性约束后修复并做最小影响回归。**不对 248 项全面使用 Extra High**；不需要时跳过本阶段。

### M5 — Medium｜复验、Windows Runner 和证据汇总

**执行指令**：复用现有 `pr-quality.yml`、`npm run ci:quality`，在 P0 GUI 场景可靠通过后，将必要自动化入口**小范围接入现有 CI 门禁**（不新建工作流，不削弱旧质量检查）；验证 Ubuntu/Windows 的真实 run/job/artifact，回填 SHA、CASE ID 和平台。未跑的 Win10/Win11 真机物理剪贴板、中文 IME、原生弹窗保留 `NOT_RUN`，Windows Runner 不能代签。Windows 构建独立完成即可，不等待 CI 长时间运行。

**完成门槛**：报告清晰区分 Unit/API、Electron GUI、Windows CI、Win10 Real、Win11 Real；旧 PASS 不因为别的 SHA 被沿用。仅按真实证据晋升账本。

### H6 — High｜发布前最终用户操作闭环审查

核验 248 条案例映射覆盖、重点 **58 条 P0 发布阻断用例**、所有用户报告缺陷状态、数据完整性、真实 Windows 剩余验收清单。P0 缺失真实 GUI 或 Windows 必需证据时不得宣布版本已完整验收；P1 的真实严重故障不得放行。按仓库规则准备 Draft PR → `develop`；**不自动合并、审批信任门禁或发布**，最后由用户作交付决定。

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

不重新粘贴完整 248 项原文，也不把 67KB JSON 读入上下文；模型只看当前组 ID、少量失败证据与必要源码。保留所有原始有效文件与结果，禁止强推、reset、删测试或虚报 PASS。当前阶段源码修复尚未发生；v0.7.7 的 `package.json` 仍为 0.7.6，真正交付前按版本门禁更新。
