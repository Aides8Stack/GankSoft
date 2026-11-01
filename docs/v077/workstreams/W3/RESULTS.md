# W3 — 双维度学习统计与知识图谱 UI 结果

**W3.1 / W3.2 / W3.3 DONE（Linux Electron 定向验收）。W3-01～W3-08：8 PASS / 0 FAIL / 0 BLOCKED / 0 NOT_RUN。跨模块数据即时同步门槛：PASS。**

Windows CI、Windows 10、Windows 11、真实125%DPI：分别 **NOT_RUN**。Linux缺少中文字形，DOM/尺寸/交互通过，中文字体视觉签核NOT_RUN；原生文件选择只注入选择结果，真实文件读写/剪贴板/SQLite及备份恢复由生产链执行。未重跑W1/W2、B1–B5或旧250；不等CI、不合并、不发布、不执行W4/W5。

## 保存身份

| 身份 | 完整 SHA / tree |
|---|---|
| 起点 GitHub HEAD | `dbf2b3560497a3015b0f4721eaf399f6228952ff` |
| W3.1远端 | `224c75049ef61d8ed45b86f81b2faf2a394a489d` |
| W3.1完整tree | `5f60bfd0ca6fa690b52f5ce7037bfcfe0248ce2a` |
| 最终生产源码检查点 | `c96df443d84f9d678c69920c79a85a2e21fd1804` |
| GUI脚本检查点（独立记录） | `c96df443d84f9d678c69920c79a85a2e21fd1804` |
| 领域脚本检查点（独立记录） | `c96df443d84f9d678c69920c79a85a2e21fd1804` |
| 上述完整tree | `be8124f4b51f10c4eaf8b19fd4da35c593d139d2` |
| 最终文档提交 | 由本路径Git历史、feature/v077最新ref及Issues #34/#24最终回执解析；不虚构自身SHA |

普通push一次因缺写凭据失败；使用GitHub连接器逐文件创建、与本地Git blob逐项比较，以已核验parent/base tree追加，expected_sha、force=false更新ref。W3.1 tree与本地提交完全相同；W3.2 tree与冻结index完全相同（本地第二提交后仅修正补充领域夹具的同级position，远端源码检查点已包含修正）。最终再次独立fetch核对完整tree/全部变更blob。

**GUI实际执行时HEAD为本地W3.1 `6b1aefbcb48a217829fc484ff92a990e5d1fba41` 加工作树；不冒称在远端SHA检出后执行。** 所有生产输入逐字节哈希与冻结远端源码相同；[SOURCE-IDENTITY.json](./evidence/SOURCE-IDENTITY.json)同时记录Git blob、SHA256及证据大小。最终GUI按同生产字节分段续验，旧CASE未重复执行：01～06来自gui-main，07来自gui-markdown，08/独立PID来自gui-final。每份原报告保留当时scriptSha256和真实FAIL；final中的继承CASE均有productionByteIdentical断言。

## 正式实现

- 唯一新增只读协议 `workspace.analytics.grouped`；在原workspace analytics模块内扩展，无新表/IPC通道/统计库/掌握算法/持久业务缓存。支持card/knowledge、7/30/90/all/custom、direct/aggregate、搜索/排序/版本分页和entityId详情。
- 历史按当前studyTimezone日期窗口读真实事件；当前FSRS、到期、暂停及掌握度使用最新数据库，不随历史范围截断。无评分/无客观结果用null，UI显示「—」；未学习卡为pending，不生成虚假成绩。卡片类型、次数、最近/平均自评、正确率分母、有效用时、当前FSRS/下次复习和掌握状态均可读。
- 当前周期证据一次批量读取并复用原资格转换与analyzeEvidence；知识点关联批量读取，保留StoredCardLinks身份校验。子树Set按cardId去重，事件来自唯一卡片集合；跨节点可重叠，摘要独立按全卡片集去重。排序/搜索/分页不截断完整区间每日趋势或总摘要。每页一个分组IPC，105卡完整分页未逐节点调用mastery IPC。
- 原学习分析主页面提供双维、日期、摘要、每日评分/用时趋势、搜索/排序/分页、对象详情及卡片详情入口。概览增加模式数量、知识关联覆盖、已学习知识点与关联卡待复盘摘要。保留原窄栏和卡片集导航，不新增主导航。
- 所有统计沿用W1 dataSync、epoch/revision、最新请求序号和useDataRefresh；刷新清除详情/旧行/旧游标；分页修订变化返回第一页。错误明确提示，清空过期统计；迟到旧响应不覆盖新数据。概览两路读取仍由dataSync.batch核对同版本。
- 图谱主页面及内部Markdown面板两个返回按钮删除；radio与标题同行、路径副行。真实900px暴露全局width:auto覆盖，已用局部规则修复，900/1366/1600 textarea宽度分别319.28/522.39/644.95px，均与父面板可用宽度一致。
- 删除返回按钮后原map.save守卫阻止顶部导航离开，已最小修复map.close调用Markdown既有关闭保护；空闲可切页，忙碌/未知导入回执/待刷新写入继续受保护。Markdown导入导出、范围选择、正文和图片逻辑未重写。

## 实际验收

| CASE | 状态 | 证据与断言 |
|---|---|---|
| W3-01 | PASS | 新鲜Schema606混合类型/0事件、均值65、客观2次正确1次、未学pending、FSRS与独立SQL相符；GUI105卡零事件/缺分母「—」 |
| W3-02 | PASS | 7/30/90/all边界、上海跨日、自定义日期；切换全部四种范围，当前待复盘保持一致 |
| W3-03 | PASS | 同卡父子/兄弟多重关联，aggregate父2卡/direct父1卡，既有mastery相同；移动/删除后聚合更新，整体事件总量不变；GUI详情真实去重 |
| W3-04 | PASS | 105卡、11知识点；排序/搜索/总数/完整分页无重复，5个续页=5次grouped IPC，0逐节点mastery；六页查询领域性能门槛<5秒 |
| W3-05 | PASS | GUI评分保存→概览→分析双维与SQL一致；GUI清空并保存关联后父点事件1→0、卡数2→1；GUI单卡策略14天保存后刷新，原排期按合同保留 |
| W3-06 | PASS | 900/1366/1600真实窗口和点击；两个按钮不存在，单选/标题同排、路径副行、输入框填满；顶部导航能离开Markdown |
| W3-07 | PASS | 粘贴选标题→预览确认→实际落库；范围全选导出→复制/文件字节一致→文件导入正文及图片预览；真实跟踪图片以内嵌Base64往返；新节点立即显示 |
| W3-08 | PASS | grouped旧回包跨GUI提交延迟释放、新结果保留；读取失败旧摘要清除/可重读；cursor/期望epoch与revision拒绝过期；实际完整备份恢复epoch更新后双维SQL一致；独立PID20→96重启读回一致 |

[gui-main.json](./evidence/gui-main.json)、[gui-markdown.json](./evidence/gui-markdown.json)、[gui-final.json](./evidence/gui-final.json)是原始分段报告。最后一轮0 renderer error；SQLite integrity_check=ok、外键0错误、user_version606。辅助API客户端恢复后需要app.capabilities重新握手，初次漏握手失败原样保留，不归因为生产页面失败。

命令：`node --experimental-strip-types tools/validation/v077/w3-analytics.mjs`（新鲜完整流程）；续验使用W3_RESUME_REPORT指定前序报告、断言全部生产字节相同，禁止将不同源码报告拼接。实际续验入口及报告路径保存在日志和script；不是一次性全绿运行。

- 最终领域/API：`node --experimental-strip-types --test tests/w3-analytics-v077.test.ts`，5 PASS，含最后新增移动/删除补验（夹具position规则初错后修正，日志保留）。
- Markdown图片最小交界：`node --experimental-strip-types --test tests/w3-analytics-v077.test.ts tests/knowledge-markdown-media-v075.test.ts`，11 PASS（5领域+6媒体；早于只增加移动/删除断言的最终领域脚本）。
- `npm run check:protocol`：21 PASS、边界/协议类型/165方法导出PASS。`npm run build`、Vue/后端类型PASS；width/nav局部修正后Vue与renderer必要增量PASS。完整生成契约较大，保存API索引和[W3契约覆盖](./evidence/contract-grouped.json)，`npm run protocol:export`可重建完整快照，运行时registry为权威。
- [attempts.log](./evidence/attempts.log)保留失败：旧practice:true历史用例不适用W1新合同；测试SQL列数/默认时区/边界期望/缺失标题勾选/辅助客户端握手/树position等设施错误；实际width和导航阻断经局部修复后通过。未删除业务断言或降低数据库保护。

## 下一轮恢复

本轮三个检查点结束。**W4仍NOT_STARTED**，唯一入口 `docs/v077/workstreams/W4/README.md`，按README→DESIGN→IMPLEMENTATION→TEST-PLAN读取；先核实feature/v077最新GitHub HEAD及本报告，直接复用W1/W2/W3，不重新执行B1–B5/旧250。须后续用户授权后才执行W4；本轮不开始AI ZIP/Prompt或W5导入/执行。
