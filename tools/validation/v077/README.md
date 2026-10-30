# T2-A 批量覆盖与207条恢复入口（2026-10-30）

唯一状态账本仍是 `docs/v077/E2E-RESULTS.json`。`remaining-plan.mjs` 从冻结的207条基线生成模块、风险、批次和环境要求，随后仅从唯一账本刷新真实状态。T2-A最终31PASS/1FAIL/3BLOCKED；全账本72PASS/3FAIL/3BLOCKED/172NOT_RUN。原41PASS/2FAIL未重跑或覆盖。

```bash
node tools/validation/v077/environment.mjs status
node tools/validation/v077/remaining-plan.mjs
node tools/validation/v077/batch.mjs list T2-P1.01
# 实现本批缺少的GUI处理器后运行；每批最多18条，不自动扩批
node tools/validation/v077/batch.mjs run T2-P1.01
# Windows原始来源处理器就绪后，仅真实Windows环境可复验已BLOCKED项
node tools/validation/v077/batch.mjs run T2-W.01 --retry-blocked
```

`batch.mjs` 自动核验依赖/构建并仅输出失败摘要；PASS/FAIL不自动重跑，BLOCKED仅显式重试。缺处理器仍NOT_RUN，退出2，不能变成PASS。用原 `promote.mjs` 审核晋升后刷新计划；`collect.mjs`只收集观察，工具失败不能当作业务缺陷。归档用 `archive-t2.mjs <本轮summary路径...>`：冻结35条P0、保留所有失败尝试及原41PASS/2FAIL、保存原始证据索引与摘要；这是T2-A专用归档器，后续批次复用通用promote/collect，不将后续ID塞入T2-A。

`run.mjs`新增逐CASE执行输入哈希；工作树脚本不得冒称已包含在基线SHA。平台预检独立 `PLATFORM_GATED`，不计作已实现GUI处理器；未具备真实IME/Word/WPS/截图来源时保持BLOCKED，所有Windows签核层保持NOT_RUN。

---

# v0.7.7 按模块先测试、统一收集问题（当前优先）

只使用本目录的统一执行器与 `registry.mjs`。原有用例与 PASS 证据不删除/不虚增；12 个模块完整覆盖20个功能组/250 CASE。实际可执行数量以 `run.mjs list` 注册表为准；T1-A已补10条，T1-B补9条，未实现项保持NOT_RUN。

```bash
node tools/validation/v077/environment.mjs status # 不执行安装和编译
node tools/validation/v077/environment.mjs prepare # 仅无依赖/指纹不符时运行 npm ci / build
node tools/validation/v077/module-plan.mjs audit
node tools/validation/v077/module-plan.mjs list
node tools/validation/v077/module-plan.mjs show cards
node tools/validation/v077/run.mjs list --module cards --baseline
node tools/validation/v077/run.mjs run --module cards --baseline
node tools/validation/v077/run.mjs list --module cards --baseline --include-negative
node tools/validation/v077/collect.mjs --summary validation-results/v077/runs/<RUN_ID>/summary.json --dry-run
# 逐条审阅仅 FAIL/BLOCKED，适合归档时才 --write
```

**流程**：D0设计→T1基础模块操作→T2反馈异常→I3分类去重→F4统一修复→R5回归。T1/T2不改生产源码。使用 `modules.mjs`/ `module-plan.mjs` 管理业务模块；将新模拟人工场景放 `scenarios/` 按模块归档，代码复用 `helpers.mjs`。保留 `drafts.mjs`、`clipboard.mjs` 现有有效脚本。

**跨 Work**：环境/最小配方永久保存在GitHub；同平台、相同生产输入指纹、输出逐文件SHA一致时可复用PR质量运行生成的Artifact，首次新Work无Node依赖仍可能 `npm ci`；没有有效Artifact必须自己编译一次。详见 [环境文档](../../../docs/v077/ENVIRONMENT-REUSE.md) 和 [模块索引](../../../docs/v077/modules/INDEX.md)。`E2E-RESULTS.json` 仍是唯一CASE/平台结果账本，`DEFECT-INBOX.json` 只记录待分类的问题观察。

---

# v0.7.7 automated UI tests

The **only** v0.7.7 executable-test source directory is `tools/validation/v077/`.
Don't spread one-off scripts into `docs/`, legacy R4–R7 stage directories,
or duplicate CI workflows.

```text
tools/validation/v077/
  run.mjs             list, select, execute, aggregate
  registry.mjs        implemented IDs -> scenario file; validates canonical ledger
  helpers.mjs         isolated Schema606 fixtures, real Electron, GUI readback/restart
  promote.mjs         explicit, SHA-checked Electron evidence -> canonical ledger
  scenarios/
    drafts.mjs        NEW-01/02/03, OLD-03 (real GUI, auto-draft, inbox, restart)
    clipboard.mjs     CLIP-01/04 (Electron native clipboard + GUI Ctrl+V)
tests/
  v077-e2e-runner.test.ts  contract/CLI registry unit tests (picked up by npm test)
docs/v077/
  E2E-FULL-OPERATION-CHAINS.md   canonical 250 expected user flows
  E2E-RESULTS.json               authoritative per-platform status ledger
  WORK-E2E-EXECUTION.md          model-specific stage instructions
validation-results/v077/runs/<timestamp>/
  summary.json, <CASE-ID>/console.log, case.json, optional screenshots
```

## Commands

```bash
npm run build
node tools/validation/v077/run.mjs list
node tools/validation/v077/run.mjs list --group NEW
node tools/validation/v077/run.mjs run --group NEW --mapped-only
node tools/validation/v077/run.mjs run --ids NEW-01,OLD-03,CLIP-01
node tools/validation/v077/promote.mjs validation-results/v077/runs/<run-id>/summary.json --dry-run
```

The runner **fails with exit 1** when an implemented scenario fails and
**exit 2** when a selection contains any BLOCKED/NOT_RUN scenario. Use
`--mapped-only` only for developing already implemented scenarios; it
**does not** mean all 250 cases are covered. The first wave maps **6/250**;
unmapped cases remain NOT_RUN, not PASS. Add handlers by **feature** in
`scenarios/`, not one script per case; register cases explicitly.

Only `promote.mjs` may update executed `electronUi` ledger fields, after
review of a SHA-matching report. It cannot mark Win10/11 real or Windows CI.
Running a scenario generates evidence beneath the gitignored
`validation-results/` only; never commit raw screenshots or local databases.

The fixture is created via the existing `b2Fixture()` in a new disposable
`/tmp/gank-b2-lifecycle-...` directory. It is synthetic and must never
point at a real user's data directory. Test cases may use read-only APIs
to **assert** results, but must trigger changes via visible GUI controls.
Production Electron starts via the established `r7/support.ts` host.

This is **not a CI PASS report** and is not proof of actual Windows physical
clipboard/IME acceptance. The branch's model/stage handoff instructions
are in `docs/v077/WORK-E2E-EXECUTION.md`.

## M0 feasibility smoke

`node --experimental-strip-types tools/validation/v077/smoke.mjs` runs one
production-UI launch/restart/readback and checks isolated resource cleanup.
It does not execute or promote any canonical business CASE.
Promotion rejects unmapped PASS, API-only proof and mismatched proof fields;
review the underlying real UI evidence before promotion.
