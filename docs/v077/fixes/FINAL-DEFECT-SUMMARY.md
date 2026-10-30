# v0.7.7 F1–F3 最终缺陷状态 — 2026-10-30

三个授权检查点完成。三项确认BUG在正式Linux Electron、SQLite及重启链通过，均为 **FIXED_PENDING_WINDOWS**；Markdown错位在当前源码仍可自然复现，已定位、未修复。Schema606、版本、锁文件保持；不合并、不发布、不等CI、不继续第四检查点。

最终生产/回归测试SHA：`fcccda97c6cddc3fcbcfb65383995c12b694c0e0`。最终生产指纹：`17f676829abae98e51962d442505b5b5a9721d1a5379786f3fd36d1fb05652f4`。完整类型/构建PASS，456输出逐哈希封存。最终报告提交与该SHA的生产输入相同；最终GitHub完整SHA读取分支HEAD/本文件提交历史。精确本地SHA可从原始证据增量bundle恢复。

| 缺陷 | 最终结果与实际覆盖 | 首次生产保存SHA / 首次回归SHA |
| --- | --- | --- |
| ENV-05 | FIXED_PENDING_WINDOWS；600px四轮真实鼠标展开/收起，无拦截；600/900/1366导航/六卡片集页面/设置PASS | 4406cc95f3f4b1b6279b6248daf4dee66b4adc36 / 88d647d25651048fa44276944b1ca2ae4cc4be39 |
| CAT-03 | FIXED_PENDING_WINDOWS；空名称固定中文、纯空格拒绝、编辑/取消、合法恢复、重名、真正未知回执锁定及核对、无重复/关系损坏、新PID读回PASS | 4406cc95f3f4b1b6279b6248daf4dee66b4adc36 / 88d647d25651048fa44276944b1ca2ae4cc4be39 |
| FAULT-13 | FIXED_PENDING_WINDOWS；超长标题中文错误、保留编辑内容，无虚假已保存/错误写入；修正自动保存、新旧卡草稿、三新PID、显式发布追加不可变版本PASS | 0af1ec0c610b0666aa84431e22017f9f6d4f0f2f / e5d043da50e5adaa3ae3a5aea798788e1f2aa5c4 |
| EDITOR-10 / MD-02 | CONFIRMED_CURRENT_SOURCE_NOT_FIXED；两个CASE，一个共享列表选区BUG。前轮自然EDITOR-10 FAIL、MD-02 PASS；最终自然EDITOR-10 PASS、MD-02 FAIL。两编辑器受控复现、保存/SQLite/新PID均证实错位 | 最终测试fcccda97c6cddc3fcbcfb65383995c12b694c0e0；前轮测试完整SHA见F3报告 |

最后CAT-03空名称中文提示是F1原范围的补齐，因生产指纹变化已重建并同树复验三修复完整GUI链及Markdown，不沿用旧构建冒称最终通过。只改4个直接相关生产文件；F3没有修改Markdown实现。目录服务5/5、草稿相关34/34 PASS；Windows10/11实机及Windows CI本轮NOT_RUN。

Markdown根因已由锁定包源码和受控实验确认：列表NodeView mount捕获anchor/head，RAF在下一帧恢复旧绝对位置，未检查后续输入/选区变化。原回调使光标offset1→0，真实输入“列表条目”变成“表条目列”并入库。受控诊断PASS表示成功复现，不是产品CASE PASS。下一轮只通过公开列表NodeView插件替换点为延迟恢复加入代际/焦点/选区保护，保留原视觉和原生输入规则；不改node_modules/全局RAF/固定等待。本轮仅定位和记录。

最终250条权威账本：**209 PASS / 2 FAIL / 3 BLOCKED / 36 NOT_RUN**。两FAIL属于同一个Markdown BUG。三项原FAIL已转PASS；并发R1/R2的38PASS/2FAIL完整保留。并发R3旧树16PASS仍是独立证据，没有擅自晋升；历史B2也未批量晋升。严格promote刷新三修复PASS及自然Markdown FAIL；不关闭一次自然PASS的间歇性问题。所有Windows字段保持原值，未宣布250条验收通过。

并发处理：远端f01a3a6、4d23ec4、e4eb4ab、627b376的全部脚本、报告、TASK及证据回执保留。5份恢复文档头部冲突采用当前摘要+对方完整记录；账本逐CASE、缺陷逐字段合并。过期expected-SHA保存被拒后重新取HEAD合并，无强推或回滚。F1、F2已经分别独立核验远端保存；最终F3追加保存后结束。

主报告：F1-ENV-CAT-FIX.md、F2-FAULT13-FIX.md、F3-MARKDOWN-REVALIDATION.md；最终同树逐项回执 FINAL-REVALIDATION.json 优先于历史构建身份。原始ZIP、精确本地测试提交bundle、原始输入/SQLite/重启、必要截图及失败记录的持久回执见 EVIDENCE-ARCHIVE.json。GitHub不包含原始PNG、数据库、依赖或构建输出。
