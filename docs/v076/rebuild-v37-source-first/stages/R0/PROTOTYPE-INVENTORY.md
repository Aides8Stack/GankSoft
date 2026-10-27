# R0 原型源码索引（部分，IN_PROGRESS）

基线 8f61ab90678de88ee8e94d54d78978394431dac0；原型 SHA-256 `8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015`。`prototype-dom-css-inventory.json` 为正则索引：128 个函数声明、80 个静态 data-action、12 个 document 事件监听、29 个含媒体规则的行；它不能解析动态模板、证明 DOM 或交互覆盖。

原型 `state` 从 1295 行起；`render` 1459–1460 行根据页面模板替换 view 并同步 rail/subnav，1503 行开始事件委托。主要页面 overview 1336、deckHome 1340、cardsScreen 1345、cardDetailScreen 1356、filterScreen 1362、reviewScreen 1365、editorScreen 1374、knowledgeScreen 1385、analyticsScreen 1418、exchangeScreen 1419、scheduleScreen 1420、settingsScreen 1421、trashPane 1422、settingsBody 1428。知识图谱另有独立 knowledgeState/transfer 与窗口事件。弹窗/键盘/响应式逐项核查仍未完成。

下一步逐函数提取 DOM 层次、状态条件、事件及弹窗并对应 Vue/API/测试；审核动态 data 属性与媒体规则，不能用此索引替代人工审读。
