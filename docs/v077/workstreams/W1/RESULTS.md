# W1 — 执行结果

W1.1 DONE；W1.2 IN_PROGRESS；W1.3 NOT_STARTED。基线 `2f7cf4858b530b3a7c1ee1c8d743f0c9016b7e4f`，Schema606。

## 真实根因（正式 Linux Electron）

- 自动保存持有请求期间，评分区域 fieldset 被 locked 禁用；真实鼠标点击保存没有产生 learning.review.submit。submit 本身亦因 busy 提前返回，不排队。证据 baseline.json disabledDuringAutosave=true、afterFirstClick 无 submit。
- 再点保存后 SQLite 三表均正确：学习事件、相同 eventId 调度事件、最新 FSRS reps=1。返回所有卡片却仍显示原来的0次和未记录，确认属于已提交但 UI 陈旧。
- UnifiedWorkspace.lastLists 保存/恢复 rows，cards/back 未强制重新读取；client 丢弃信封修订，分析/概览缺少统一失效订阅。概览两路读没有修订对齐。
- 正式仅练习入口及后端 practice 分支可绕过 advanceSchedule；老版本/周期/排期冲突仍可保存不调度事件，不满足新合同。
- learning.review.submit 是同步 host handler。现有 host.atomic 包含领域事务、bumpRevision 和 durable receipt；不是异步 platform 的二段提交，无须新增网关事务或第二套调度。

证据 [baseline.json](./evidence/baseline.json)，脚本 tools/validation/v077/w1-reproduce.mjs。首轮仅因旧按钮定位错误失败，原样保留 baseline-infra-attempt.json；修正为实际卡片集导航后一次补验 REPRODUCED。没有计入新合同 PASS。

W1-01～W1-08 新合同仍 NOT_RUN；Windows CI、Win10、Win11、真实125%DPI NOT_RUN。B1–B5和旧250总账不变。W2不可启动。
