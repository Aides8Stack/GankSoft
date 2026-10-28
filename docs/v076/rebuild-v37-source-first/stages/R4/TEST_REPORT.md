# R4 补验检查点 — IN_PROGRESS

启动根因已核实并最小修复测试退出：app.exit跳过before-quit，留下合成库writer.lock，后续启动MIGRATION_BUSY，headless错误弹窗表现为SIGTRAP。仅改native.ts/visual.ts为正常app.close；实际正式启动及关闭租约检查已通过。复用现有缓存恢复一次，没有生成夹具或修改生产租约。

原生链路已执行到表格/LaTeX保存及图片入库/发布，重复测试暴露测试夹具带入旧mediaRefs、图片选区命中公式的脚本问题；已将纯文本粘贴预览明确清空旧引用，并在末段定位图片插入，保留全部持久化断言，完整复验待执行。直接删除API为METHOD_RETIRED，不能把任意拒绝当作引用感知删除验证，已改为断言确切代码并核对引用未变。末次功能/三宽尚未执行，本检查点不DONE。

证据evidence/startup-recovery.json；下一步native.ts→末次改动→visual.ts。当前远端检查点以Git历史和独立读回解析。

---

# R4 — IN_PROGRESS

基线bc159d50f2048ad02ed30135c18b3b2178796d5a；原分支/Draft PR15。编辑增量2bd038c48e297eefab19bceb595d5d7ffbcca17a、复盘/分析增量e410d546758119e25ef9f5ec0902a423611b4dcf均已独立读回。末次检查点SHA以Git历史和远端包含关系解析；不进入R5。

## 实现

- UnifiedCardEditor/CardDraftForm/editor.css：原型编辑外壳/17px标题/工具栏/30%元数据/三模式/原生字段、选项及答案/知识关联/来源/可选材料/粘性底栏。Crepe7.22.3、草稿/不可变发布和未知回执保护保留。末次补真实批量选项确认（每行一项，替换清空正确项，仅草稿）及手动调度入口，发布不自动弹窗。二者尚待正式Electron补验。
- UnifiedReviewForm/review.css/Workspace：830px容器、真实进度/计时/选项/答案/评分；错因漏洞折叠；仅显示未完成页签，单页隐藏；保留显式结果→下一张、离页自动暂停和手动恢复，不提供虚假的模式切换。
- UnifiedAnalytics/analytics.css：四指标、1.35:1趋势/知识双栏、真实历史行、耗时/日期及历史折叠，保留分页/详情/切集；请求代次防止旧范围覆盖新范围。末次知识读取从12改为4条/批，贴合原型四条信息结构，受影响用例已改但未复验。
- 未改Schema606、FSRS、内容协议、迁移、媒体实现、Milkdown核心或R0–R3业务。复用现有合成缓存，未生成新夹具。原型只定位R4函数与局部CSS；未重建R0索引。

## 证据及适用范围

| 命令/用例 | 结果 | 范围 |
| --- | --- | --- |
| npm run build | PASS | 末次工作树；chunk大小提示保留 |
| node --experimental-strip-types tools/validation/r4/editor.ts | PASS 4组 | 编辑增量：三模式草稿不提前改发布、切型取消/发布及新Electron进程读回。末次批量选项/调度入口NOT_RUN |
| node --experimental-strip-types tools/validation/r4/review.ts | PASS 3组 | 正式Vue→typed IPC→606：离页暂停/重启思路和精确暂停时间/手动恢复；三模式9.0错答Again、7.4Hard、10.0Easy；事件及完成会话再次重启读回，无重复题 |
| node --experimental-strip-types tools/validation/r4/analytics.ts | PASS 5组 | 前序增量：真实指标/分页/知识及卡片集评估/耗时历史折叠/详情/切集/新进程空集；末次4条知识分页NOT_RUN |
| 指定领域5文件 | PASS 57/57 | card-draft-controller-v075、card-drafts-v075、unified-review-v075、unified-analytics-catalog-v075、editor-v075，node --experimental-strip-types --test --test-concurrency=1 tests/<上述文件>.test.ts；含事务失败/未知回执/计时/版本和真实FSRS边界 |
| native.ts早期步骤 | PASS 局部 | 正式UI复制/剪贴板预览确认→原生表格和LaTeX显示→表格即时输入→IPC草稿保存。见native-partial.json；不等于完整原生回归通过 |
| native.ts最终图片链 | BLOCKED | 稳定headless配置、独立profile两次均在Electron启动SIGTRAP/socket hang up；修订后的图片事件/平台读取注入未执行 |
| visual.ts | BLOCKED | 仅一次必要采集启动同样失败；0张新截图，9组三宽断言和视觉审阅均NOT_RUN |
| Win10/11、系统图片剪贴板、IME/全应用 | NOT_RUN | 保留R7/R8职责 |

native早期脚本误用已不存在的clipboard.writeImage；查证现有clipboard.read及旧专项后，复用平台读取注入+合成paste事件，仍走真实Crepe→IPC→图片解码/资源/发布/重启及引用保护；绝不以注入冒充真实系统剪贴板。修订后尚未执行到页面。表格外层/内层两个table选择器歧义已改为native table.children；复盘标题截断定位已修正并PASS。均为测试适配，不归因产品缺陷。

## 视觉/业务差异及剩余

1. 三页声明/结构已源码级迁移，但尚无本阶段三宽对照证据，不能宣布视觉一致。源样式采用局部作用域，保留213px目录。字体已恢复既有NotoSansCJKsc资源；没有缺字截图冒充验收。
2. 原型mdBox替换为原生Crepe；选项保留上/下移，显式草稿保存按钮保留。批量替换确认、知识关联与手动调度的取消/返回保护仍需末次补验。原型集中图片资源管理入口没有现成独立管理UI，本轮没有假造可用入口，仍属待落实/明确适配项。
3. 复盘根据实际卡片决定模式；答案前保留独立思路，结果保存后显式下一张。原型演示计时/进度改为真实会话，不伪造数据。
4. 分析掌握度用真实分类/证据数，不使用原型百分比；自评分与掌握度分开。90天可用自定义日期，既有API只有7/30/all预设。历史/图表是实际已加载记录，缺失值不补零。
5. 未跑末次三模式确认切换、图片粘贴/发布/引用删除拒绝/重启、原生公式编辑持久化、批量输入/调度/关联及九组视觉，不标DONE。

## 恢复

保留原r2-seed-v2缓存；缓存缺失时使用已授权的r3/prepare-fixture.ts，不默认重建。先恢复稳定Electron，再按需运行native.ts、visual.ts，补上述受影响末次交互；必要时重跑editor.ts及analytics.ts的受影响路径，不重复R0–R3/57领域/无变化复盘证据。visual.ts复用R0的编辑/复盘原型PNG，仅采新生产9图及缺失的原型分析3图，截图采集成功仍需计算差异和人工审阅。

已保存源代码和未验收WIP、测试及脱敏失败摘要，不上传数据库缓存、依赖、构建、原始调试端点日志或旧截图。启动根因NOT_DETERMINED；限制重试并结束本轮。R4 IN_PROGRESS，不进入R5、不等CI、不合并、不发布。
