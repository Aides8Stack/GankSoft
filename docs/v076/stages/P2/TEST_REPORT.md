# P2 测试

基线P1远端37680e99bbbb3dc5853e9cd9ecf07d07520b2420等树本地9cb71f9加P2工作树，Linux/Node24.22.1/Electron44.9.1。

- npm run build / npm run build:editor-spike：PASS exit0。初次移除overview分析分支后旧prop触发类型失败，移除无效比较后通过。
- node --experimental-strip-types --test tests/dashboard-v076.test.ts tests/unified-workspace-v075.test.ts：PASS 8/8 exit0（补测真实复盘次数/最近评分）。
- node --experimental-strip-types tools/validation/ui-v076.ts P2：PASS exit0，11场景，含此前首页两数据状态三宽，集概览1500/1366/900，列表分页全选→详情→返回保留选择。
- 旧workspace smoke扩展到新默认概览再进列表，保留全部原断言。发现首页最近记录与目录名称同词导致旧regex选择器歧义，改为目录region限定；新CSS复现全屏标题被显式display:flex覆盖，已恢复expanded隐藏页标题，原1366/720全窗断言PASS。整套17场景仍运行中，未将部分通过记为全套通过；待P3记录最终回执。
- Windows中文/Win10/11人工NOT_RUN。生成协议文档的新增默认字段将在P3统一导出，源契约已提交。
