# 2026-10-25 恢复连续开发：S7.b / S7.c 检查点

本轮用户重新授权 S7→S8→S9 连续开发；下方历史中的“立即停止”只针对上轮保存，已被本轮授权覆盖。原分支 feature/v075-unified-learning-workspace、Draft PR #13 不变，不合并、不审批、不发布。已读取本轮原始ZIP主指令/冻结规格/阶段/验收及v3.7最终原型；两个附件SHA256相同，未覆盖最新源码。

恢复起点：1e53c866cb281ee9fe328448e4dfb746ed88be21。当前检查点SHA从 git log -1 与远端HEAD读取，不为回填自身SHA另建提交。

## 当前结果

- S3–S6继承有效自动化证据。S7仍 IN_PROGRESS；S8/S9 NOT_STARTED，不以本次部分功能宣称阶段完成。
- 已核实起点CI40146327911：scope、Windows quality成功，Ubuntu/pr-gate失败。Windows原始Job121028375472已读取；前次table/launcher故障本次未复现，不能宣称已查明旧根因。当前真实失败：Ubuntu Job121028375482，ASAR smoke-mind-workspace.mjs要求position=static，与整窗全屏合同冲突。
- 全屏真实复验：统一工作台9场景PASS（1366/720画布边界）；旧入口图谱7场景PASS，包括平移、编辑弹窗、拖节点、返回/Escape。修复全屏遮挡知识编辑器：仅把该工作台的兄弟弹窗置于全屏上方，保留整窗覆盖和旧弹窗行为。旧测试改成真实边界与工具栏返回/画布Escape，未删操作断言或加超时。
- 新增统一原生批量生命周期：三模式混合删除/移动/恢复，CAS、范围验证、幂等回执和事务回滚；移动保持ID、版本/事件/FSRS/单卡设置，清当前关联；草稿保留并更新基线修订。未完成复盘阻止破坏性操作；已完成页面移动前原文归档，原事件不变。生产604未激活606。
- 已接批量目标目录分页、卡片回收站/恢复、未知回执核对和离开保护；草稿/会话列表补“更多”。学习会话匹配携带practiceMode，避免把专项静默恢复为普通会话。

## 实际验证与未验

PASS：两次应用构建/隔离构建；原全屏UI9、旧图谱UI7、工作台专项6、生命周期专项5；协议21/127方法及边界/类型/导出。新一轮包含批量交互、重算确认/撤销、响应丢失及多页重启的Electron smoke正在验证，不能提前PASS。新增归档完整性校验后的完整业务374/374 PASS（0失败/跳过）。截图仍BLOCKED（Linux headless截图超时）；Win10/11人工IME/物理操作/最终便携同包NOT_RUN。

## 首个未完成任务

1. 完成 tools/workspace-spike/smoke.ts 最新扩展场景，读取 validation-results/unified-workspace-v075.json 及实际进程退出值；失败最小修复，不能以旧9场景替代新覆盖。本轮临时日志 /tmp/gank-s7-batch-ui.log、/tmp/gank-s7-batch-business.log；丢失时从源码专项重跑，不能伪造。
2. 构建与UI严格顺序：npm run build → npm run build:editor-spike → node --experimental-strip-types tools/workspace-spike/smoke.ts；禁止共用构建资源的Electron测试并发。专项 node --experimental-strip-types --test tests/unified-{workspace,card-lifecycle}-v075.test.ts；协议 npm run check:protocol。
3. 补齐S7剩余：原生批量导出（不可套旧deck.kind内容导出）、学习分析、卡片集/文件夹管理、完整会话/草稿分页焦点与窗口状态、三模式总流程、宽窄截图/T33–T37与相应CI。S7准入未满足，不标DONE，不开展S8危险数据操作。
4. S7通过后按原ZIP S8完整恢复/独立追加/活动目录迁移/回收站→S9全量及Win验收；持续授权有效，推送只保存检查点，不结束。CI不等待/轮询。原包保存在本次附件解压目录，仅作需求参照，不提交ZIP或真实数据。

涉及：src/unified/Unified{Workspace,CardBatch,CardRecycle}.vue；electron/modules/cards-unified/lifecycle.ts；shared/protocol/card-lifecycle.ts；electron/infrastructure/migrations/unified-integrity.ts；tools/{workspace-spike/smoke.ts,smoke-mind-workspace.mjs}；tests/unified-card-lifecycle-v075.test.ts。
