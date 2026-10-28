# R4 — DONE（阶段内收尾）

恢复基线a7d75403335643046e17aa3289bf53cb981b4b03。启动修复c2f508674f412900ef21ea298983935ec27afd87及焦点修复e083c94452405a6666973d48cf223d44992ccbe5已保存并读回。最终检查点从本文件Git历史与远端独立读回解析。本轮仅R4，未进入R5。

## 本轮修复

- 测试app.exit绕过正式before-quit，合成库残留writer.lock；诊断拦截headless启动错误弹窗，确认MIGRATION_BUSY。native/visual改为正常app.close，并验证关闭后租约释放。仅恢复既有r2-seed-v2缓存一次，未生成新夹具；生产写入保护不改。
- CardDraftForm的label包裹富文本及工具按钮导致标签默认激活抢焦点；三个富文本外层改为带名称的字段组。原生回归保留“公式/表格/图片同时持久化”原断言，检查图片插入前编辑器确实拥有焦点；不改Crepe核心。
- 修复复盘830px被旧scoped960px覆盖、编辑头部/工具栏尺寸与分布、日期入口额外占行及编辑器浮动工具制造第二条文档滚动条。日期细项移至原型标题操作区，保留真实筛选。
- visual选择与原型一致的错题草稿状态，临时profile隔离旧renderer缓存；三宽采集与日期面板测试明确固定900px emulation。末次仅更新受影响页面截图，其余按源码不变继承。

## 验证

| 验证 | 结果/证据 |
| --- | --- |
| npm run build | PASS，最终生产源码；仅保留已有chunk体积提示 |
| node --experimental-strip-types tools/validation/r4/native.ts | PASS 3组，evidence/native.json；正式UI复制/预览确认、原生表格即时输入、LaTeX编辑、合成图片paste→真实IPC/解码/入库/发布；新Electron进程精确版本、引用、公式及表格读回 |
| node --experimental-strip-types tools/validation/r4/latest.ts | PASS 5组，evidence/latest.json；批量无效数量/取消无写/替换清答案/已发布保护；手动调度/草稿返回；关联取消及真实CAS冲突不覆盖/重开确认；确认切型仅改草稿/关闭刷新后精确重启；知识4→8条精确分页 |
| node --experimental-strip-types tools/validation/r4/visual.ts | PASS，evidence/visual.json、visual-verdict.json；3页×1500/1366/900九组，九张正式PNG及18份计算快照；模式/DPR/213目录/无横溢出/编辑器单内容滚动/原型几何及哈希检查 |
| R4_VISUAL_PAGES=editor / analytics / none | 增量恢复入口；只更新指定页面，none只补交互和对已有快照计算。最终日期面板在900px边界内，明确close且未改变范围。九图来源/哈希见visual-verdict.json |
| 继承领域57/57、编辑4组/复盘3组/分析5组 | 未无意义重跑；新补验覆盖本轮受影响字段、末次操作及知识分页。旧报告不冒充本轮重跑 |

图片合成事件与系统读取边界注入明确分开：原生编辑器事件、图片解码及资源服务为真实链路；Windows物理剪贴板NOT_RUN。直接删除端点当前为METHOD_RETIRED，断言确切代码及发布引用未变化；不把任意异常或该退役端点宣传为新增的“引用感知删除API”。图片维护继续通过正文引用及保存，未伪造集中资源管理能力。

## 视觉判断

阶段内PASS，不等于R7全应用逐像素或Windows验收。逐项差异见visual-verdict.json：

- 编辑器壳层三宽x/y/宽度与冻结原型相同，工具栏高度相同；头部+2px、标签+1px属微小差异。原生WYSIWYG/真实字段及选项排序、显式保存/手动调度使正文自然更高；未用固定高度或演示数字凑内容。
- 复盘最大宽度830px与原型相同。真实独立思路/保存状态令卡片高149–155.5px，内容滚动带来15px有效宽度与7.5px居中差；按真实卡片模式、会话进度及计时显示，不提供演示切型。新增高度承载已要求的业务字段。
- 分析保留1.35:1源布局/断点；真实知识分类、观察数/关联数替代虚假百分比，耗时及历史折叠保留，窄宽自然换行。网格起点+6–7px、高度+26.8–118.38px均有实际数据/控件原因；不把自评分标成掌握度。
- 审阅最终editor900/review1366/analytics900代表图，并核对九组计算/字体、PNG尺寸和哈希。未解释重大结构差异为空。微小像素与全应用跨页严格收敛保留R7，不宣称整软件完成。

## 边界和下一步

本轮不重跑R0–R3、57领域及未变复盘流程；不改Schema606、FSRS、卡片协议、迁移或正式发布机制。错误及测试定位历史在Git/evidence/startup-recovery.json、native-partial.json中保留，不上传原始调试端点日志、数据库缓存、依赖或旧截图。

R4阶段门槛通过，标DONE。Windows系统剪贴板、IME/物理拖拽、全应用/便携包验收仍NOT_RUN，属R7/R8。下一Work按阶段计划从R5恢复，本轮立即结束；不等待CI、不合并、不发布。
