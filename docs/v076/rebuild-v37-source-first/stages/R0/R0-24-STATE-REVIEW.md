# R0：24 条未闭环状态复核

基于现有逐行源码映射核对，不重建索引。分类描述语义或缺失；动态状态仍为 NOT_RUN，不等于功能 PASS。逐行完整事件、组件、DOM、typed API、服务、测试引用保留在 STATE-SEMANTIC-MAP.json。

| 状态 | 分类 | 责任 | 触发与正式入口 | 测试及下一步 |
|---|---|---|---|---|
| overview | BUSINESS_ADAPTED | R2 | 导航data-go / navTo → render；正式用户可见导航→switchPage；src/unified/UnifiedHome.vue | tests/dashboard-v076.test.ts；后续阶段 R2 对该状态的真实交互补专项验证；不可由候选单元测试推断 UI 已运行。 |
| deck | BUSINESS_ADAPTED | R2 | 导航data-go / navTo → render；正式用户可见导航→switchPage；src/unified/UnifiedDeckOverview.vue | tests/dashboard-v076.test.ts；后续阶段 R2 对该状态的真实交互补专项验证；不可由候选单元测试推断 UI 已运行。 |
| cards | BUSINESS_ADAPTED | R3 | 导航data-go / navTo → render；正式用户可见导航→switchPage；src/unified/UnifiedWorkspace.vue | tests/unified-workspace-v075.test.ts；后续阶段 R3 对该状态的真实交互补专项验证；不可由候选单元测试推断 UI 已运行。 |
| cardDetail | BUSINESS_ADAPTED | R3 | 导航data-go / navTo → render；正式用户可见导航→switchPage；src/unified/UnifiedCardDetail.vue | tests/unified-history-evidence-v075.test.ts；后续阶段 R3 对该状态的真实交互补专项验证；不可由候选单元测试推断 UI 已运行。 |
| filter | BUSINESS_ADAPTED | R3 | 导航data-go / navTo → render；正式用户可见导航→switchPage；src/unified/UnifiedStudyPlanner.vue | tests/unified-workspace-v075.test.ts；后续阶段 R3 对该状态的真实交互补专项验证；不可由候选单元测试推断 UI 已运行。 |
| analytics | BUSINESS_ADAPTED | R4 | 导航data-go / navTo → render；正式用户可见导航→switchPage；src/unified/UnifiedAnalytics.vue | tests/unified-analytics-catalog-v075.test.ts；后续阶段 R4 对该状态的真实交互补专项验证；不可由候选单元测试推断 UI 已运行。 |
| exchange | BUSINESS_ADAPTED | R5 | 导航data-go / navTo → render；正式用户可见导航→switchPage；src/unified/UnifiedCardExchange.vue | tests/unified-card-exchange-v075.test.ts；后续阶段 R5 对该状态的真实交互补专项验证；不可由候选单元测试推断 UI 已运行。 |
| schedule | BUSINESS_ADAPTED | R6 | 导航data-go / navTo → render；正式用户可见导航→switchPage；src/unified/UnifiedScheduleSettings.vue | tests/unified-review-v075.test.ts；后续阶段 R6 对该状态的真实交互补专项验证；不可由候选单元测试推断 UI 已运行。 |
| settings | MISSING_IN_PRODUCTION | R6 | data-setting=general→state.setting；正式设置分类@click→section；src/unified/UnifiedSystemSettings.vue | tools/workspace-spike/settings-smoke.ts；后续阶段 R6 根据差异实现/明确业务入口；当前不虚构 UI 交互。 |
| knowledge | MISSING_IN_PRODUCTION | R5 | data-map-id/knowledge-nav-select/outline-select；data-knowledge-view；fullMap；正式selectNode/outlineSelect/expandAll/toggleView；src/components/MindMapWorkspace.vue | tests/unified-knowledge-v075.test.ts；后续阶段 R5 根据差异实现/明确业务入口；当前不虚构 UI 交互。 |
| settings-general | MISSING_IN_PRODUCTION | R6 | data-setting=general→state.setting；正式设置分类@click→section；src/unified/UnifiedSystemSettings.vue | tools/workspace-spike/settings-smoke.ts；后续阶段 R6 根据差异实现/明确业务入口；当前不虚构 UI 交互。 |
| settings-about | MISSING_IN_PRODUCTION | R6 | data-setting=about→state.setting；正式设置分类@click→section；src/unified/UnifiedSystemSettings.vue | tools/workspace-spike/settings-smoke.ts；后续阶段 R6 根据差异实现/明确业务入口；当前不虚构 UI 交互。 |
| modal-copyCard | BUSINESS_ADAPTED | R4 | 复制卡片→copyContent（无独立scope模态框）；src/cards/CardDraftForm.vue | tests/card-drafts-v075.test.ts；后续阶段 R4 对该状态的真实交互补专项验证；不可由候选单元测试推断 UI 已运行。 |
| modal-media | MISSING_IN_PRODUCTION | R4 | Crepe粘贴入口→stageClipboard；无独立资源管理窗；src/editor/media-adapter.ts | tests/card-drafts-v075.test.ts；后续阶段 R4 根据差异实现/明确业务入口；当前不虚构 UI 交互。 |
| modal-deleteMedia | MISSING_IN_PRODUCTION | R4 | 无已验证的独立资源删除对话框；src/editor/media-adapter.ts | tests/card-drafts-v075.test.ts；后续阶段 R4 根据差异实现/明确业务入口；当前不虚构 UI 交互。 |
| modal-batchOptions | MISSING_IN_PRODUCTION | R4 | addOption/removeOption/moveOption；无批量选项弹窗；src/cards/CardDraftForm.vue | tests/card-drafts-v075.test.ts；后续阶段 R4 根据差异实现/明确业务入口；当前不虚构 UI 交互。 |
| modal-newKnowledge | BUSINESS_ADAPTED | R5 | 新增下级/同级/根→MindElixir公开hook→真实tree apply；src/components/MindMapWorkspace.vue | tests/unified-knowledge-v075.test.ts；后续阶段 R5 对该状态的真实交互补专项验证；不可由候选单元测试推断 UI 已运行。 |
| modal-batchExport | BUSINESS_ADAPTED | R3 | 多选→导出选中卡片→UnifiedCardExchange内联预览；src/unified/UnifiedCardBatch.vue | tests/unified-card-exchange-v075.test.ts；后续阶段 R3 对该状态的真实交互补专项验证；不可由候选单元测试推断 UI 已运行。 |
| modal-batchDelete | BUSINESS_ADAPTED | R3 | 移到回收站→native confirm→remove；src/unified/UnifiedCardBatch.vue | tests/unified-card-lifecycle-v075.test.ts；后续阶段 R3 对该状态的真实交互补专项验证；不可由候选单元测试推断 UI 已运行。 |
| modal-permanentTrash | MISSING_IN_PRODUCTION | R6 | 没有606永久清除的已实现入口/专用typed命令；src/unified/UnifiedRecycle.vue | tests/unified-card-lifecycle-v075.test.ts；后续阶段 R6 根据差异实现/明确业务入口；当前不虚构 UI 交互。 |
| modal-historyDetail | BUSINESS_ADAPTED | R3 | learning.history.get(eventId)→只读历史详情；src/unified/UnifiedCardDetail.vue | tests/unified-history-evidence-v075.test.ts；后续阶段 R3 对该状态的真实交互补专项验证；不可由候选单元测试推断 UI 已运行。 |
| modal-demo | BUSINESS_ADAPTED | R4 | genericDialog(交互演示)无生产对应；src/unified/UnifiedWorkspace.vue | tests/card-drafts-v075.test.ts；原型通用演示提示不代表真实业务；R1–R6 分别落实实际操作，不实现万能提示冒充业务。 |
| knowledge-map-false | MISSING_IN_PRODUCTION | R5 | data-map-id/knowledge-nav-select/outline-select；data-knowledge-view；fullMap；正式selectNode/outlineSelect/expandAll/toggleView；src/components/MindMapWorkspace.vue | tests/unified-knowledge-v075.test.ts；后续阶段 R5 根据差异实现/明确业务入口；当前不虚构 UI 交互。 |
| knowledge-outline-false | MISSING_IN_PRODUCTION | R5 | data-map-id/knowledge-nav-select/outline-select；data-knowledge-view；fullMap；正式selectNode/outlineSelect/expandAll/toggleView；src/components/MindMapWorkspace.vue | tests/unified-knowledge-v075.test.ts；后续阶段 R5 根据差异实现/明确业务入口；当前不虚构 UI 交互。 |
