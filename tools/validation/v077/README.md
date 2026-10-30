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
