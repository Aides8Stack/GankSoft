# W3 — 执行结果与交接

W3.1 DONE（领域/API）；W3.2 DONE；W3.3 IN_PROGRESS（收口与远端核验）。仅 W3，最多三个检查点，不执行 W4/W5。

基线：`dbf2b3560497a3015b0f4721eaf399f6228952ff`，Schema606，feature/v077。

新增唯一只读 `workspace.analytics.grouped`；原 analytics 模块内扩展，无新表/统计库/掌握算法/持久缓存。复用现有掌握度资格和 analyzeEvidence；当前周期证据批量读取，知识树 Set 合并按 cardId/eventId 去重。日期按 studyTimezone，当前 FSRS/到期和日期窗口分开。搜索/排序/分页、entityId 详情、7/30/90/all、direct/aggregate；完整日期趋势与全卡片集摘要不依赖分页和搜索。游标绑定 epoch/revision/filter/window。

领域/API `node --experimental-strip-types --test tests/w3-analytics-v077.test.ts`：5 PASS（W3-01/02/03/04/08 的领域部分）；105卡分页性能门槛5秒以内。初轮测试设施错误（practice 参数、SQL列数、日期期望和默认UTC）已更正，原日志留 validation-results；旧 deck-mastery-v076 测试因 W1 已禁止 practice:true，未计本轮产品失败，不改历史用例。

正式 Linux Electron W3-01～08 共8 PASS，0 renderer error；PID20→96独立重启、真实备份恢复epoch、三宽900/1366/1600交互与SQLite一致。W3.3正在保存身份及证据；本轮部分用例以同生产字节的分段续验完成，明确保留初始失败与脚本身份，不称一次全程通过。Windows CI/Win10/Win11/真实125%DPI 全 NOT_RUN。最终生产、测试脚本、文档 SHA 与证据在 W3.3 补记。

## W3.2 实现与局部修复

原学习分析页面改用单个批量查询，卡片/知识点维度、四种日期、搜索/排序/分页、完整日趋势、对象详情和卡片详情入口；保留窄图标栏和卡片集导航。概览显示模式数量、知识关联覆盖、已学习知识点和关联卡待复盘。所有读取沿用 dataSync / epoch / revision / 最新请求序号；失败清除旧统计，详情与分页同时失效。

删除图谱一级及Markdown面板两个返回按钮；挂载单选/标题同行、路径副行；局部高优先级宽度规则修复全局width:auto覆盖。仅为按钮删除后仍能由顶部导航离开，map.close使用Markdown现有关闭保护，忙碌/待确认写入不允许离开；保存/导入/导出逻辑不重写。

W3.1远端 `224c75049ef61d8ed45b86f81b2faf2a394a489d`，tree `5f60bfd0ca6fa690b52f5ce7037bfcfe0248ce2a` 与本地完整tree相同。普通push因无写凭据失败，连接器保留真实parent/base tree、逐个blob校验、expected_sha及force=false保存。W3.2生产/测试冻结提交待独立远端回执记录。
