# R4 — IN_PROGRESS

基线 bc159d50f2048ad02ed30135c18b3b2178796d5a。正式Vue/typed IPC/Schema606；仅R4，不进入R5。

## 编辑器增量

- UnifiedCardEditor / CardDraftForm：冻结原型头部、工具栏、30%元数据列、模式选择、字段/选项/答案/底栏，原生Crepe及事务保护保留；公共材料移至来源后。局部editor.css提取冻结R4声明并适配真实编辑器。未改数据库/协议/FSRS。
- `npm run build` PASS。
- `node --experimental-strip-types tools/validation/r3/prepare-fixture.ts` PASS：仅恢复现有合成缓存，未重新生成。
- `node --experimental-strip-types tools/validation/r4/editor.ts` PASS 4组：三模式草稿不提前改发布内容、切型取消、发布新版本及新Electron进程精确读回。证据evidence/editor.json。
- 图片/表格/LaTeX专项与模式确认切换：NOT_RUN；三宽严格对照NOT_RUN；复盘/分析未迁移，整个R4不DONE。
- Windows/全量跨页留R7/R8。

当前文档检查点以Git历史/独立远端读回解析；不等待CI、不合并、不发布。

## 复盘/分析增量

- ReviewForm：冻结830px容器/进度/49px选项/答案及评分区；保留三模式、0.1步长、真实计时与异步保存/暂停守卫；可选错因/漏洞折叠。Workspace只显示未完成的复盘页签，单页隐藏页签，保留返回卡片列表。结果后显式下一张保留真实提交回执。
- Analytics：冻结四指标、1.35:1得分趋势/知识掌握双栏与历史行；按真实API保留分类状态、耗时折线、日期自定义、分页/折叠及详情。加载加请求代次保护，避免旧请求覆盖新范围。没有伪造掌握度百分比。
- `npm run build` PASS；`node --experimental-strip-types --test --test-concurrency=1 tests/card-draft-controller-v075.test.ts tests/card-drafts-v075.test.ts tests/unified-review-v075.test.ts tests/unified-analytics-catalog-v075.test.ts tests/editor-v075.test.ts` PASS 57/57。
- `node --experimental-strip-types tools/validation/r4/review.ts` PASS 3组，真实三模式复盘/错答9.0 Again/7.4 Hard/10.0 Easy、离页自动暂停/重启精确时间和思路/手动恢复、第二次重启事件及已完成会话读回。
- `node --experimental-strip-types tools/validation/r4/analytics.ts` PASS 5组，真实摘要/历史分页/耗时及记录折叠、知识点评估、详情/切集隔离和新进程空态。仅在原合成库加一个空集用于真实空态，不重新生成夹具。
- 测试首轮恢复按钮匹配完整标题失败：正式按钮截断16字，已用唯一标题前缀定位，原数据/流程断言保留。新用例PASS。无产品功能故障。
- 原生专项、三宽对照未完成，R4保持IN_PROGRESS。
