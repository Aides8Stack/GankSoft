# F2 FAULT-13 — 2026-10-30

FIXED_PENDING_WINDOWS. Production/test SHA `e5d043da50e5adaa3ae3a5aea798788e1f2aa5c4`. F1 remote save verified `4406cc95f3f4b1b6279b6248daf4dee66b4adc36`.

Existing DraftFields title max300 remains unchanged. Previous parsing threw before state update; raw input displayed while controller retained old clean fields. Controller now retains invalid editable fields, marks error with Chinese reason, cancels invalid autosave and prevents allocating a request. Existing in-flight/unknown writes still reconcile exact original identity before handling newer input. Successful publication feedback clears on text edits. Schema606, protocol, version, lockfile and immutable published content unchanged.

Domain/controller regression: 34/34 PASS, including new boundary300/301, close/dispose preservation, older receipt arriving during invalid input, and original unknown request replay. `npm run build` PASS with vue-tsc/tsc. Fingerprint `4ca93ae90f48b0b37df4d3d8da9656b4e0cd04176cd581e908a81626fe5aa9d6`, 414 hashed outputs, dependencies reused without installation.

Formal Linux Electron FAULT-13 PASS: GUI new question with legal autosave; 301-char input shows Chinese failure and retained content; zero draft.save calls/SQLite change; editing body retains invalid title; correction autosaves. New PID reads exact new draft. Published direct card invalid320 creates no draft or version mutation; correction saves one draft, second PID reads draft with original published version; explicit GUI publish appends one version and retains all prior rows; third PID reads both cards correctly. integrity_check/foreign_key_check/schema606 PASS. No duplicate drafts or content loss.

An initial launch was started before complete build sealing and failed to mount dynamic editor; it is TEST_INFRA/invalid build evidence, retained in archive and excluded from PASS/FAIL. The accepted run is F2-verified on the sealed build, with full steps and SQLite diagnostics in F2-RESULTS.json. Windows client/CI NOT_RUN.

promote dry-run/actual PASS: only FAULT-13 changed, 249 other CASE/Windows objects retained. At local F2 snapshot: 209 PASS /2 FAIL /3 BLOCKED /36 NOT_RUN; concurrent remote advancement must be merged by CASE before save. Historical FAIL retained in prior immutable reports/observations.


## 最终同树复验补记（优先于前述历史指纹）

最后补齐CAT-03空名称原生invalid事件的固定中文提示，仍是原缺陷范围。最终生产/测试SHA `fcccda97c6cddc3fcbcfb65383995c12b694c0e0`，最终生产指纹 `17f676829abae98e51962d442505b5b5a9721d1a5379786f3fd36d1fb05652f4`，456输出逐哈希封存，完整类型/构建PASS。F1三宽真实点击、目录空名中文/空白/重名/未知请求/重启、F2完整三新PID链全部重验PASS。Markdown卡片和知识正文原RAF受控复现均成功；最后原驱动自然EDITOR-10 PASS、MD-02 FAIL，证实对时序敏感，与前一轮自然EDITOR-10 FAIL共同保留。任何一次自然PASS不关闭共享BUG。

严格promote在精确本SHA上只更新三修复PASS及MD-02当前FAIL；不晋升诊断PASS，不改其他CASE/Windows字段。最终209PASS/2FAIL/3BLOCKED/36NOT_RUN。F3没有改Markdown生产实现；最终CAT中文提示补齐使旧指纹不能冒充最终同树结果，因此新增了本段可追溯复验。详情FINAL-REVALIDATION.json。
