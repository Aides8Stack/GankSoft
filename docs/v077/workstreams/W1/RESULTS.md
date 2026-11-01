# W1 — 执行结果

W1.1 DONE；W1.2 DONE；W1.3 IN_PROGRESS。基线 `2f7cf4858b530b3a7c1ee1c8d743f0c9016b7e4f`，Schema606。

## 真实根因（正式 Linux Electron）

- 自动保存持有请求期间，评分区域 fieldset 被 locked 禁用；真实鼠标点击保存没有产生 learning.review.submit。submit 本身亦因 busy 提前返回，不排队。证据 baseline.json disabledDuringAutosave=true、afterFirstClick 无 submit。
- 再点保存后 SQLite 三表均正确：学习事件、相同 eventId 调度事件、最新 FSRS reps=1。返回所有卡片却仍显示原来的0次和未记录，确认属于已提交但 UI 陈旧。
- UnifiedWorkspace.lastLists 保存/恢复 rows，cards/back 未强制重新读取；client 丢弃信封修订，分析/概览缺少统一失效订阅。概览两路读没有修订对齐。
- 正式仅练习入口及后端 practice 分支可绕过 advanceSchedule；老版本/周期/排期冲突仍可保存不调度事件，不满足新合同。
- learning.review.submit 是同步 host handler。现有 host.atomic 包含领域事务、bumpRevision 和 durable receipt；不是异步 platform 的二段提交，无须新增网关事务或第二套调度。

证据 [baseline.json](./evidence/baseline.json)，脚本 tools/validation/v077/w1-reproduce.mjs。首轮仅因旧按钮定位错误失败，原样保留 baseline-infra-attempt.json；修正为实际卡片集导航后一次补验 REPRODUCED。没有计入新合同 PASS。

W1-01～W1-08 新合同仍 NOT_RUN；Windows CI、Win10、Win11、真实125%DPI NOT_RUN。B1–B5和旧250总账不变。W2不可启动。

## W1.2 实施检查点

正式提交与自动保存串行，提交按钮独立于草稿fieldset，500ms保存途中点击排队且防连点；暂停不再静默退出。正式API拒绝practice:true，专项入口使用同一正式提交；旧practice事件/结果codec保留。旧practice待答会话显示说明，用户显式保存草稿时CAS转换，不改已完成事件。版本/周期/排期冲突拒绝整体提交并保留作答。

现有client保持业务返回形状，以WeakMap透传信封metadata并维护epoch/修订单调上界；原operation.status回执复用同一验证路径。services发布去重的轻量失效信号，Prompt/草稿自动保存不触发全库刷新。恢复后旧epoch请求和页面引用不可重新绑定新库写入。概览两路读同修订校验并至多一次重读；所有卡片lastLists只存操作上下文和页数，返回重新读库，丢弃旧游标/旧异步请求。相关分析、知识掌握、详情、总览、队列按变更或窗口激活读取，失败隐藏旧业务数据并明确提示。

生产文件仅既有复盘、协议client、services、相关读取页面及生命周期失效composable；无新表、数据库、FSRS引擎、统计引擎、IPC通道、持久缓存或W2暂停结算接入。两个直接受新合同影响的旧单元测试更新预期，不修改历史报告/250账本。

首轮正式Electron新合同8/8 PASS（gui-preliminary.json，明确为工作树预验，不当作冻结SHA）；现冻结源码/脚本后执行最终验收。CLI push无写凭据，使用GitHub连接器基于真实parent/base tree、force=false和expected_sha追加。W1.1远端9acc3d5d26e5c65f71405db7e02f0f212c94ba08，tree b7c199a296a176a440559a089fc2eedb97621405与本地adb9f88 tree一致。
