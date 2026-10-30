# F1 ENV-05 / CAT-03 — 2026-10-30

Status: FIXED_PENDING_WINDOWS. Production/test SHA `88d647d25651048fa44276944b1ca2ae4cc4be39`. Linux x64 Node24.22.1 / Electron44.9.1 / Schema606; isolated checkout, copied existing dependencies, fresh per-CASE DB/userData. Windows NOT_RUN.

ENV-05: existing toggle moves outside drawer bounds when expanded below 850px. Frozen OPEN-ME HTML unchanged; narrow icon rail and deck list retained. 600px four real mouse expand/collapse cycles, hit testing, deck selection, plus six deck routes/settings at 600/900/1366 all PASS.

CAT-03: existing CatalogSave schema validates before allocating a request. Empty/whitespace rejection leaves form/cancel active; whitespace message Chinese. Folder/deck correction/save, cancel, duplicate rejection, zero invalid IPC writes PASS. Drop committed reply + hide receipt retains disabled inputs/cancel; recover original request creates exactly once. New PID reads identical catalog/published content. PRAGMA integrity/foreign_key/user_version606 PASS. Empty input uses native required validation.

`npm run build` (vue-tsc/tsc) PASS; catalog service tests 5/5 PASS. Build fingerprint `5c52efb03702907eaf2b60e3c218193e6a94b04cd45ca870ccbd728e0ad6e134`, 414 outputs sealed. Electron 2/2 PASS. promote dry-run/actual PASS, only two CASE updated; 248 others/Windows fields unchanged. Totals: 170 PASS /1 FAIL /3 BLOCKED /76 NOT_RUN.

Evidence: F1-RESULTS.json. Raw screenshots/SQLite diagnostics retained for final F1-F3 archive receipt; no PNG in Git. Source SHA is immutable local test commit; remote equivalent tree/save identity resolved through Git history. No unrelated test driver changed. Shell push unavailable (no credentials); normal non-forced connector save uses current parent and tree, with expected SHA guard.

并发保存补记：远端前移至 f01a3a6b2d7cc308e2c193e1d2a35f6df90c22b7（Medium R1当前生产28PASS/2FAIL/4设施）。仅测试/文档变化，生产指纹未变。保留其全部脚本、28条PASS与EDITOR-10/MD-02当前FAIL，按CASE合入F1两个PASS后实际总账 **198 PASS /3 FAIL /3 BLOCKED /46 NOT_RUN**。5份恢复文档头部冲突采用本轮F1摘要+对方完整新记录；两个JSON自动合并后逐字段验证，未覆盖对方观察。

再次并发补记：4d23ec4测试R2仅设施/文档，无生产变化。保留全部合入；F1保存时总账 {'PASS': 208, 'FAIL': 3, 'BLOCKED': 3, 'NOT_RUN': 36}。
