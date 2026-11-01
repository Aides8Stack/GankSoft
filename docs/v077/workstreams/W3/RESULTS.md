# W3 — 执行结果与交接

W3.1 DONE（领域/API）；W3.2 IN_PROGRESS；W3.3 NOT_STARTED。仅 W3，最多三个检查点，不执行 W4/W5。

基线：`dbf2b3560497a3015b0f4721eaf399f6228952ff`，Schema606，feature/v077。

新增唯一只读 `workspace.analytics.grouped`；原 analytics 模块内扩展，无新表/统计库/掌握算法/持久缓存。复用现有掌握度资格和 analyzeEvidence；当前周期证据批量读取，知识树 Set 合并按 cardId/eventId 去重。日期按 studyTimezone，当前 FSRS/到期和日期窗口分开。搜索/排序/分页、entityId 详情、7/30/90/all、direct/aggregate；完整日期趋势与全卡片集摘要不依赖分页和搜索。游标绑定 epoch/revision/filter/window。

领域/API `node --experimental-strip-types --test tests/w3-analytics-v077.test.ts`：5 PASS（W3-01/02/03/04/08 的领域部分）；105卡分页性能门槛5秒以内。初轮测试设施错误（practice 参数、SQL列数、日期期望和默认UTC）已更正，原日志留 validation-results；旧 deck-mastery-v076 测试因 W1 已禁止 practice:true，未计本轮产品失败，不改历史用例。

正式 GUI W3-01～08 当前 NOT_RUN，不将领域测试冒充 GUI 验收。Windows CI/Win10/Win11/真实125%DPI 全 NOT_RUN。最终生产、测试脚本、文档 SHA 与证据在 W3.3 补记。
