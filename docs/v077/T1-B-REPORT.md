# GankSoft v0.7.7 — T1-B 模块功能测试与问题收集

**T1-B DONE（本轮收集结束，不等于全部功能通过）。** 指定9条全部真实执行：8 PASS /1 FAIL /0 BLOCKED /0 NOT_RUN。模块命令另选中扩展KNOW-12，尚未实现，记NOT_RUN；因此合计选择10条：8 PASS /1 FAIL /0 BLOCKED /1 NOT_RUN。只改测试/夹具/文档，没有改生产业务、Schema、依赖、构建输入或发布流程。

## 模块与逐CASE结果

| 模块 | CASE | 结果 | 说明 |
| --- | --- | --- | --- |
| analytics | AN-01 | PASS | GUI完成新卡真实复盘，次数/评分与学习事件核对；新PID读回 |
| analytics | AN-06 | PASS | GUI展开/收起历史，列表与统计不变；新PID读回 |
| analytics | AN-07 | PASS | 无记录卡片集显示0次、未记录评分/正确率、明确空态 |
| knowledge | KNOW-02 | PASS | GUI新建并保存根知识点，ID/层级/名称离开与重启保持 |
| knowledge | KNOW-11 | PASS | GUI多知识点关联、真实复盘、双向查询/图谱统计去重、新PID验证 |
| knowledge | MD-01 | PASS | GUI编辑多段正文、Ctrl+S清晰保存态、重启后精确正文/修订 |
| knowledge | MD-07 | PASS | GUI导入预览后取消，整库/媒体只读快照在取消及重启后不变 |
| media | MEDIA-01 | PASS | 原生合成PNG剪贴板+真实Ctrl+V，资源库、草稿重开、新PID图片/引用/哈希验证 |
| media | MEDIA-03 | FAIL | 两位置期望30/80，实际UI和草稿读回80/80；稳定复现2次 |
| knowledge扩展 | KNOW-12 | NOT_RUN | 子树删除恢复无本轮脚本，留后续，不是PASS |

analytics：3/0/0/0；knowledge+Markdown：4/0/0/1；media：1/1/0/0（顺序PASS/FAIL/BLOCKED/NOT_RUN）。knowledge首次模块命令退出2，包含未实现项，未将它解释为模块全通过；框架自检PASS不计入9条业务结果。

## 新发现问题与数据风险

**AUTO-MEDIA-03-a28b76820cf6 / MEDIA-03 / P1（待I3复核）。**

最短操作：编辑卡片正文→Ctrl+V插入合成4×4 PNG→“正文图片管理/重新插入图片”→图片1宽度30并Tab→图片2宽度80并Tab→保存草稿。期望两个位置独立；实际两输入均80，draft.get中assetId相同、placementId不同的两条记录width也均80。两次全新隔离夹具复现，生产根因留空，未修改生产代码。

失败后停止该链，没有把后续资源库/关闭重启步骤算通过；MEDIA-01的独立成功不能替代MEDIA-03。已观察到布局元数据覆盖，未观察到正文/图片丢失，未执行删除。原始failure.png、failure-ui.txt、diagnostics.json、case.json与只读数据库快照保存在各run；Git永久保存脱敏摘要、真实SHA、文件大小和SHA-256，原始截图/SQLite不提交Git。见[T1-B-RESULTS.json](./evidence/T1-B-RESULTS.json)。

T1-A已有AUTO-NEW-16-e0ee13132997原样继承、未重复建立或修复。当前实测待修2项（NEW-16提示、MEDIA-03宽度）；另4项原Windows/用户报告仍待复现。合计6条未关闭观察记录，不声称已确认6个独立根因。测试基础设施FIXED项不计生产BUG。

## 测试工具问题与有效补验

- AN-01注册后，3处旧框架断言仍假设它未实现。改用真正未映射AN-08验证拒绝晋升/NOT_RUN；组选择按真实注册表断言，并保留BACK无映射拒绝检查。旧失败自检曾产生一条人工proof，已与Git基线逐CASE比较并仅恢复该AN-01污染，不作为业务证据；新增finally恢复原账本，避免以后失败自检污染。正式结果由准确SHA下的真实GUI报告重新产生，并通过promote.mjs审阅晋升。
- KNOW-11首跑脚本漏算夹具原有根节点关联卡，实际正确统计2被误断言为1。改为枚举只读cardLinks计算准确期望，仍核对所有卡/去重/历史快照和新PID，补验PASS，独立记录TEST_INFRA/FIXED，不冒称生产修复。
- MEDIA-03仅新增非修改性UI输入值/持久化placement诊断，保持30/80真实操作与断言强度，再次失败。没有延迟保存、修改业务或削弱宽度断言。

## 精确来源与环境复用

恢复基线：`4aa8cb933c7edb9aab07d950d332085ddddc4a3a`。脚本先保存GitHub再执行，未重跑T1-A。

- 首批被测SHA：`d2c0cb67d36dae3def2fd28922df402b0b71bd02`，三个模块分别产生独立summary。
- 仅受影响KNOW-11/MEDIA-03补验SHA：`7389b5ac034179649aba091a373d8772b5df8d46`。
- 两SHA全部生产输入与恢复基线一致，仅测试/文档不同；最终文档提交不是全量重跑SHA。每条来源、新PID、反馈轨迹及证据hash见机器记录。

Linux x64 / Node24.22.1 / Electron44.9.1 / 隔离Schema606。status确认依赖REUSE、410构建输出有效，builtFromSha为0d0c072117dfed45f6463789fb289e2153a18409；相同输入直接复用。**本轮没有运行prepare、npm ci、npm run build，也未下载Artifact**。框架最终12/12，映射审计仍12模块/20组/250CASE；环境/框架PASS不算业务PASS。图片仅为本轮合成PNG，不访问个人文件。

结果账本通过既有promote.mjs按真实summary及精确HEAD更新，收集器先dry-run审查脱敏预览再write；MEDIA-03第二次观察合并到原ID。unitApi/WindowsCI/Win10Real/Win11Real均无新晋升，Windows原报告未关闭。唯一账本当前25 PASS /2 FAIL /223 NOT_RUN。

## 下一入口

下一阶段 **T1-C / GPT-6.1 Sol · Medium**，按模块继续exchange、settings、storage、reliability及未覆盖基本路径；KNOW-12明确未实现，按后续授权补测。只读RECOVERY-NEXT.md、本报告结尾、目标模块文档和必要GUI驱动。复用有效环境，不重读250清单/历史，不重复已通过项。T1/T2先收集，I3归类后F4才修生产。

本轮保存并独立核实远端SHA、文件树和报告后结束；不等CI、不进入T1-C、不合并发布。文档检查点从远端HEAD解析，不反复提交自引用SHA。
